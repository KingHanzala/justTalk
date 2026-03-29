from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.models.schemas import AddMemberRequest, ChatDetailOut, ChatSummaryOut, CreateChatRequest, SuccessResponse
from app.services.chat_service import add_member_to_chat, create_chat_for_user, get_chat_for_user, list_chats_for_user, mark_chat_as_read, remove_member_from_chat
from app.utils.auth import get_current_user
from app.websockets.manager import manager

router = APIRouter(prefix="/chats", tags=["chats"])


@router.get("", response_model=list[ChatSummaryOut])
def list_chats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_chats_for_user(db, current_user)


@router.post("", response_model=ChatSummaryOut, status_code=201)
def create_chat(
    body: CreateChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_chat_for_user(body, db, current_user)


@router.get("/{chat_id}", response_model=ChatDetailOut)
def get_chat(
    chat_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_chat_for_user(chat_id, db, current_user)


@router.post("/{chat_id}/members", response_model=SuccessResponse)
async def add_member(
    chat_id: str,
    body: AddMemberRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = add_member_to_chat(chat_id, body.userId, db, current_user)
    return result


@router.delete("/{chat_id}/members/{user_id}", response_model=SuccessResponse)
async def remove_member(
    chat_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = remove_member_from_chat(chat_id, user_id, db, current_user)
    await manager.disconnect_user(chat_id, user_id, code=4004)
    return result


@router.post("/{chat_id}/read", response_model=SuccessResponse)
def mark_read(
    chat_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return mark_chat_as_read(chat_id, db, current_user)
