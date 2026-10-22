from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import random
import json
import uuid
import pathlib
import asyncio
from typing import Dict, Any, Optional, List

app = FastAPI(title="WebSocket Game Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load questions from questions.json
QUESTIONS_FILE = pathlib.Path(__file__).parent / "questions.json"
def load_questions() -> List[Dict[str, Any]]:
    if QUESTIONS_FILE.exists():
        with open(QUESTIONS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return [
        {
            "id": 1,
            "text": "{target_name} 最喜歡吃哪種宵夜？",
            "option_a": "炸雞與波霸奶茶",
            "option_b": "健康水果與優格"
        }
    ]

questions_db = load_questions()

# In-memory data store
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
            "avatar": p_info["avatar"],
            "score": room["scores"].get(p_id, 0)
        })

    current_q = None
    if room["status"] in ["playing", "question_result"] and room["questions"]:
        idx = room["question_index"]
        if idx < len(room["questions"]):
            raw_q = room["questions"][idx]
            target_p = room["players"].get(room["target_user_id"], {})
            target_name = target_p.get("name", "目標人物")
            current_q = {
                "id": raw_q["id"],
                "text": raw_q["text"].replace("{target_name}", target_name),
                "option_a": raw_q["option_a"],
                "option_b": raw_q["option_b"],
                "option_c": raw_q.get("option_c"),
                "total_questions": len(room["questions"]),
                "current_index": idx + 1
            }

    return {
        "code": room["code"],
        "host_id": room["host_id"],
        "status": room["status"],
        "relationship": room.get("relationship", "friends"),
        "target_user_id": room["target_user_id"],
        "question_index": room["question_index"],
        "current_question": current_q,
        "players": players_list,
        "answers": room["answers"],
        "scores": room["scores"]
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

async def evaluate_and_advance_question(room_code: str):
    """Evaluate current question answers when all connected players answered."""
    if room_code not in rooms:
        return
    room = rooms[room_code]
    target_id = room["target_user_id"]
    target_answer = room["answers"].get(target_id)

    # Determine correct answer from target user's choice
    correct_choice = target_answer

    results = []
    for p_id in room["players"]:
        p_ans = room["answers"].get(p_id)
        is_target = (p_id == target_id)
        is_correct = (p_ans == correct_choice) if (correct_choice and not is_target) else False

        # Target user provides standard answers, so they do not accumulate guessing scores
        if is_correct and not is_target:
            room["scores"][p_id] = room["scores"].get(p_id, 0) + 1

        results.append({
            "player_id": p_id,
            "player_name": room["players"][p_id]["name"],
            "answer": p_ans,
            "is_correct": is_correct,
            "is_target": is_target
        })

    room["status"] = "question_result"

    # Broadcast single question result
    await broadcast_to_room(room_code, {
        "type": "QUESTION_RESULT",
        "correct_choice": correct_choice,
        "target_user_id": target_id,
        "target_user_name": room["players"].get(target_id, {}).get("name", "目標人物"),
        "results": results,
        "room_state": get_room_state(room_code)
    })

    # Wait 3.5 seconds so players can comfortably view the round result
    await asyncio.sleep(3.5)

    if room_code not in rooms:
        return

    # Advance to next question or end game
    room["question_index"] += 1
    room["answers"] = {}

    if room["question_index"] >= len(room["questions"]):
        # Game Over
        room["status"] = "game_over"

        # Build leaderboard excluding target user from rank score sorting
        guessers = []
        target_item = None

        for p_id, p_info in room["players"].items():
            item = {
                "player_id": p_id,
                "name": p_info["name"],
                "avatar": p_info["avatar"],
                "score": room["scores"].get(p_id, 0),
                "is_target": (p_id == target_id)
            }
            if p_id == target_id:
                target_item = item
            else:
                guessers.append(item)

        guessers_sorted = sorted(guessers, key=lambda x: x["score"], reverse=True)
        leaderboard = ([target_item] if target_item else []) + guessers_sorted

        await broadcast_to_room(room_code, {
            "type": "GAME_OVER",
            "leaderboard": leaderboard,
            "room_state": get_room_state(room_code)
        })
    else:
        # Next Question
        room["status"] = "playing"
        await broadcast_to_room(room_code, {
            "type": "QUESTION_START",
            "room_state": get_room_state(room_code)
        })

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
                relationship = data.get("relationship", "friends")
                if relationship not in ["friends", "new_friends", "family"]:
                    relationship = "friends"

                player_id = str(uuid.uuid4())[:8]

                requested_code = str(data.get("room_code", "")).strip()
                room_code = requested_code if requested_code else generate_room_code()

                rooms[room_code] = {
                    "code": room_code,
                    "host_id": player_id,
                    "status": "waiting",
                    "relationship": relationship,
                    "target_user_id": None,
                    "question_index": 0,
                    "questions": [],
                    "players": {
                        player_id: {
                            "id": player_id,
                            "name": player_name,
                            "is_host": True,
                            "avatar": avatar,
                            "websocket": websocket
                        }
                    },
                    "answers": {},
                    "scores": {player_id: 0}
                }

                current_player_id = player_id
                current_room_code = room_code

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
                if len(room["players"]) >= 10:
                    await websocket.send_text(json.dumps({
                        "type": "ERROR",
                        "message": "房間人數已達 10 人上限"
                    }))
                    continue

                player_id = str(uuid.uuid4())[:8]

                room["players"][player_id] = {
                    "id": player_id,
                    "name": player_name,
                    "is_host": False,
                    "avatar": avatar,
                    "websocket": websocket
                }
                room["scores"][player_id] = 0

                current_player_id = player_id
                current_room_code = room_code

                await websocket.send_text(json.dumps({
                    "type": "ROOM_JOINED",
                    "room_code": room_code,
                    "player_id": player_id,
                    "room_state": get_room_state(room_code)
                }))

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

            # EVENT: UPDATE_RELATIONSHIP
            elif event_type == "UPDATE_RELATIONSHIP":
                if not current_room_code or current_room_code not in rooms:
                    await websocket.send_text(json.dumps({"type": "ERROR", "message": "未處於有效房間中"}))
                    continue

                room = rooms[current_room_code]
                if room["host_id"] != current_player_id:
                    await websocket.send_text(json.dumps({"type": "ERROR", "message": "僅房主可切換關係類型"}))
                    continue

                rel = data.get("relationship", "friends")
                if rel not in ["friends", "new_friends", "family"]:
                    rel = "friends"

                room["relationship"] = rel
                await broadcast_to_room(current_room_code, {
                    "type": "RELATIONSHIP_UPDATED",
                    "relationship": rel,
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
                    await websocket.send_text(json.dumps({"type": "ERROR", "message": "請先指定目標頻率再開始遊戲"}))
                    continue

                room["status"] = "playing"
                room["question_index"] = 0
                num_q = min(10, len(questions_db))
                room["questions"] = random.sample(questions_db, num_q)
                room["answers"] = {}
                for p_id in room["players"]:
                    room["scores"][p_id] = 0

                await broadcast_to_room(current_room_code, {
                    "type": "QUESTION_START",
                    "room_state": get_room_state(current_room_code)
                })

            # EVENT: SUBMIT_ANSWER
            elif event_type == "SUBMIT_ANSWER":
                if not current_room_code or current_room_code not in rooms:
                    await websocket.send_text(json.dumps({"type": "ERROR", "message": "未處於有效房間中"}))
                    continue

                room = rooms[current_room_code]
                if room["status"] != "playing":
                    await websocket.send_text(json.dumps({"type": "ERROR", "message": "遊戲尚未開始或處於結算狀態"}))
                    continue

                choice = data.get("choice")  # "A", "B", or "C"
                if choice not in ["A", "B", "C"]:
                    await websocket.send_text(json.dumps({"type": "ERROR", "message": "答案選項格式不符 (需為 A, B 或 C)"}))
                    continue

                room["answers"][current_player_id] = choice

                await broadcast_to_room(current_room_code, {
                    "type": "ANSWER_SUBMITTED",
                    "player_id": current_player_id,
                    "choice": choice,
                    "room_state": get_room_state(current_room_code)
                })

                # If all connected players submitted their answer, evaluate question
                if len(room["answers"]) >= len(room["players"]):
                    await evaluate_and_advance_question(current_room_code)

            else:
                await websocket.send_text(json.dumps({"type": "ERROR", "message": f"未知的事件類型: {event_type}"}))

    except WebSocketDisconnect:
        if current_room_code and current_room_code in rooms:
            room = rooms[current_room_code]
            if current_player_id in room["players"]:
                leaving_player_name = room["players"][current_player_id]["name"]
                del room["players"][current_player_id]
                room["scores"].pop(current_player_id, None)
                room["answers"].pop(current_player_id, None)

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

                    # Check if all remaining players submitted answer
                    if room["status"] == "playing" and len(room["answers"]) >= len(room["players"]) and len(room["players"]) > 0:
                        await evaluate_and_advance_question(current_room_code)
