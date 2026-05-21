"""Add firebase_uid to User

Revision ID: 9295f05ab2e7
Revises: 3d7b414b38c0
Create Date: 2026-05-20 22:05:49.451914

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '9295f05ab2e7'
down_revision: Union[str, Sequence[str], None] = '3d7b414b38c0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('firebase_uid', sa.String(length=128), nullable=True))
    op.drop_index(op.f('idx_agent_logs_task_id'), table_name='agent_logs')
    op.create_index(op.f('ix_agent_logs_task_id'), 'agent_logs', ['task_id'], unique=False)
    op.drop_index(op.f('idx_ai_actions_task_id'), table_name='ai_actions')
    op.create_index(op.f('ix_ai_actions_task_id'), 'ai_actions', ['task_id'], unique=False)
    op.drop_index(op.f('idx_conversations_user_id'), table_name='conversations')
    op.drop_index(op.f('idx_integrations_user_id'), table_name='integrations')
    op.drop_index(op.f('idx_memories_type'), table_name='memories')
    op.drop_index(op.f('idx_memories_user_id'), table_name='memories')
    op.create_index(op.f('ix_memories_user_id'), 'memories', ['user_id'], unique=False)
    op.drop_index(op.f('idx_notifications_is_read'), table_name='notifications')
    op.drop_index(op.f('idx_notifications_user_id'), table_name='notifications')
    op.drop_index(op.f('idx_sessions_expires_at'), table_name='sessions')
    op.drop_index(op.f('idx_sessions_user_id'), table_name='sessions')
    op.drop_index(op.f('idx_tasks_conversation_id'), table_name='tasks')
    op.drop_index(op.f('idx_tasks_status'), table_name='tasks')
    op.create_index(op.f('ix_tasks_conversation_id'), 'tasks', ['conversation_id'], unique=False)
    op.create_index(op.f('ix_tasks_status'), 'tasks', ['status'], unique=False)
    op.drop_index(op.f('idx_users_email'), table_name='users')
    op.drop_constraint(op.f('users_email_key'), 'users', type_='unique')
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_firebase_uid'), 'users', ['firebase_uid'], unique=True)
    op.drop_index(op.f('idx_workflows_user_id'), table_name='workflows')


def downgrade() -> None:
    """Downgrade schema."""
    op.create_index(op.f('idx_workflows_user_id'), 'workflows', ['user_id'], unique=False)
    op.drop_index(op.f('ix_users_firebase_uid'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.create_unique_constraint(op.f('users_email_key'), 'users', ['email'])
    op.create_index(op.f('idx_users_email'), 'users', ['email'], unique=False)
    op.drop_column('users', 'firebase_uid')
    op.drop_index(op.f('ix_tasks_status'), table_name='tasks')
    op.drop_index(op.f('ix_tasks_conversation_id'), table_name='tasks')
    op.create_index(op.f('idx_tasks_status'), 'tasks', ['status'], unique=False)
    op.create_index(op.f('idx_tasks_conversation_id'), 'tasks', ['conversation_id'], unique=False)
    op.create_index(op.f('idx_sessions_user_id'), 'sessions', ['user_id'], unique=False)
    op.create_index(op.f('idx_sessions_expires_at'), 'sessions', ['expires_at'], unique=False)
    op.create_index(op.f('idx_notifications_user_id'), 'notifications', ['user_id'], unique=False)
    op.create_index(op.f('idx_notifications_is_read'), 'notifications', ['is_read'], unique=False)
    op.drop_index(op.f('ix_memories_user_id'), table_name='memories')
    op.create_index(op.f('idx_memories_user_id'), 'memories', ['user_id'], unique=False)
    op.create_index(op.f('idx_memories_type'), 'memories', ['memory_type'], unique=False)
    op.create_index(op.f('idx_integrations_user_id'), 'integrations', ['user_id'], unique=False)
    op.create_index(op.f('idx_conversations_user_id'), 'conversations', ['user_id'], unique=False)
    op.drop_index(op.f('ix_ai_actions_task_id'), table_name='ai_actions')
    op.create_index(op.f('idx_ai_actions_task_id'), 'ai_actions', ['task_id'], unique=False)
    op.drop_index(op.f('ix_agent_logs_task_id'), table_name='agent_logs')
    op.create_index(op.f('idx_agent_logs_task_id'), 'agent_logs', ['task_id'], unique=False)
