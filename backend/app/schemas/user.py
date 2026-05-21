from typing import Optional, Dict, Any, List
from pydantic import BaseModel, EmailStr, field_serializer
import uuid as uuid_mod


class CognitivePreferences(BaseModel):
    default_model: str = "llama3.2"
    temperature: float = 0.7
    memory_retrieval_depth: int = 5
    agent_verbosity: str = "medium"
    voice_enabled: bool = False


class NotificationSettings(BaseModel):
    email_digests: bool = True
    security_alerts: bool = True
    system_updates: bool = False
    in_app_notifications: bool = True


class UserPreferences(BaseModel):
    theme: str = "system"
    density: str = "default"
    notifications: NotificationSettings = NotificationSettings()


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    timezone: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None
    cognitive_preferences: Optional[Dict[str, Any]] = None
    phone_number: Optional[str] = None
    dob: Optional[str] = None
    company: Optional[str] = None
    role_title: Optional[str] = None
    social_profiles: Optional[Dict[str, str]] = None
    interests: Optional[List[str]] = None
    hobbies: Optional[List[str]] = None
    public_profile_url: Optional[str] = None
    onboarding_completed: Optional[bool] = None


class UserProfileResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str = "user"
    timezone: str = "UTC"
    preferences: Dict[str, Any] = {}
    cognitive_preferences: Dict[str, Any] = {}
    onboarding_completed: bool = False
    phone_number: Optional[str] = None
    dob: Optional[str] = None
    company: Optional[str] = None
    role_title: Optional[str] = None
    social_profiles: Optional[Dict[str, str]] = None
    interests: Optional[List[str]] = None
    hobbies: Optional[List[str]] = None
    public_profile_url: Optional[str] = None

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj, **kwargs):
        # Convert UUID id to str, and DateTime dob to ISO string
        data = {}
        if hasattr(obj, "__dict__") or hasattr(obj, "_sa_class_manager"):
            data["id"] = str(obj.id) if obj.id else ""
            data["email"] = obj.email or ""
            data["full_name"] = obj.full_name
            data["name"] = obj.name
            data["avatar_url"] = obj.avatar_url
            data["role"] = obj.role or "user"
            data["timezone"] = obj.timezone or "UTC"
            data["preferences"] = obj.preferences or {
                "theme": "system",
                "density": "default",
                "notifications": {
                    "email_digests": True,
                    "security_alerts": True,
                    "system_updates": False,
                    "in_app_notifications": True,
                },
            }
            data["cognitive_preferences"] = obj.cognitive_preferences or {
                "default_model": "llama3.2",
                "temperature": 0.7,
                "memory_retrieval_depth": 5,
                "agent_verbosity": "medium",
                "voice_enabled": False,
            }
            data["onboarding_completed"] = obj.onboarding_completed or False
            data["phone_number"] = obj.phone_number
            data["dob"] = obj.dob.isoformat() if obj.dob else None
            data["company"] = obj.company
            data["role_title"] = obj.role_title
            data["social_profiles"] = obj.social_profiles
            data["interests"] = obj.interests
            data["hobbies"] = obj.hobbies
            data["public_profile_url"] = obj.public_profile_url
            return cls(**data)
        return super().model_validate(obj, **kwargs)


class PublicProfileResponse(BaseModel):
    """Safe public-facing profile — no email or sensitive fields."""
    id: str
    full_name: Optional[str] = None
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    role_title: Optional[str] = None
    company: Optional[str] = None
    timezone: str = "UTC"
    dob: Optional[str] = None
    phone_number: Optional[str] = None
    social_profiles: Optional[Dict[str, str]] = None
    interests: Optional[List[str]] = None
    hobbies: Optional[List[str]] = None
    public_profile_url: Optional[str] = None

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj, **kwargs):
        if hasattr(obj, "_sa_class_manager") or hasattr(obj, "id"):
            return cls(
                id=str(obj.id),
                full_name=obj.full_name,
                name=obj.name,
                avatar_url=obj.avatar_url,
                role_title=obj.role_title,
                company=obj.company,
                timezone=obj.timezone or "UTC",
                dob=obj.dob.isoformat() if obj.dob else None,
                phone_number=obj.phone_number,
                social_profiles=obj.social_profiles,
                interests=obj.interests,
                hobbies=obj.hobbies,
                public_profile_url=obj.public_profile_url,
            )
        return super().model_validate(obj, **kwargs)
