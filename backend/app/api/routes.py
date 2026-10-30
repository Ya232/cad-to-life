import os
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, HTTPException

from ..models import DesignPreview, DesignRequest, Project
from ..services.preview import build_preview

router = APIRouter()
projects: list[Project] = []


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/meta/status")
def meta_status() -> dict[str, bool]:
    return {"configured": bool(os.getenv("META_MODEL_API_KEY"))}


@router.get("/projects", response_model=list[Project])
def list_projects() -> list[Project]:
    return projects


@router.post("/designs/preview", response_model=DesignPreview)
def preview_design(request: DesignRequest) -> DesignPreview:
    return build_preview(request)


@router.post("/projects", response_model=Project, status_code=201)
def create_project(request: DesignRequest) -> Project:
    preview = build_preview(request)
    project = Project(
        id=str(uuid4()),
        created_at=datetime.now(timezone.utc),
        **preview.model_dump(),
    )
    projects.insert(0, project)
    return project


@router.get("/projects/{project_id}", response_model=Project)
def get_project(project_id: str) -> Project:
    for project in projects:
        if project.id == project_id:
            return project
    raise HTTPException(status_code=404, detail="Project not found")
