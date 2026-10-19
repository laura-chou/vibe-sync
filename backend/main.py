from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import random
import json
import uuid
from typing import Dict, Any, Optional

app = FastAPI(title="WebSocket Game Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory data store
# rooms = {
#     "839210": {
#         "code": "839210",
#         "host_id": "player_id",
#         "status": "waiting" | "playing",
#         "target_user_id": Optional[str],
#         "question_index": int,
#         "players": {
#             "player_id": {
#                 "id": str,
#                 "name": str,
#                 "is_host": bool,
#                 "avatar": str,
#                 "websocket": WebSocket
#             }
#         },
#         "answers": {
#             "player_id": "choice"
#         }
#     }
# }
rooms: Dict[str, Dict[str, Any]] = {}

def generate_room_code() -> str:
    """Generate a unique 6-digit random room code."""
    while True:
        code = f"{random.randint(100000, 999999)}"
        if code not in rooms:
            return code

def get_room_state(room_code: str) -> Optional[Dict[str, Any]]:
    """Return serializable room state without websocket objects."""
    if room_code not in rooms:
        return None
    room = rooms[room_code]
    players_list = []
    for p_id, p_info in room["players"].items():
        players_list.append({
            "id": p_info["id"],
            "name": p_info["name"],
            "is_host": p_info["is_host"],
            "avatar": p_info["avatar"]
        })
    return {
        "code": room["code"],
        "host_id": room["host_id"],
        "status": room["status"],
        "target_user_id": room["target_user_id"],
        "question_index": room["question_index"],
        "players": players_list,
        "answers": room["answers"]
    }

async def broadcast_to_room(room_code: str, message: Dict[str, Any]):
    """Broadcast JSON message to all connected websockets in the room."""
    if room_code not in rooms:
        return
    room = rooms[room_code]
    for p_id, p_info in list(room["players"].items()):
        ws: WebSocket = p_info["websocket"]
        try:
            await ws.send_text(json.dumps(message))
        except Exception:
            pass

@app.get("/")
def read_root():
    return {"status": "ok", "message": "WebSocket Game Backend API"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    current_player_id: Optional[str] = None
    current_room_code: Optional[str] = None

    try:
        while True:
            raw_data = await websocket.receive_text()
            try:
                data = json.loads(raw_data)
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({"type": "ERROR", "message": "Invalid JSON format."}))
                continue

            event_type = data.get("type")

            # EVENT: CREATE_ROOM
            if event_type == "CREATE_ROOM":
                player_name = data.get("player_name", "房主玩家")
                avatar = data.get("avatar", "👑")
                player_id = str(uuid.uuid4())[:8]

                room_code = generate_room_code()
                rooms[room_code] = {
                    "code": room_code,
                    "host_id": player_id,
                    "status": "waiting",
                    "target_user_id": None,
                    "question_index": 0,
                    "players": {
                        player_id: {
                            "id": player_id,
                            "name": player_name,
                            "is_host": True,
                            "avatar": avatar,
                            "websocket": websocket
                        }
                    },
                    "answers": {}
                }

                current_player_id = player_id
                current_room_code = room_code

                # Send success response to creator
                await websocket.send_text(json.dumps({
                    "type": "ROOM_CREATED",
                    "room_code": room_code,
                    "player_id": player_id,
                    "room_state": get_room_state(room_code)
                }))

            # EVENT: JOIN_ROOM
            elif event_type == "JOIN_ROOM":
                room_code = str(data.get("room_code", "")).strip()
                player_name = data.get("player_name", "玩家")
                avatar = data.get("avatar", "🦊")

                if room_code not in rooms:
                    await websocket.send_text(json.dumps({
                        "type": "ERROR",
                        "message": f"房間 {room_code} 不存在"
                    }))
                    continue

                room = rooms[room_code]
                player_id = str(uuid.uuid4())[:8]

                room["players"][player_id] = {
                    "id": player_id,
                    "name": player_name,
                    "is_host": False,
                    "avatar": avatar,
                    "websocket": websocket
                }

                current_player_id = player_id
                current_room_code = room_code

                await websocket.send_text(json.dumps({
                    "type": "ROOM_JOINED",
                    "room_code": room_code,
                    "player_id": player_id,
                    "room_state": get_room_state(room_code)
                }))

                # Broadcast to other players in room
                await broadcast_to_room(room_code, {
                    "type": "PLAYER_JOINED",
                    "player_id": player_id,
                    "player_name": player_name,
                    "room_state": get_room_state(room_code)
                })

            # EVENT: SELECT_TARGET
            elif event_type == "SELECT_TARGET":
                if not current_room_code or current_room_code not in rooms:
                    await websocket.send_text(json.dumps({"type": "ERROR", "message": "未處於有效房間中"}))
                    continue

                room = rooms[current_room_code]
                if room["host_id"] != current_player_id:
                    await websocket.send_text(json.dumps({"type": "ERROR", "message": "僅房主可指定目標人物"}))
                    continue

                target_id = data.get("target_user_id")
                if target_id and target_id not in room["players"]:
                    await websocket.send_text(json.dumps({"type": "ERROR", "message": "該目標人物不在房間內"}))
                    continue

                room["target_user_id"] = target_id
                await broadcast_to_room(current_room_code, {
                    "type": "TARGET_SELECTED",
                    "target_user_id": target_id,
                    "room_state": get_room_state(current_room_code)
                })

            # EVENT: START_GAME
            elif event_type == "START_GAME":
                if not current_room_code or current_room_code not in rooms:
                    await websocket.send_text(json.dumps({"type": "ERROR", "message": "未處於有效房間中"}))
                    continue

                room = rooms[current_room_code]
                if room["host_id"] != current_player_id:
                    await websocket.send_text(json.dumps({"type": "ERROR", "message": "僅房主可開始遊戲"}))
                    continue

                if not room["target_user_id"]:
                    await websocket.send_text(json.dumps({"type": "ERROR", "message": "請先指定目標人物再開始遊戲"}))
                    continue

                room["status"] = "playing"
                room["question_index"] = 0
                room["answers"] = {}

                await broadcast_to_room(current_room_code, {
                    "type": "GAME_STARTED",
                    "room_state": get_room_state(current_room_code)
                })

            # EVENT: SUBMIT_ANSWER
            elif event_type == "SUBMIT_ANSWER":
                if not current_room_code or current_room_code not in rooms:
                    await websocket.send_text(json.dumps({"type": "ERROR", "message": "未處於有效房間中"}))
                    continue

                room = rooms[current_room_code]
                if room["status"] != "playing":
                    await websocket.send_text(json.dumps({"type": "ERROR", "message": "遊戲尚未開始，無法提交答案"}))
                    continue

                choice = data.get("choice") # e.g. "A" or "B"
                if choice not in ["A", "B"]:
                    await websocket.send_text(json.dumps({"type": "ERROR", "message": "答案選項格式不符 (需為 A 或 B)"}))
                    continue

                room["answers"][current_player_id] = choice

                await broadcast_to_room(current_room_code, {
                    "type": "ANSWER_SUBMITTED",
                    "player_id": current_player_id,
                    "choice": choice,
                    "room_state": get_room_state(current_room_code)
                })

            else:
                await websocket.send_text(json.dumps({"type": "ERROR", "message": f"未知的事件類型: {event_type}"}))

    except WebSocketDisconnect:
        if current_room_code and current_room_code in rooms:
            room = rooms[current_room_code]
            if current_player_id in room["players"]:
                leaving_player_name = room["players"][current_player_id]["name"]
                del room["players"][current_player_id]

                # If host left, assign new host or delete room if empty
                if len(room["players"]) == 0:
                    del rooms[current_room_code]
                else:
                    if room["host_id"] == current_player_id:
                        new_host_id = next(iter(room["players"]))
                        room["host_id"] = new_host_id
                        room["players"][new_host_id]["is_host"] = True

                    if room["target_user_id"] == current_player_id:
                        room["target_user_id"] = None

                    await broadcast_to_room(current_room_code, {
                        "type": "PLAYER_LEFT",
                        "player_id": current_player_id,
                        "player_name": leaving_player_name,
                        "room_state": get_room_state(current_room_code)
                    })
