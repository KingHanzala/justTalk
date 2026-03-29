from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.models import ChatMember
from app.models.chat import STATUS_ACTIVE
from app.utils.jwt import decode_token
from app.websockets.manager import manager


async def handle_chat_websocket(chat_id: str, websocket: WebSocket, token: str, db: Session) -> None:
    try:
        user_id = decode_token(token)
    except Exception:
        await websocket.close(code=4001)
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
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(chat_id, user_id, websocket)
