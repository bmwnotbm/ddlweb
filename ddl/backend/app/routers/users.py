import math

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.deps import get_current_user

router = APIRouter(tags=["User Management"])


@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.get("/check-username/{username}", response_model=schemas.UsernameAvailability)
def check_username(username: str, db: Session = Depends(get_db)):
    exists = db.query(models.User).filter(models.User.username == username).first()
    return schemas.UsernameAvailability(username=username, available=exists is None)


@router.get("/users", response_model=schemas.PaginatedUsers)
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.User)
    total = query.count()
    items = (
        query.order_by(models.User.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return schemas.PaginatedUsers(
        total=total,
        page=page,
        page_size=page_size,
        items=items,
    )


def _get_user_or_404(user_id: int, db: Session) -> models.User:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/users/{user_id}", response_model=schemas.UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return _get_user_or_404(user_id, db)


@router.put("/users/{user_id}", response_model=schemas.UserResponse)
def update_user(
    user_id: int,
    payload: schemas.UserUpdateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.id != user_id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="You can only edit your own account")

    user = _get_user_or_404(user_id, db)

    if payload.email and payload.email != user.email:
        if db.query(models.User).filter(models.User.email == payload.email).first():
            raise HTTPException(status_code=409, detail="Email is already registered")
        user.email = payload.email

    if payload.full_name is not None:
        user.full_name = payload.full_name

    # เฉพาะ admin เท่านั้นที่เปลี่ยนสถานะ is_active ของคนอื่นได้
    if payload.is_active is not None:
        if not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Administrator access required")
        user.is_active = payload.is_active

    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", response_model=schemas.MessageResponse)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.id != user_id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="You can only delete your own account")

    user = _get_user_or_404(user_id, db)
    db.delete(user)
    db.commit()
    return schemas.MessageResponse(message="User deleted")
