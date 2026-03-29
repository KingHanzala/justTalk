from fastapi import WebSocket
from collections import defaultdict
import json


class ConnectionManager:
    def __init__(self):
        # chat_id -> list of (user_id, websocket)
        self.active: dict[str, list[tuple[str, WebSocket]]] = defaultdict(list)

    async def connect(self, chat_id: str, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active[chat_id].append((user_id, websocket))

    def disconnect(self, chat_id: str, user_id: str, websocket: WebSocket):
        self.active[chat_id] = [
            (uid, ws) for uid, ws in self.active[chat_id]
            if ws is not websocket
        ]

    async def disconnect_user(self, chat_id: str, user_id: str, code: int = 4003):
        keep = []
        for uid, ws in list(self.active[chat_id]):
            if uid == user_id:
                try:
                    await ws.close(code=code)
                except Exception:
                    pass
            else:
                keep.append((uid, ws))
        self.active[chat_id] = keep

    async def broadcast(self, chat_id: str, message: dict):
        payload = json.dumps(message, default=str)
        dead = []
        for uid, ws in list(self.active[chat_id]):
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append((uid, ws))
        for item in dead:
            if item in self.active[chat_id]:
                self.active[chat_id].remove(item)


manager = ConnectionManager()
