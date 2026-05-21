from fastapi import Depends, HTTPException, status, Request
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.models.domain import User

def get_token_from_cookie(request: Request) -> str:
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    # Remove 'Bearer ' prefix if present
    if token.startswith("Bearer "):
        token = token[7:]
    return token

def get_user_from_token(db: Session, token: str) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )
    
    payload = None
    user_id = None
    firebase_uid = None
    
    # Try decoding with our own secret first
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        token_type = payload.get("type")
        if token_type != "access":
            payload = None # Force fallback
    except JWTError:
        pass
        
    # If that failed, try decoding as a Firebase JWT
    if payload is None:
        try:
            import firebase_admin.auth
            from firebase_admin import credentials
            from firebase_admin import initialize_app, get_app
            
            # Ensure firebase is initialized
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
        except Exception as e:
            payload = None

    if (payload is None or user_id is None) and firebase_uid is None:
        raise credentials_exception
        
    if user_id:
        import uuid
        try:
            uuid_user_id = uuid.UUID(user_id)
        except (ValueError, TypeError):
            raise credentials_exception
            
        user = db.query(User).filter(User.id == uuid_user_id).first()
    else:
        user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
        
    if user is None or not user.is_active:
        raise credentials_exception
    return user

def get_current_user(db: Session = Depends(get_db), token: str = Depends(get_token_from_cookie)):
    return get_user_from_token(db, token)

def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user
