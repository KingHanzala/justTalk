from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserOut(BaseModel):
    id: str
    username: str
    email: str
    createdAt: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_user(cls, user):
        return cls(id=user.id, username=user.username, email=user.email, createdAt=user.created_at)


class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    token: str
    user: UserOut


class MessageOut(BaseModel):
    id: str
    chatId: str
    userId: str
    username: str
    content: str
    isDeleted: bool
    createdAt: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm(cls, msg, username: str):
        return cls(
            id=msg.id,
            chatId=msg.chat_id,
            userId=msg.user_id,
            username=username,
            content="This message was deleted" if msg.deleted_at else msg.content,
            isDeleted=msg.deleted_at is not None,
            createdAt=msg.created_at,
        )


class ChatMemberOut(BaseModel):
    userId: str
    username: str
    role: str
    joinedAt: datetime


class ChatSummaryOut(BaseModel):
    id: str
    name: str | None
    isGroup: bool
    lastMessage: MessageOut | None
    memberCount: int
    createdAt: datetime


class ChatDetailOut(BaseModel):
    id: str
    name: str | None
    isGroup: bool
    members: list[ChatMemberOut]
    createdAt: datetime


class CreateChatRequest(BaseModel):
    isGroup: bool
    name: str | None = None
    memberUserIds: list[str]


class SendMessageRequest(BaseModel):
    content: str


class AddMemberRequest(BaseModel):
    userId: str


class SuccessResponse(BaseModel):
    success: bool


class ErrorResponse(BaseModel):
    error: str
