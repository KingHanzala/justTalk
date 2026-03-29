from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.models import Chat, ChatMember, User
from app.models.chat import ROLE_ADMIN, ROLE_MEMBER
from app.models.schemas import ChatDetailOut, ChatMemberOut, ChatSummaryOut, CreateChatRequest, MessageOut, SuccessResponse


def require_group_admin(chat_id: str, db: Session, current_user: User) -> Chat:
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    if not chat.is_group:
        raise HTTPException(status_code=400, detail="This operation is only available for group chats")

    membership = db.query(ChatMember).filter(
        ChatMember.chat_id == chat_id,
        ChatMember.user_id == current_user.id,
        ChatMember.role == ROLE_ADMIN,
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Admin access required")
    return chat


def chat_summary(chat: Chat, current_user_id: str) -> ChatSummaryOut:
    last_msg = chat.messages[-1] if chat.messages else None
    last_message_out = None
    if last_msg:
        username = next(
            (member.user.username for member in chat.members if member.user_id == last_msg.user_id),
            "Unknown",
        )
        last_message_out = MessageOut.from_orm(last_msg, username)

    name = chat.name
    if not chat.is_group:
        other = next((member.user for member in chat.members if member.user_id != current_user_id), None)
        if other:
            name = other.username

    return ChatSummaryOut(
        id=chat.id,
        name=name,
        isGroup=chat.is_group,
        lastMessage=last_message_out,
        memberCount=len(chat.members),
        createdAt=chat.created_at,
    )


def list_chats_for_user(db: Session, current_user: User) -> list[ChatSummaryOut]:
    memberships = (
        db.query(ChatMember)
        .filter(ChatMember.user_id == current_user.id)
        .options(
            joinedload(ChatMember.chat).joinedload(Chat.members).joinedload(ChatMember.user),
            joinedload(ChatMember.chat).joinedload(Chat.messages),
        )
        .all()
    )
    chats = [membership.chat for membership in memberships]
    chats.sort(key=lambda chat: chat.messages[-1].created_at if chat.messages else chat.created_at, reverse=True)
    return [chat_summary(chat, current_user.id) for chat in chats]


def create_chat_for_user(body: CreateChatRequest, db: Session, current_user: User) -> ChatSummaryOut:
    all_user_ids = list(set([current_user.id] + body.memberUserIds))

    if not body.isGroup and len(all_user_ids) == 2:
        existing = (
            db.query(Chat)
            .join(ChatMember, Chat.id == ChatMember.chat_id)
            .filter(Chat.is_group == False, ChatMember.user_id == current_user.id)
            .all()
        )
        for chat in existing:
            member_ids = {member.user_id for member in chat.members}
            if member_ids == set(all_user_ids):
                chat_with_rels = (
                    db.query(Chat)
                    .filter(Chat.id == chat.id)
                    .options(
                        joinedload(Chat.members).joinedload(ChatMember.user),
                        joinedload(Chat.messages),
                    )
                    .first()
                )
                return chat_summary(chat_with_rels, current_user.id)

    chat = Chat(name=body.name, is_group=body.isGroup)
    db.add(chat)
    db.flush()

    for user_id in all_user_ids:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail=f"User {user_id} not found")
        db.add(
            ChatMember(
                chat_id=chat.id,
                user_id=user_id,
                role=ROLE_ADMIN if user_id == current_user.id and body.isGroup else ROLE_MEMBER,
            )
        )

    db.commit()

    chat_with_rels = (
        db.query(Chat)
        .filter(Chat.id == chat.id)
        .options(
            joinedload(Chat.members).joinedload(ChatMember.user),
            joinedload(Chat.messages),
        )
        .first()
    )
    return chat_summary(chat_with_rels, current_user.id)


def get_chat_for_user(chat_id: str, db: Session, current_user: User) -> ChatDetailOut:
    chat = (
        db.query(Chat)
        .filter(Chat.id == chat_id)
        .options(joinedload(Chat.members).joinedload(ChatMember.user))
        .first()
    )
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    if not any(member.user_id == current_user.id for member in chat.members):
        raise HTTPException(status_code=403, detail="Not a member of this chat")

    members = [
        ChatMemberOut(
            userId=member.user_id,
            username=member.user.username,
            role=member.role,
            joinedAt=member.joined_at,
        )
        for member in chat.members
    ]
    return ChatDetailOut(
        id=chat.id,
        name=chat.name,
        isGroup=chat.is_group,
        members=members,
        createdAt=chat.created_at,
    )


def add_member_to_chat(chat_id: str, user_id: str, db: Session, current_user: User) -> SuccessResponse:
    require_group_admin(chat_id, db, current_user)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    existing = db.query(ChatMember).filter(
        ChatMember.chat_id == chat_id,
        ChatMember.user_id == user_id,
    ).first()
    if existing:
        return SuccessResponse(success=True)

    db.add(ChatMember(chat_id=chat_id, user_id=user_id, role=ROLE_MEMBER))
    db.commit()
    return SuccessResponse(success=True)


def remove_member_from_chat(chat_id: str, user_id: str, db: Session, current_user: User) -> SuccessResponse:
    require_group_admin(chat_id, db, current_user)

    membership = db.query(ChatMember).filter(
        ChatMember.chat_id == chat_id,
        ChatMember.user_id == user_id,
    ).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Member not found")

    if membership.role == ROLE_ADMIN:
        admin_count = db.query(ChatMember).filter(
            ChatMember.chat_id == chat_id,
            ChatMember.role == ROLE_ADMIN,
        ).count()
        if admin_count <= 1:
            raise HTTPException(status_code=409, detail="A group must always have at least one admin")

    db.delete(membership)
    db.commit()
    return SuccessResponse(success=True)
