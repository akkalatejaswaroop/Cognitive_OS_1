from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.domain import User, Session as DBSession
from app.core.security import create_token, get_password_hash, verify_password
from app.core.config import settings
from app.schemas.user import UserUpdate, UserProfileResponse, PublicProfileResponse
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
from fastapi import UploadFile, File
import uuid, shutil, os, json

router = APIRouter()


class FirebaseSyncIn(BaseModel):
    id_token: str


@router.post("/firebase-sync")
def firebase_sync(response: Response, body: FirebaseSyncIn, db: Session = Depends(get_db)):
    """
    Exchange a Firebase ID token for backend httpOnly session cookies.
    Called by the frontend after Firebase sign-in instead of writing document.cookie directly.
    Auto-provisions users that don't exist yet in the local DB.
    """
    try:
        import firebase_admin.auth
        from firebase_admin import get_app, initialize_app, credentials as fb_credentials
        import json as _json

        # Ensure firebase_admin is initialised
        try:
            get_app()
        except ValueError:
            if settings.FIREBASE_SERVICE_ACCOUNT_JSON:
                try:
                    cred_dict = _json.loads(settings.FIREBASE_SERVICE_ACCOUNT_JSON)
                    cred = fb_credentials.Certificate(cred_dict)
                except _json.JSONDecodeError:
                    cred = fb_credentials.Certificate(settings.FIREBASE_SERVICE_ACCOUNT_JSON)
                initialize_app(cred)
            else:
                initialize_app()

        decoded = firebase_admin.auth.verify_id_token(body.id_token)
        firebase_uid: str = decoded["uid"]
        email: str = decoded.get("email", "")
        name: str = decoded.get("name") or (email.split("@")[0] if email else "")

    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Invalid Firebase token: {exc}")

    # Look up or auto-provision the user
    user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
    if not user and email:
        user = db.query(User).filter(User.email == email).first()

    if not user:
        # First-time sign-in — create the user
        user = User(
            firebase_uid=firebase_uid,
            email=email,
            hashed_password=get_password_hash(uuid.uuid4().hex),
            role="user",
            name=name,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    elif not user.firebase_uid:
        # Existing email-based user — link Firebase UID
        user.firebase_uid = firebase_uid
        db.commit()
        db.refresh(user)

    if not user.is_active:
        raise HTTPException(status_code=403, detail="User account is disabled")

    # Issue backend JWT cookies so all protected endpoints work
    access_token = create_token(subject=user.id, token_type="access")
    refresh_token_val = create_token(subject=user.id, token_type="refresh")

    # Upsert session record
    db_session = db.query(DBSession).filter(DBSession.user_id == user.id).first()
    if db_session:
        db_session.expires_at = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    else:
        db_session = DBSession(
            user_id=user.id,
            expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )
        db.add(db_session)
    db.commit()

    set_auth_cookies(response, access_token, refresh_token_val)

    return {
        "message": "Session synchronised",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "role": user.role,
            "name": user.name,
        },
    }


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
    # Verify Firebase credential/ID token before trusting the email
    if user_in.credential:
        try:
            import firebase_admin.auth
            from firebase_admin import credentials, initialize_app, get_app

            try:
                get_app()
            except ValueError:
                if settings.FIREBASE_SERVICE_ACCOUNT_JSON:
                    try:
                        cred_dict = json.loads(settings.FIREBASE_SERVICE_ACCOUNT_JSON)
                        cred = credentials.Certificate(cred_dict)
                    except json.JSONDecodeError:
                        cred = credentials.Certificate(settings.FIREBASE_SERVICE_ACCOUNT_JSON)
                    initialize_app(cred)
                else:
                    options = {}
                    if getattr(settings, "FIREBASE_PROJECT_ID", None):
                        options["projectId"] = settings.FIREBASE_PROJECT_ID
                    initialize_app(options=options if options else None)

            decoded = firebase_admin.auth.verify_id_token(user_in.credential)
            if decoded.get("email") != user_in.email:
                raise HTTPException(status_code=403, detail="Email mismatch with token")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=401, detail=f"Invalid Google credential: {e}")
    else:
        raise HTTPException(status_code=400, detail="Google credential token required")

    user = db.query(User).filter(User.email == user_in.email).first()

    if not user:
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

    access_token = create_token(subject=user.id, token_type="access")
    refresh_token = create_token(subject=user.id, token_type="refresh")

    now = datetime.now(timezone.utc)
    db_session = DBSession(user_id=user.id, expires_at=now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS))
    db.add(db_session)
    db.commit()

    set_auth_cookies(response, access_token, refresh_token)

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

def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    is_prod = settings.ENVIRONMENT.lower() == "production"
    
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        secure=is_prod,
        samesite="none" if is_prod else "lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/"
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=is_prod,
        samesite="none" if is_prod else "lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/"
    )

@router.post("/login")
def login(response: Response, user_in: UserLogin, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_in.email).first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    access_token = create_token(subject=user.id, token_type="access")
    refresh_token = create_token(subject=user.id, token_type="refresh")
    
    now = datetime.now(timezone.utc)
    db_session = DBSession(
        user_id=user.id,
        expires_at=now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        device_info={"user_agent": request.headers.get("user-agent")}
    )
    db.add(db_session)
    db.commit()

    set_auth_cookies(response, access_token, refresh_token)

    return {
        "message": "Login successful",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "role": user.role,
            "name": user.name,
            "avatar_url": user.avatar_url,
            "is_active": user.is_active,
            "preferences": user.preferences or {}
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
    
    try:
        user_uuid = uuid.UUID(user_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    now = datetime.now(timezone.utc)
    
    # Validate session in DB - match the specific session that issued the refresh token
    # Use the jti (JWT ID) claim to trace back to a specific db session if available
    db_session = db.query(DBSession).filter(
        DBSession.user_id == user_uuid,
        DBSession.expires_at > now
    ).order_by(DBSession.created_at.desc()).first()
    
    if not db_session:
        raise HTTPException(status_code=401, detail="Session expired or invalid")
    
    user = db.query(User).filter(User.id == user_uuid).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    # Rotate refresh token for maximum security
    new_access_token = create_token(subject=user.id, token_type="access")
    new_refresh_token = create_token(subject=user.id, token_type="refresh")
    
    # Update current session
    db_session.expires_at = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    db.commit()

    set_auth_cookies(response, new_access_token, new_refresh_token)
    
    return {"message": "Token refreshed"}

@router.post("/logout")
def logout(response: Response, request: Request, db: Session = Depends(get_db)):
    # Optional: Delete session from DB if refresh token is provided
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        try:
            payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            user_id = payload.get("sub")
            if user_id:
                user_uuid = uuid.UUID(user_id)
                # Only delete the current session, not all user sessions
                current_session = db.query(DBSession).filter(
                    DBSession.user_id == user_uuid,
                    DBSession.expires_at > datetime.now(timezone.utc)
                ).order_by(DBSession.created_at.desc()).first()
                if current_session:
                    db.delete(current_session)
                db.commit()
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Failed to delete session on logout: {e}")

    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserProfileResponse)
def get_me(request: Request, response: Response, db: Session = Depends(get_db)):
    # Custom implementation of get_current_user logic to handle auto-provisioning
    token = request.cookies.get("access_token")
    if token and token.startswith("Bearer "):
        token = token[7:]
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Try standard validation first
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )
    
    payload = None
    user_id = None
    firebase_uid = None
    is_firebase = False
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if payload.get("type") != "access":
            payload = None
    except JWTError:
        pass
        
    if payload is None:
        try:
            import firebase_admin.auth
            from firebase_admin import credentials, initialize_app, get_app
            
            try:
                get_app()
            except ValueError:
                if settings.FIREBASE_SERVICE_ACCOUNT_JSON:
                    import json
                    try:
                        cred_dict = json.loads(settings.FIREBASE_SERVICE_ACCOUNT_JSON)
                        cred = credentials.Certificate(cred_dict)
                    except json.JSONDecodeError:
                        cred = credentials.Certificate(settings.FIREBASE_SERVICE_ACCOUNT_JSON)
                    initialize_app(cred)
                else:
                    options = {}
                    if getattr(settings, "FIREBASE_PROJECT_ID", None):
                        options["projectId"] = settings.FIREBASE_PROJECT_ID
                    initialize_app(options=options if options else None)
                    
            decoded_token = firebase_admin.auth.verify_id_token(token)
            firebase_uid = decoded_token.get("uid")
            payload = decoded_token
            is_firebase = True
        except Exception:
            payload = None

    if not payload or (not user_id and not firebase_uid):
        raise credentials_exception
        
    user = None
    if user_id:
        try:
            uuid_user_id = uuid.UUID(user_id)
            user = db.query(User).filter(User.id == uuid_user_id).first()
        except Exception:
            raise credentials_exception
    else:
        user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
    
    # Auto-provision user if they are valid in Firebase but missing locally
    if not user and is_firebase:
        email = payload.get("email")
        if not email:
            raise credentials_exception
            
        # Check if user with this email already exists
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            # Create new user
            user = User(
                firebase_uid=firebase_uid,
                email=email,
                hashed_password=get_password_hash(uuid.uuid4().hex),
                role="user",
                name=payload.get("name") or email.split("@")[0]
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            # User exists, link Firebase UID
            user.firebase_uid = firebase_uid
            db.commit()
            db.refresh(user)

    if user is None or not user.is_active:
        raise credentials_exception

    # If authenticated via Firebase (no custom JWT session), create a backend session
    # and set proper JWT cookies so the refresh flow works seamlessly.
    if is_firebase or (payload and payload.get("type") != "access"):
        now = datetime.now(timezone.utc)
        db_session = db.query(DBSession).filter(
            DBSession.user_id == user.id,
            DBSession.expires_at > now
        ).first()

        if not db_session:
            db_session = DBSession(
                user_id=user.id,
                expires_at=now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
                device_info={"user_agent": request.headers.get("user-agent")}
            )
            db.add(db_session)
        else:
            db_session.expires_at = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        db.commit()

        new_access_token = create_token(subject=user.id, token_type="access")
        new_refresh_token = create_token(subject=user.id, token_type="refresh")
        set_auth_cookies(response, new_access_token, new_refresh_token)

    return UserProfileResponse.model_validate(user)


@router.patch("/profile", response_model=UserProfileResponse)
def update_profile(
    profile_in: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    update_data = profile_in.model_dump(exclude_unset=True)

    # Deep-merge JSONB preferences
    if "preferences" in update_data:
        existing = dict(current_user.preferences or {})
        incoming = update_data.pop("preferences") or {}
        if isinstance(incoming, dict):
            existing.update(incoming)
        current_user.preferences = existing

    # Deep-merge JSONB cognitive_preferences
    if "cognitive_preferences" in update_data:
        existing_cog = dict(current_user.cognitive_preferences or {})
        incoming_cog = update_data.pop("cognitive_preferences") or {}
        if isinstance(incoming_cog, dict):
            existing_cog.update(incoming_cog)
        current_user.cognitive_preferences = existing_cog

    # Handle dob string → parse to datetime or None
    if "dob" in update_data:
        if update_data["dob"] == "":
            update_data["dob"] = None
        elif update_data["dob"]:
            try:
                update_data["dob"] = datetime.fromisoformat(update_data["dob"])
            except ValueError:
                raise HTTPException(status_code=422, detail="Invalid date format for dob. Use ISO format (e.g., 1990-01-01).")

    # Update other scalar fields
    for field, value in update_data.items():
        setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)
    return UserProfileResponse.model_validate(current_user)

@router.post("/avatar", response_model=UserProfileResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # In a real app, you would upload to S3 or Cloudinary
    # For this prototype, we'll save locally in a 'static/avatars' folder
    upload_dir = "static/avatars"
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)
        
    file_extension = os.path.splitext(file.filename)[1]
    file_name = f"{current_user.id}{file_extension}"
    file_path = os.path.join(upload_dir, file_name)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Update user avatar_url
    # In a real app, this would be a full URL
    current_user.avatar_url = f"/static/avatars/{file_name}"
    db.commit()
    db.refresh(current_user)
    return UserProfileResponse.model_validate(current_user)

@router.get("/public/{username}", response_model=PublicProfileResponse)
def get_public_profile(username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.public_profile_url == username).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=404, detail="Profile not found")
    return PublicProfileResponse.model_validate(user)

