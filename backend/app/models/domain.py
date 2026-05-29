import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Integer, Float
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    firebase_uid = Column(String(128), unique=True, nullable=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="user")
    is_active = Column(Boolean, default=True)
    name = Column(String(255), nullable=True)
    full_name = Column(String(255), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    preferences = Column(JSONB, default=dict, nullable=True)
    cognitive_preferences = Column(JSONB, default=lambda: {
        "default_model": "llama3.2",
        "temperature": 0.7,
        "memory_retrieval_depth": 5,
        "agent_verbosity": "medium",
        "voice_enabled": False
    }, nullable=True)
    
    # Extended Profile Fields
    phone_number = Column(String(50), nullable=True)
    dob = Column(DateTime(timezone=True), nullable=True)
    company = Column(String(255), nullable=True)
    role_title = Column(String(255), nullable=True)
    social_profiles = Column(JSONB, default=dict, nullable=True)
    interests = Column(JSONB, default=list, nullable=True)
    hobbies = Column(JSONB, default=list, nullable=True)
    public_profile_url = Column(String(255), unique=True, index=True, nullable=True)
    
    onboarding_completed = Column(Boolean, default=False, nullable=False)
    timezone = Column(String(100), default="UTC", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    integrations = relationship("Integration", back_populates="user", cascade="all, delete-orphan")
    workflows = relationship("Workflow", back_populates="user", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
    memories = relationship("Memory", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    subscription = relationship("Subscription", back_populates="user", cascade="all, delete-orphan", uselist=False)
    activity_logs = relationship("ActivityLog", back_populates="user")
    workspaces = relationship("Workspace", back_populates="owner", cascade="all, delete-orphan")

class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    owner = relationship("User", back_populates="workspaces")

class Session(Base):
    __tablename__ = "sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    device_info = Column(JSONB)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    user = relationship("User", back_populates="sessions")

class Integration(Base):
    __tablename__ = "integrations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    provider = Column(String(100), nullable=False)
    credentials = Column(JSONB, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    user = relationship("User", back_populates="integrations")

class Workflow(Base):
    __tablename__ = "workflows"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    name = Column(String(255), nullable=False)
    description = Column(Text)
    dag_definition = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="workflows")
    tasks = relationship("Task", back_populates="workflow")

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    title = Column(String(255), default="New Conversation")
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="conversations")
    tasks = relationship("Task", back_populates="conversation", cascade="all, delete-orphan")
    memories = relationship("Memory", back_populates="conversation", cascade="all, delete-orphan")

class Task(Base):
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), index=True)
    workflow_id = Column(UUID(as_uuid=True), ForeignKey("workflows.id", ondelete="SET NULL"), nullable=True)
    parent_task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True)
    
    assigned_agent = Column(String(100), nullable=False)
    status = Column(String(50), default="pending", index=True)
    input_payload = Column(JSONB)
    output_result = Column(JSONB)
    
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=utcnow)

    conversation = relationship("Conversation", back_populates="tasks")
    workflow = relationship("Workflow", back_populates="tasks")
    
    # Adjacency list for sub-tasks
    sub_tasks = relationship("Task", backref="parent_task", remote_side=[id])
    logs = relationship("AgentLog", back_populates="task", cascade="all, delete-orphan")
    actions = relationship("AIAction", back_populates="task", cascade="all, delete-orphan")

class AgentLog(Base):
    __tablename__ = "agent_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), index=True)
    agent_name = Column(String(100), nullable=False)
    log_level = Column(String(20), default="info")
    message = Column(Text, nullable=False)
    metadata_json = Column(JSONB)  # Using metadata_json instead of metadata to avoid SQLAlchemy collision
    created_at = Column(DateTime(timezone=True), default=utcnow)

    task = relationship("Task", back_populates="logs")

class AIAction(Base):
    __tablename__ = "ai_actions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), index=True)
    tool_name = Column(String(100), nullable=False)
    tool_input = Column(JSONB)
    tool_output = Column(JSONB)
    execution_time_ms = Column(Integer)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    task = relationship("Task", back_populates="actions")

class Memory(Base):
    __tablename__ = "memories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=True)
    chroma_doc_id = Column(String(255), unique=True, nullable=False)
    memory_type = Column(String(50), nullable=False)
    summary = Column(Text)
    importance_score = Column(Float, default=0.5)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    user = relationship("User", back_populates="memories")
    conversation = relationship("Conversation", back_populates="memories")

class KnowledgeEntry(Base):
    """
    The canonical record for captured knowledge (Voice, Text, Documents).
    Tracks the ingestion lifecycle and links to AI insights.
    """
    __tablename__ = "knowledge_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    source_type = Column(String(50), nullable=False, index=True) # voice, text, document, meeting
    title = Column(String(255), nullable=True)
    raw_content = Column(Text, nullable=True)
    content_url = Column(String(500), nullable=True) # S3/Blob path for audio/docs
    
    status = Column(String(50), default="pending", index=True) # pending, processing, completed, failed
    processing_log = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    user = relationship("User", backref="knowledge_entries")
    insights = relationship("KnowledgeInsight", back_populates="entry", cascade="all, delete-orphan")

class KnowledgeInsight(Base):
    """
    Structured AI-generated results from a KnowledgeEntry.
    """
    __tablename__ = "knowledge_insights"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entry_id = Column(UUID(as_uuid=True), ForeignKey("knowledge_entries.id", ondelete="CASCADE"), index=True)
    
    summary = Column(Text, nullable=False)
    key_points = Column(JSONB, default=list) # List of strings
    action_items = Column(JSONB, default=list) # List of strings
    entities = Column(JSONB, default=dict) # Named entities extracted
    sentiment = Column(String(50), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=utcnow)

    entry = relationship("KnowledgeEntry", back_populates="insights")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    title = Column(String(255), nullable=False)
    message = Column(Text)
    is_read = Column(Boolean, default=False)
    action_link = Column(String(255))
    created_at = Column(DateTime(timezone=True), default=utcnow)

    user = relationship("User", back_populates="notifications")

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    status = Column(String(50), default="trialing", nullable=False)
    tier = Column(String(50), default="free", nullable=False)
    stripe_customer_id = Column(String(255), unique=True, nullable=True)
    stripe_subscription_id = Column(String(255), unique=True, nullable=True)
    price_id = Column(String(255), nullable=True)
    quantity = Column(Integer, default=1)
    cancel_at_period_end = Column(Boolean, default=False, nullable=False)
    trial_start = Column(DateTime(timezone=True), nullable=True)
    trial_end = Column(DateTime(timezone=True), nullable=True)
    current_period_start = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    current_period_end = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="subscription")

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    ip_address = Column(String(100), nullable=True)
    user_agent = Column(String(500), nullable=True)
    action_type = Column(String(100), nullable=False, index=True)
    severity_level = Column(String(50), default="info", nullable=False)
    metadata_json = Column(JSONB, default=dict, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    user = relationship("User", back_populates="activity_logs")

class Goal(Base):
    """
    Goal Tracking Engine:
    Tracks high-level productivity targets, deadline compliance, and key results.
    """
    __tablename__ = "goals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    target_date = Column(DateTime(timezone=True), nullable=False)
    
    status = Column(String(50), default="active", index=True) # active, completed, delayed, abandoned
    completion_percentage = Column(Float, default=0.0, nullable=False)
    key_results = Column(JSONB, default=dict, nullable=False)
    
    # Extended Goal Tracking attributes
    goal_type = Column(String(50), default="short_term", nullable=False)
    parent_goal_id = Column(UUID(as_uuid=True), ForeignKey("goals.id", ondelete="SET NULL"), nullable=True)
    projected_completion_date = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    user = relationship("User", backref="goals")
    parent = relationship("Goal", remote_side=[id], backref="sub_goals")

class FocusSession(Base):
    """
    Focus Time Analysis:
    Tracks Focus timer cycles, interruptions, and context-switching metrics.
    """
    __tablename__ = "focus_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    goal_id = Column(UUID(as_uuid=True), ForeignKey("goals.id", ondelete="SET NULL"), nullable=True)
    
    started_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    
    duration_seconds = Column(Integer, default=0)
    interruption_count = Column(Integer, default=0)
    context_switch_count = Column(Integer, default=0)
    flow_state_score = Column(Float, default=1.0)
    
    created_at = Column(DateTime(timezone=True), default=utcnow)

    user = relationship("User", backref="focus_sessions")
    goal = relationship("Goal", backref="focus_sessions")

class TaskHistory(Base):
    """
    Task Ingestion & State Transitions:
    Tracks tasks completion rates, estimations, and actual durations.
    """
    __tablename__ = "task_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    goal_id = Column(UUID(as_uuid=True), ForeignKey("goals.id", ondelete="SET NULL"), nullable=True)
    
    title = Column(String(255), nullable=False)
    status = Column(String(50), default="pending", index=True) # pending, in_progress, completed, failed
    estimated_duration_minutes = Column(Integer, nullable=True)
    actual_duration_minutes = Column(Integer, nullable=True)
    
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    user = relationship("User", backref="task_histories")
    goal = relationship("Goal", backref="task_histories")

class ProductivityLog(Base):
    """
    Productivity Logs / Real-time Telemetry:
    Raw active app switches and typing intervals determining fatigue indexes.
    """
    __tablename__ = "productivity_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    focus_session_id = Column(UUID(as_uuid=True), ForeignKey("focus_sessions.id", ondelete="SET NULL"), nullable=True)
    
    timestamp = Column(DateTime(timezone=True), default=utcnow, index=True)
    active_application = Column(String(255), nullable=False)
    window_title = Column(String(500), nullable=True)
    
    keystroke_count = Column(Integer, default=0, nullable=False)
    keystroke_average_gap_ms = Column(Float, default=0.0, nullable=False)
    mouse_scroll_pixels = Column(Integer, default=0, nullable=False)
    app_switch_count = Column(Integer, default=0, nullable=False)
    
    is_distracting = Column(Boolean, default=False, nullable=False)
    fatigue_index = Column(Float, default=0.0, nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=utcnow)

    @property
    def keystroke_jitter(self) -> float:
        if self.keystroke_count > 10:
            jitter = abs(self.keystroke_average_gap_ms - 200.0) / 200.0
            return min(1.0, max(0.0, jitter))
        return 0.0

    @property
    def distraction_ratio(self) -> float:
        return 1.0 if self.is_distracting else 0.0

    user = relationship("User", backref="productivity_logs")
    focus_session = relationship("FocusSession", backref="productivity_logs")

class AIRecommendation(Base):
    """
    AI Productivity Recommendations:
    Actionable insights generated by agentic analyses of raw events.
    """
    __tablename__ = "ai_recommendations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    
    title = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False) # focus, pacing, delegation, goal_restructure
    description = Column(Text, nullable=False)
    
    priority_score = Column(Float, default=0.5)
    is_actionable = Column(Boolean, default=True)
    action_payload = Column(JSONB, default=dict, nullable=True)
    status = Column(String(50), default="pending", index=True) # pending, dismissed, executed
    
    created_at = Column(DateTime(timezone=True), default=utcnow)

    user = relationship("User", backref="ai_recommendations")

class AnalyticsReport(Base):
    """
    Daily / Weekly Reports:
    Aggregated files mapping productivity performance summaries.
    """
    __tablename__ = "analytics_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    
    report_type = Column(String(50), nullable=False) # daily, weekly
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    
    markdown_content = Column(Text, nullable=False)
    metrics_summary = Column(JSONB, nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=utcnow)

    user = relationship("User", backref="analytics_reports")
