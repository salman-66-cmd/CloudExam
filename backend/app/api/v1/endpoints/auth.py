from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Body
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import verify_password, get_password_hash, create_access_token
from backend.app.core.config import settings
from backend.app.models.models import User, UserRole
from backend.app.schemas.schemas import Token, LoginRequest, UserCreate, UserResponse
from backend.app.api.deps import get_current_user
from backend.app.services.audit_service import log_audit_event

router = APIRouter()

@router.post("/login", response_model=Token)
def login(
    request: Request,
    payload: Optional[LoginRequest] = Body(None),
    db: Session = Depends(get_db)
):
    username_or_email = None
    password = None

    if payload:
        username_or_email = payload.username_or_email
        password = payload.password

    # If not provided via JSON body, try reading form data
    if not username_or_email or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing username_or_email or password"
        )

    user = db.query(User).filter(
        (User.email == username_or_email) | (User.username == username_or_email)
    ).first()

    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please verify username/email and password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is deactivated. Contact administrator.")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(
        subject=str(user.id), 
        expires_delta=access_token_expires, 
        role=user.role.value
    )

    log_audit_event(
        db=db,
        action="USER_LOGIN",
        resource_type="USER",
        user_id=user.id,
        resource_id=str(user.id),
        ip_address=request.client.host if request.client else None
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/register", response_model=UserResponse)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(User).filter(User.username == user_in.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    new_user = User(
        email=user_in.email,
        username=user_in.username,
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role or UserRole.STUDENT,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    log_audit_event(
        db=db,
        action="USER_REGISTER",
        resource_type="USER",
        user_id=new_user.id,
        resource_id=str(new_user.id),
        details={"email": new_user.email, "role": new_user.role.value}
    )

    return new_user

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    log_audit_event(
        db=db,
        action="USER_LOGOUT",
        resource_type="USER",
        user_id=current_user.id,
        resource_id=str(current_user.id)
    )
    return {"message": "Successfully logged out"}
