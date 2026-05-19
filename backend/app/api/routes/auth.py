from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.domain import User, Session as DBSession
from app.core.security import create_token, get_password_hash, verify_password
from app.core.config import settings
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

class GoogleAuthIn(BaseModel):
    email: str
    name: str | None = None
    credential: str | None = None

@router.post("/google")
def google_auth(response: Response, user_in: GoogleAuthIn, db: Session = Depends(get_db)):
    # 1. Check if user already exists
    user = db.query(User).filter(User.email == user_in.email).first()
    
    if not user:
        # Create a new user since it is sign up / sign in together
        # Generates a random secure password hash
        random_password = uuid.uuid4().hex
        user = User(
            email=user_in.email,
            hashed_password=get_password_hash(random_password),
            role="user",
            name=user_in.name
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # 2. Complete login flow (same as email/pass login success)
    access_token = create_token(subject=user.id, token_type="access")
    refresh_token = create_token(subject=user.id, token_type="refresh")
    
    db_session = DBSession(user_id=user.id, expires_at=datetime.utcnow() + timedelta(days=7))
    db.add(db_session)
    db.commit()

    is_prod = settings.ENVIRONMENT.lower() == "production"

    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        secure=is_prod,
        samesite="strict" if is_prod else "lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=is_prod,
        samesite="strict" if is_prod else "lax",
        max_age=7 * 24 * 60 * 60
    )

    return {
        "message": "Google authentication successful",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "role": user.role,
            "name": user.name,
            "avatar_url": user.avatar_url,
            "preferences": user.preferences or {}
        }
    }

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

    is_prod = settings.ENVIRONMENT.lower() == "production"

    # Set HttpOnly Cookies
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        secure=is_prod,
        samesite="strict" if is_prod else "lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=is_prod,
        samesite="strict" if is_prod else "lax",
        max_age=7 * 24 * 60 * 60
    )

    return {
        "message": "Login successful",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "role": user.role,
            "name": user.name,
            "avatar_url": user.avatar_url,
            "preferences": user.preferences or {}
        }
    }

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "role": current_user.role,
        "name": current_user.name,
        "avatar_url": current_user.avatar_url,
        "preferences": current_user.preferences or {}
    }

class ProfileUpdate(BaseModel):
    name: str | None = None
    avatar_url: str | None = None
    preferences: dict | None = None

@router.patch("/profile")
def update_profile(
    profile_in: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if profile_in.name is not None:
        current_user.name = profile_in.name
    if profile_in.avatar_url is not None:
        current_user.avatar_url = profile_in.avatar_url
    if profile_in.preferences is not None:
        if current_user.preferences is None:
            current_user.preferences = {}
        new_prefs = dict(current_user.preferences)
        new_prefs.update(profile_in.preferences)
        current_user.preferences = new_prefs
        
    db.commit()
    db.refresh(current_user)
    
    return {
        "message": "Profile updated successfully",
        "user": {
            "id": str(current_user.id),
            "email": current_user.email,
            "role": current_user.role,
            "name": current_user.name,
            "avatar_url": current_user.avatar_url,
            "preferences": current_user.preferences or {}
        }
    }

@router.post("/refresh")
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")
    
    try:
        payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        if user_id is None or token_type != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    # Check if session exists in DB
    db_session = db.query(DBSession).filter(
        DBSession.user_id == uuid.UUID(user_id),
        DBSession.expires_at > datetime.utcnow()
    ).first()
    
    if not db_session:
        raise HTTPException(status_code=401, detail="Session expired or invalid")
    
    user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    new_access_token = create_token(subject=user.id, token_type="access")
    
    is_prod = settings.ENVIRONMENT.lower() == "production"
    response.set_cookie(
        key="access_token",
        value=f"Bearer {new_access_token}",
        httponly=True,
        secure=is_prod,
        samesite="strict" if is_prod else "lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    
    return {"message": "Token refreshed"}

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "Logged out successfully"}
