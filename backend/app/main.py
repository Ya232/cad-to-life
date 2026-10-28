from datetime import datetime, timezone
from enum import Enum
import os
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()


class PartType(str, Enum):
    enclosure = "enclosure"
    bracket = "bracket"
    mounting_plate = "mounting_plate"
    spacer = "spacer"


class DesignRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(min_length=1, max_length=2000)
    part_type: PartType
    width_mm: float = Field(gt=0, le=1000)
    depth_mm: float = Field(gt=0, le=1000)
    height_mm: float = Field(gt=0, le=1000)


class DesignPreview(DesignRequest):
    wall_thickness_mm: float
    printable: bool
    warnings: list[str]


class Project(DesignPreview):
    id: str
    created_at: datetime


app = FastAPI(title="CAD-to-Life API", version="0.1.0")
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]
custom_origins = os.getenv("ALLOWED_ORIGINS")
if custom_origins:
    allowed_origins.extend(origin.strip() for origin in custom_origins.split(",") if origin.strip())
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

projects: list[Project] = []


def build_preview(request: DesignRequest) -> DesignPreview:
    warnings: list[str] = []
    wall_thickness = 2.0

    if min(request.width_mm, request.depth_mm, request.height_mm) < 10:
        warnings.append("At least one dimension is below 10 mm.")
    if request.part_type == PartType.enclosure and min(
        request.width_mm, request.depth_mm
    ) < 20:
        warnings.append("This enclosure may not leave enough room for components.")
    if request.part_type == PartType.spacer and request.height_mm < 3:
        warnings.append("This spacer may be too short to print reliably.")

    return DesignPreview(
        **request.model_dump(),
        wall_thickness_mm=wall_thickness,
        printable=not warnings,
        warnings=warnings,
    )


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/meta/status")
def meta_status() -> dict[str, bool]:
    return {"configured": bool(os.getenv("META_MODEL_API_KEY"))}


@app.get("/api/projects", response_model=list[Project])
def list_projects() -> list[Project]:
    return projects


@app.post("/api/designs/preview", response_model=DesignPreview)
def preview_design(request: DesignRequest) -> DesignPreview:
    return build_preview(request)


@app.post("/api/projects", response_model=Project, status_code=201)
def create_project(request: DesignRequest) -> Project:
    preview = build_preview(request)
    project = Project(
        id=str(uuid4()),
        created_at=datetime.now(timezone.utc),
        **preview.model_dump(),
    )
    projects.insert(0, project)
    return project


@app.get("/api/projects/{project_id}", response_model=Project)
def get_project(project_id: str) -> Project:
    for project in projects:
        if project.id == project_id:
            return project
    raise HTTPException(status_code=404, detail="Project not found")
