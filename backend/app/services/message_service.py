from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.models import Chat, ChatMember, Message, User
from app.models.chat import ROLE_ADMIN, STATUS_ACTIVE
from app.models.schemas import MessageOut
from app.services.chat_service import can_membership_see_message


def list_messages_for_chat(chat_id: str, before: str | None, limit: int, db: Session, current_user: User) -> list[MessageOut]:
    membership = db.query(ChatMember).filter(
        ChatMember.chat_id == chat_id,
        ChatMember.user_id == current_user.id,
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this chat")

    query = (
        db.query(Message)
        .filter(Message.chat_id == chat_id)
        .options(joinedload(Message.user))
        .order_by(Message.created_at.asc())
    )
    messages = query.all()
    visible_messages = [message for message in messages if can_membership_see_message(membership, message.created_at)]
    if before and visible_messages:
        pivot = next((message for message in visible_messages if message.id == before), None)
        if pivot:
            visible_messages = [message for message in visible_messages if message.created_at < pivot.created_at]
    window = visible_messages[-limit:]
    return [MessageOut.from_orm(message, message.user.username) for message in window]


def create_message(chat_id: str, content: str, db: Session, current_user: User) -> tuple[Message, MessageOut]:
    membership = db.query(ChatMember).filter(
        ChatMember.chat_id == chat_id,
        ChatMember.user_id == current_user.id,
    ).first()
    if not membership or membership.status != STATUS_ACTIVE:
        raise HTTPException(status_code=403, detail="Not a member of this chat")

    message = Message(chat_id=chat_id, user_id=current_user.id, content=content)
    db.add(message)
    db.commit()
    db.refresh(message)

    membership.last_read_at = message.created_at
    db.commit()

    return message, MessageOut.from_orm(message, current_user.username)


def delete_message_for_everyone(chat_id: str, message_id: str, db: Session, current_user: User) -> MessageOut:
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    if not chat.is_group:
        raise HTTPException(status_code=400, detail="This operation is only available for group chats")

    membership = db.query(ChatMember).filter(
        ChatMember.chat_id == chat_id,
        ChatMember.user_id == current_user.id,
        ChatMember.role == ROLE_ADMIN,
        ChatMember.status == STATUS_ACTIVE,
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Admin access required")

    message = (
        db.query(Message)
        .filter(Message.chat_id == chat_id, Message.id == message_id)
        .options(joinedload(Message.user))
        .first()
    )
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    if message.deleted_at is None:
        message.deleted_at = datetime.now(timezone.utc).replace(tzinfo=None)
        message.deleted_by_user_id = current_user.id
        db.commit()
        db.refresh(message)

    return MessageOut.from_orm(message, message.user.username)
