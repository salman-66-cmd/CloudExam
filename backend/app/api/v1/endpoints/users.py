from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import get_password_hash
from backend.app.models.models import User, UserRole
from backend.app.schemas.schemas import UserResponse, UserCreate, UserUpdate, UserStatusUpdate
from backend.app.api.deps import get_current_user, get_current_admin, get_current_teacher_or_admin
from backend.app.services.audit_service import log_audit_event

router = APIRouter()

@router.get("/", response_model=List[UserResponse])
def list_users(
    role: Optional[UserRole] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_teacher_or_admin),
    db: Session = Depends(get_db)
):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            (User.full_name.ilike(search_fmt)) |
            (User.username.ilike(search_fmt)) |
            (User.email.ilike(search_fmt))
        )
    return query.offset(skip).limit(limit).all()

@router.post("/", response_model=UserResponse)
def create_user(
    user_in: UserCreate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(User).filter(User.username == user_in.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    new_user = User(
        email=user_in.email,
        username=user_in.username,
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role,
        is_active=user_in.is_active
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    log_audit_event(
        db=db,
        action="ADMIN_CREATE_USER",
        resource_type="USER",
        user_id=current_user.id,
        resource_id=str(new_user.id),
        details={"username": new_user.username, "role": new_user.role.value}
    )
    return new_user

@router.get("/{user_id}", response_model=UserResponse)
def get_user_by_id(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Allow self lookup or teacher/admin lookup
    if current_user.id != user_id and current_user.role == UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Not authorized to view this user profile")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_in: UserUpdate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user_in.email and user_in.email != user.email:
        if db.query(User).filter(User.email == user_in.email).first():
            raise HTTPException(status_code=400, detail="Email already exists")
        user.email = user_in.email

    if user_in.full_name is not None:
        user.full_name = user_in.full_name
    if user_in.role is not None:
        user.role = user_in.role
    if user_in.is_active is not None:
        user.is_active = user_in.is_active
    if user_in.password:
        user.hashed_password = get_password_hash(user_in.password)

    db.commit()
    db.refresh(user)

    log_audit_event(
        db=db,
        action="UPDATE_USER",
        resource_type="USER",
        user_id=current_user.id,
        resource_id=str(user.id),
        details={"updated_fields": list(user_in.model_dump(exclude_unset=True).keys())}
    )
    return user

@router.patch("/{user_id}/status", response_model=UserResponse)
def toggle_user_status(
    user_id: int,
    status_in: UserStatusUpdate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot alter own active status")

    user.is_active = status_in.is_active
    db.commit()
    db.refresh(user)

    log_audit_event(
        db=db,
        action="USER_STATUS_CHANGE",
        resource_type="USER",
        user_id=current_user.id,
        resource_id=str(user.id),
        details={"new_active_status": user.is_active}
    )
    return user
