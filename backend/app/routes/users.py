from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.models.schemas import UserOut
from app.utils.auth import get_current_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/search", response_model=list[UserOut])
def search_users(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    users = (
        db.query(User)
        .filter(func.lower(User.username).contains(q.lower()), User.id != current_user.id)
        .limit(20)
        .all()
    )
    return [UserOut.from_orm_user(u) for u in users]
