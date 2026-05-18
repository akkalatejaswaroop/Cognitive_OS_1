from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.domain import User, Session as DBSession
from app.core.security import create_token, get_password_hash, verify_password
from pydantic import BaseModel
from datetime import datetime, timedelta
import uuid

router = APIRouter()

class UserCreate(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

@router.post("/signup")
def signup(user_in: UserCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        role="user"
    )
    db.add(new_user)
    db.commit()
    return {"message": "User created successfully"}

@router.post("/login")
def login(response: Response, user_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_in.email).first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    access_token = create_token(subject=user.id, token_type="access")
    refresh_token = create_token(subject=user.id, token_type="refresh")
    
    # Store refresh token / session in Neon Postgres
    db_session = DBSession(user_id=user.id, expires_at=datetime.utcnow() + timedelta(days=7))
    db.add(db_session)
    db.commit()

    # Set HttpOnly Cookies
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        secure=False, # Set to True in production with HTTPS
        samesite="lax",
        max_age=15 * 60
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=7 * 24 * 60 * 60
    )

    return {
        "message": "Login successful",
        "user": {"id": str(user.id), "email": user.email, "role": user.role}
    }

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "Logged out successfully"}
