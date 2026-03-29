from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.models import Chat, ChatMember, User
from app.models.chat import ROLE_ADMIN, ROLE_MEMBER, STATUS_ACTIVE, STATUS_REMOVED
from app.models.schemas import ChatDetailOut, ChatMemberOut, ChatSummaryOut, CreateChatRequest, MessageOut, SuccessResponse


def active_members(chat: Chat) -> list[ChatMember]:
    return [member for member in chat.members if member.status == STATUS_ACTIVE]


def get_membership(chat_id: str, user_id: str, db: Session) -> ChatMember | None:
    return db.query(ChatMember).filter(
        ChatMember.chat_id == chat_id,
        ChatMember.user_id == user_id,
    ).first()


def require_group_admin(chat_id: str, db: Session, current_user: User) -> tuple[Chat, ChatMember]:
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    if not chat.is_group:
        raise HTTPException(status_code=400, detail="This operation is only available for group chats")

    membership = get_membership(chat_id, current_user.id, db)
    if not membership or membership.status != STATUS_ACTIVE or membership.role != ROLE_ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return chat, membership


def require_chat_access(chat_id: str, db: Session, current_user: User) -> tuple[Chat, ChatMember]:
    chat = (
        db.query(Chat)
        .filter(Chat.id == chat_id)
        .options(joinedload(Chat.members).joinedload(ChatMember.user), joinedload(Chat.messages))
        .first()
    )
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    membership = next((member for member in chat.members if member.user_id == current_user.id), None)
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this chat")
    return chat, membership


def chat_summary(chat: Chat, membership: ChatMember) -> ChatSummaryOut:
    visible_messages = [
        message for message in chat.messages
        if membership.status == STATUS_ACTIVE or membership.removed_at is None or message.created_at <= membership.removed_at
    ]
    last_msg = visible_messages[-1] if visible_messages else None
    last_message_out = None
    if last_msg:
        username = next(
            (member.user.username for member in chat.members if member.user_id == last_msg.user_id),
            "Unknown",
        )
        last_message_out = MessageOut.from_orm(last_msg, username)

    name = chat.name
    if not chat.is_group:
        other = next((member.user for member in active_members(chat) if member.user_id != membership.user_id), None)
        if other:
            name = other.username

    return ChatSummaryOut(
        id=chat.id,
        name=name,
        isGroup=chat.is_group,
        lastMessage=last_message_out,
        memberCount=len(active_members(chat)),
        createdAt=chat.created_at,
    )


def visible_last_activity(chat: Chat, membership: ChatMember) -> datetime:
    visible_messages = [
        message for message in chat.messages
        if membership.status == STATUS_ACTIVE or membership.removed_at is None or message.created_at <= membership.removed_at
    ]
    return visible_messages[-1].created_at if visible_messages else chat.created_at


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
    memberships.sort(key=lambda membership: visible_last_activity(membership.chat, membership), reverse=True)
    return [chat_summary(membership.chat, membership) for membership in memberships]


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
                current_membership = next(member for member in chat_with_rels.members if member.user_id == current_user.id)
                return chat_summary(chat_with_rels, current_membership)

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
                status=STATUS_ACTIVE,
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
    current_membership = next(member for member in chat_with_rels.members if member.user_id == current_user.id)
    return chat_summary(chat_with_rels, current_membership)


def get_chat_for_user(chat_id: str, db: Session, current_user: User) -> ChatDetailOut:
    chat, membership = require_chat_access(chat_id, db, current_user)

    members = [
        ChatMemberOut(
            userId=member.user_id,
            username=member.user.username,
            role=member.role,
            joinedAt=member.joined_at,
        )
        for member in active_members(chat)
    ]
    return ChatDetailOut(
        id=chat.id,
        name=chat.name,
        isGroup=chat.is_group,
        members=members,
        membershipStatus=membership.status,
        canWrite=membership.status == STATUS_ACTIVE,
        createdAt=chat.created_at,
    )


def add_member_to_chat(chat_id: str, user_id: str, db: Session, current_user: User) -> SuccessResponse:
    require_group_admin(chat_id, db, current_user)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    existing = get_membership(chat_id, user_id, db)
    if existing:
        if existing.status == STATUS_REMOVED:
            existing.status = STATUS_ACTIVE
            existing.removed_at = None
            db.commit()
        return SuccessResponse(success=True)

    db.add(ChatMember(chat_id=chat_id, user_id=user_id, role=ROLE_MEMBER, status=STATUS_ACTIVE))
    db.commit()
    return SuccessResponse(success=True)


def remove_member_from_chat(chat_id: str, user_id: str, db: Session, current_user: User) -> SuccessResponse:
    require_group_admin(chat_id, db, current_user)

    membership = get_membership(chat_id, user_id, db)
    if not membership:
        raise HTTPException(status_code=404, detail="Member not found")
    if membership.status == STATUS_REMOVED:
        return SuccessResponse(success=True)

    if membership.role == ROLE_ADMIN:
        admin_count = db.query(ChatMember).filter(
            ChatMember.chat_id == chat_id,
            ChatMember.role == ROLE_ADMIN,
            ChatMember.status == STATUS_ACTIVE,
        ).count()
        if admin_count <= 1:
            raise HTTPException(status_code=409, detail="A group must always have at least one admin")

    membership.status = STATUS_REMOVED
    membership.removed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    return SuccessResponse(success=True)
