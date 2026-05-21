"""
Workspace CRUD API
- POST   /api/v1/workspaces        → create workspace
- GET    /api/v1/workspaces        → list current user's workspaces
- GET    /api/v1/workspaces/{id}   → get single workspace
- PATCH  /api/v1/workspaces/{id}   → rename workspace
- DELETE /api/v1/workspaces/{id}   → delete workspace
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import uuid

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.domain import User, Workspace

router = APIRouter()


# ── Pydantic schemas ────────────────────────────────────────────────────────

class WorkspaceCreate(BaseModel):
    name: str


class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None


class WorkspaceResponse(BaseModel):
    id: str
    name: str
    owner_id: str
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj, **kwargs):
        return cls(
            id=str(obj.id),
            name=obj.name,
            owner_id=str(obj.owner_id),
            created_at=obj.created_at.isoformat() if obj.created_at else "",
            updated_at=obj.updated_at.isoformat() if obj.updated_at else "",
        )


# ── Routes ──────────────────────────────────────────────────────────────────

@router.post("", response_model=WorkspaceResponse, status_code=201)
def create_workspace(
    workspace_in: WorkspaceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new workspace for the authenticated user."""
    if not workspace_in.name.strip():
        raise HTTPException(status_code=422, detail="Workspace name cannot be empty")

    workspace = Workspace(
        name=workspace_in.name.strip(),
        owner_id=current_user.id,
    )
    db.add(workspace)
    db.commit()
    db.refresh(workspace)
    return WorkspaceResponse.model_validate(workspace)


@router.get("", response_model=List[WorkspaceResponse])
def list_workspaces(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all workspaces belonging to the authenticated user."""
    workspaces = (
        db.query(Workspace)
        .filter(Workspace.owner_id == current_user.id)
        .order_by(Workspace.created_at.desc())
        .all()
    )
    return [WorkspaceResponse.model_validate(ws) for ws in workspaces]


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
def get_workspace(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workspace = db.query(Workspace).filter(
        Workspace.id == uuid.UUID(workspace_id),
        Workspace.owner_id == current_user.id,
    ).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return WorkspaceResponse.model_validate(workspace)


@router.patch("/{workspace_id}", response_model=WorkspaceResponse)
def update_workspace(
    workspace_id: str,
    workspace_in: WorkspaceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workspace = db.query(Workspace).filter(
        Workspace.id == uuid.UUID(workspace_id),
        Workspace.owner_id == current_user.id,
    ).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    if workspace_in.name is not None:
        if not workspace_in.name.strip():
            raise HTTPException(status_code=422, detail="Workspace name cannot be empty")
        workspace.name = workspace_in.name.strip()

    db.commit()
    db.refresh(workspace)
    return WorkspaceResponse.model_validate(workspace)


@router.delete("/{workspace_id}", status_code=204)
def delete_workspace(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workspace = db.query(Workspace).filter(
        Workspace.id == uuid.UUID(workspace_id),
        Workspace.owner_id == current_user.id,
    ).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    db.delete(workspace)
    db.commit()
