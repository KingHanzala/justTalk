from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.models.schemas import MessageOut, SendMessageRequest
from app.services.message_service import create_message, delete_message_for_everyone, list_messages_for_chat
from app.utils.auth import get_current_user
from app.websockets.manager import manager

router = APIRouter(prefix="/chats", tags=["messages"])


@router.get("/{chat_id}/messages", response_model=list[MessageOut])
def list_messages(
    chat_id: str,
    before: str | None = Query(None),
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_messages_for_chat(chat_id, before, limit, db, current_user)


@router.post("/{chat_id}/messages", response_model=MessageOut, status_code=201)
async def send_message(
    chat_id: str,
    body: SendMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _, msg_out = create_message(chat_id, body.content, db, current_user)

    await manager.broadcast(chat_id, {
        "type": "message",
        "data": msg_out.model_dump(mode="json"),
    })

    return msg_out


@router.delete("/{chat_id}/messages/{message_id}", response_model=MessageOut)
async def delete_message(
    chat_id: str,
    message_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    msg_out = delete_message_for_everyone(chat_id, message_id, db, current_user)

    await manager.broadcast(chat_id, {
        "type": "message_updated",
        "data": msg_out.model_dump(mode="json"),
    })

    return msg_out
