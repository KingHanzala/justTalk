import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import User
from app.models.schemas import (
    AuthFlowResponse,
    LoginRequest,
    RegisterRequest,
    ResendVerificationRequest,
    UserOut,
    VerifyCodeRequest,
)
from app.services.email_service import email_sender
from app.utils.jwt import create_access_token


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def normalize_username(username: str) -> str:
    return username.strip().lower()


def now_utc() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def generate_verification_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_verification_code(code: str) -> str:
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


def verification_expiry() -> datetime:
    from app.config import settings

    return now_utc() + timedelta(minutes=settings.verification_code_expire_minutes)


def issue_verification_code(user: User) -> None:
    from app.config import settings

    current_time = now_utc()
    if user.verification_code_sent_at and current_time - user.verification_code_sent_at < timedelta(
        seconds=settings.verification_code_resend_seconds
    ):
        raise HTTPException(status_code=429, detail="Please wait before requesting another code")

    code = generate_verification_code()
    user.verification_code_hash = hash_verification_code(code)
    user.verification_code_expires_at = verification_expiry()
    user.verification_code_sent_at = current_time
    email_sender.send_verification_code(email=user.email, username=user.username, code=code)


def auth_response_for(user: User, *, verification_required: bool, token: str | None = None) -> AuthFlowResponse:
    return AuthFlowResponse(
        token=token,
        user=UserOut.from_orm_user(user),
        verificationRequired=verification_required,
    )


def register_user(body: RegisterRequest, db: Session) -> AuthFlowResponse:
    normalized_username = normalize_username(body.username)
    username_match = db.query(User).filter(User.username_normalized == normalized_username).first()
    email_match = db.query(User).filter(User.email == body.email).first()

    if username_match and email_match and username_match.id != email_match.id:
        raise HTTPException(status_code=409, detail="Username or email already registered")
    if username_match and username_match.email != body.email:
        raise HTTPException(status_code=409, detail="Username already taken")
    if email_match and email_match.username_normalized != normalized_username:
        raise HTTPException(status_code=409, detail="Email already registered")

    existing = username_match or email_match
    if existing and existing.is_verified:
        if existing.username_normalized == normalized_username:
            raise HTTPException(status_code=409, detail="Username already taken")
        raise HTTPException(status_code=409, detail="Email already registered")

    if existing:
        existing.username = body.username.strip()
        existing.username_normalized = normalized_username
        existing.email = body.email
        existing.password_hash = hash_password(body.password)
        existing.is_verified = False
        issue_verification_code(existing)
        db.commit()
        db.refresh(existing)
        return auth_response_for(existing, verification_required=True)

    user = User(
        username=body.username.strip(),
        username_normalized=normalized_username,
        email=body.email,
        password_hash=hash_password(body.password),
        is_verified=False,
    )
    db.add(user)
    db.flush()
    issue_verification_code(user)
    db.commit()
    db.refresh(user)
    return auth_response_for(user, verification_required=True)


def login_user(body: LoginRequest, db: Session) -> AuthFlowResponse:
    user = db.query(User).filter(User.username_normalized == normalize_username(body.username)).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    if not user.is_verified:
        return auth_response_for(user, verification_required=True)

    token = create_access_token(user.id)
    return auth_response_for(user, verification_required=False, token=token)


def verify_signup_code(body: VerifyCodeRequest, db: Session) -> AuthFlowResponse:
    user = db.query(User).filter(User.username_normalized == normalize_username(body.username)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_verified:
        token = create_access_token(user.id)
        return auth_response_for(user, verification_required=False, token=token)
    if not user.verification_code_hash or not user.verification_code_expires_at:
        raise HTTPException(status_code=400, detail="No verification code has been issued")
    if user.verification_code_expires_at < now_utc():
        raise HTTPException(status_code=400, detail="Verification code has expired")
    if user.verification_code_hash != hash_verification_code(body.code):
        raise HTTPException(status_code=400, detail="Invalid verification code")

    user.is_verified = True
    user.verification_code_hash = None
    user.verification_code_expires_at = None
    user.verification_code_sent_at = None
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    return auth_response_for(user, verification_required=False, token=token)


def resend_signup_code(body: ResendVerificationRequest, db: Session) -> AuthFlowResponse:
    user = db.query(User).filter(User.username_normalized == normalize_username(body.username)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_verified:
        token = create_access_token(user.id)
        return auth_response_for(user, verification_required=False, token=token)

    issue_verification_code(user)
    db.commit()
    db.refresh(user)
    return auth_response_for(user, verification_required=True)
