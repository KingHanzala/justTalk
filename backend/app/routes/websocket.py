from fastapi import APIRouter, Depends, Query, WebSocket
from sqlalchemy.orm import Session

from app.database import get_db
from app.websockets.handler import handle_chat_websocket

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/{chat_id}")
async def websocket_endpoint(
    chat_id: str,
    websocket: WebSocket,
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    await handle_chat_websocket(chat_id, websocket, token, db)
