from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.models import ChatMember, Message, User
from app.models.schemas import MessageOut


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
    if before:
        pivot = db.query(Message).filter(Message.id == before).first()
        if pivot:
            query = query.filter(Message.created_at < pivot.created_at)

    messages = query.limit(limit).all()
    return [MessageOut.from_orm(message, message.user.username) for message in messages]


def create_message(chat_id: str, content: str, db: Session, current_user: User) -> tuple[Message, MessageOut]:
    membership = db.query(ChatMember).filter(
        ChatMember.chat_id == chat_id,
        ChatMember.user_id == current_user.id,
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this chat")

    message = Message(chat_id=chat_id, user_id=current_user.id, content=content)
    db.add(message)
    db.commit()
    db.refresh(message)

    return message, MessageOut.from_orm(message, current_user.username)
