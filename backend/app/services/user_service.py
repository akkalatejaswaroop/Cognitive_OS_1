from sqlalchemy.orm import Session
from app.models.domain import User
from typing import Optional
import uuid

class UserService:
    def __init__(self, db: Session):
        self.db = db

    def get_user(self, user_id: str) -> Optional[User]:
        try:
            return self.db.query(User).filter(User.id == uuid.UUID(user_id)).first()
        except Exception:
            return None

    def get_user_by_firebase_uid(self, firebase_uid: str) -> Optional[User]:
        return self.db.query(User).filter(User.firebase_uid == firebase_uid).first()
