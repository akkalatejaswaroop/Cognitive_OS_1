from typing import Optional, Dict, Any
from pydantic import BaseModel, EmailStr

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
    preferences: Optional[UserPreferences] = None
    cognitive_preferences: Optional[CognitivePreferences] = None

class UserProfileResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: Optional[str]
    name: Optional[str]
    avatar_url: Optional[str]
    role: str
    timezone: str
    preferences: Dict[str, Any]
    cognitive_preferences: Dict[str, Any]
    onboarding_completed: bool

    class Config:
        from_attributes = True
