import json

from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.models import ChatMember, User
from app.models.chat import STATUS_ACTIVE
from app.utils.jwt import decode_token
from app.websockets.manager import manager


async def handle_chat_websocket(chat_id: str, websocket: WebSocket, token: str, db: Session) -> None:
    try:
        user_id = decode_token(token)
    except Exception:
        await websocket.close(code=4001)
        return

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_verified:
        await websocket.close(code=4002)
        return

    membership = db.query(ChatMember).filter(
        ChatMember.chat_id == chat_id,
        ChatMember.user_id == user_id,
    ).first()
    if not membership or membership.status != STATUS_ACTIVE:
        await websocket.close(code=4003)
        return

    await manager.connect(chat_id, user_id, websocket)
    try:
        while True:
            raw_message = await websocket.receive_text()
            try:
                payload = json.loads(raw_message)
            except json.JSONDecodeError:
                continue

            if payload.get("type") != "typing":
                continue

            is_typing = bool(payload.get("data", {}).get("isTyping"))
            await manager.broadcast_except(
                chat_id,
                user_id,
                {
                    "type": "typing",
                    "data": {
                        "chatId": chat_id,
                        "userId": user_id,
                        "username": user.username,
                        "isTyping": is_typing,
                    },
                },
            )
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(chat_id, user_id, websocket)
