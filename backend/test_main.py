import pytest
import json
from fastapi.testclient import TestClient
from backend.main import app, generate_room_code, rooms

@pytest.fixture(autouse=True)
def clear_rooms():
    rooms.clear()
    yield
    rooms.clear()

def test_generate_room_code():
    code = generate_room_code()
    assert len(code) == 6
    assert code.isdigit()

def test_read_root():
    client = TestClient(app)
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "message": "WebSocket Game Backend API"}

def test_websocket_create_room():
    client = TestClient(app)
    with client.websocket_connect("/ws") as websocket:
        websocket.send_json({
            "type": "CREATE_ROOM",
            "player_name": "房主 Alice",
            "avatar": "👑"
        })
        data = websocket.receive_json()
        assert data["type"] == "ROOM_CREATED"
        room_code = data["room_code"]
        assert len(room_code) == 6
        assert room_code in rooms
        assert rooms[room_code]["status"] == "waiting"

def test_websocket_join_room():
    client = TestClient(app)

    # 1. Host creates room
    with client.websocket_connect("/ws") as host_ws:
        host_ws.send_json({
            "type": "CREATE_ROOM",
            "player_name": "房主 Alice"
        })
        host_res = host_ws.receive_json()
        room_code = host_res["room_code"]

        # 2. Player joins room
        with client.websocket_connect("/ws") as player_ws:
            player_ws.send_json({
                "type": "JOIN_ROOM",
                "room_code": room_code,
                "player_name": "玩家 Bob"
            })
            player_res = player_ws.receive_json()
            assert player_res["type"] == "ROOM_JOINED"
            assert player_res["room_code"] == room_code

            # Host should receive PLAYER_JOINED broadcast
            broadcast_msg = host_ws.receive_json()
            assert broadcast_msg["type"] == "PLAYER_JOINED"
            assert len(broadcast_msg["room_state"]["players"]) == 2

def test_websocket_full_game_flow():
    client = TestClient(app)

    with client.websocket_connect("/ws") as host_ws, client.websocket_connect("/ws") as player_ws:
        # Step 1: Create room
        host_ws.send_json({"type": "CREATE_ROOM", "player_name": "Host"})
        host_created = host_ws.receive_json()
        room_code = host_created["room_code"]
        host_id = host_created["player_id"]

        # Step 2: Join room
        player_ws.send_json({"type": "JOIN_ROOM", "room_code": room_code, "player_name": "Bob"})

        # When player joins, broadcast PLAYER_JOINED is sent to everyone in room.
        # So player_ws receives ROOM_JOINED first, then PLAYER_JOINED broadcast.
        player_joined = player_ws.receive_json() # ROOM_JOINED
        player_id = player_joined["player_id"]

        _player_joined_broadcast = player_ws.receive_json() # PLAYER_JOINED
        _host_joined_broadcast = host_ws.receive_json()     # PLAYER_JOINED

        # Step 3: Select target user (Host only)
        # Attempt select by player -> should fail
        player_ws.send_json({"type": "SELECT_TARGET", "target_user_id": player_id})
        err_res = player_ws.receive_json()
        assert err_res["type"] == "ERROR"

        # Select by host -> should succeed
        host_ws.send_json({"type": "SELECT_TARGET", "target_user_id": player_id})
        target_broadcast_host = host_ws.receive_json()
        target_broadcast_player = player_ws.receive_json()
        assert target_broadcast_host["type"] == "TARGET_SELECTED"
        assert target_broadcast_host["target_user_id"] == player_id

        # Step 4: Start game
        host_ws.send_json({"type": "START_GAME"})
        start_host = host_ws.receive_json()
        start_player = player_ws.receive_json()
        assert start_host["type"] == "GAME_STARTED"
        assert start_host["room_state"]["status"] == "playing"

        # Step 5: Submit answers
        player_ws.send_json({"type": "SUBMIT_ANSWER", "choice": "A"})
        ans_player_ws = player_ws.receive_json()
        ans_host_ws = host_ws.receive_json()
        assert ans_player_ws["type"] == "ANSWER_SUBMITTED"
        assert ans_player_ws["choice"] == "A"
        assert ans_player_ws["room_state"]["answers"][player_id] == "A"
