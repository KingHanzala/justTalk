from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.models.schemas import AuthFlowResponse, LoginRequest, RegisterRequest, ResendVerificationRequest, UserOut, VerifyCodeRequest
from app.services.auth_service import login_user, register_user, resend_signup_code, verify_signup_code
from app.utils.auth import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthFlowResponse, status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    return register_user(body, db)


@router.post("/login", response_model=AuthFlowResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    return login_user(body, db)


@router.post("/verify", response_model=AuthFlowResponse)
def verify(body: VerifyCodeRequest, db: Session = Depends(get_db)):
    return verify_signup_code(body, db)


@router.post("/resend-code", response_model=AuthFlowResponse)
def resend_code(body: ResendVerificationRequest, db: Session = Depends(get_db)):
    return resend_signup_code(body, db)


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return UserOut.from_orm_user(current_user)
