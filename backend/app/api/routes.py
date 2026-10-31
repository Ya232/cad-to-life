import hashlib
import json
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, HTTPException

from ..models import (
    AnalyzeNeedsClarification,
    AnalyzeReady,
    AnalyzeRequest,
    AnalyzeResponse,
    DesignPreview,
    DesignRequest,
    GenerateRequest,
    GenerateResult,
    Project,
)
from ..cad import generate_part
from ..library import Component, component_store, find_component
from ..services.meta_client import MetaClientError, meta_client
from ..services.preview import build_preview

router = APIRouter()
projects: list[Project] = []


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/meta/status")
def meta_status() -> dict[str, bool | str]:
    return {
        "configured": meta_client.configured,
        "reachable": meta_client.health_check() if meta_client.configured else False,
        "model": meta_client.model,
    }


@router.get("/components", response_model=list[Component])
def list_components(search: str | None = None) -> list[Component]:
    return component_store.list(search)


@router.get("/components/{component_id}", response_model=Component)
def get_component(component_id: str) -> Component:
    component = component_store.get(component_id)
    if component is None:
        raise HTTPException(status_code=404, detail="Component not found")
    return component


@router.post("/components", response_model=Component)
def upsert_component(component: Component) -> Component:
    return component_store.upsert(component)


@router.delete("/components/{component_id}", status_code=204)
def delete_component(component_id: str) -> None:
    try:
        component_store.delete(component_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Component not found") from exc
    except PermissionError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post("/designs/analyze", response_model=AnalyzeResponse)
def analyze_design(request: AnalyzeRequest) -> AnalyzeResponse:
    project_id = hashlib.sha256(
        json.dumps(
            {
                "description": request.description,
                "language": request.language,
                "answers": request.answers,
            },
            sort_keys=True,
        ).encode("utf-8")
    ).hexdigest()
    system = """
You are CAD-to-Life, a mechanical design assistant. Extract the requested part
type, components, constraints, and only explicit numeric parameters from the
user request. Never invent component dimensions. Never interpret a number in a
product name, such as ESP32, as a dimension.

If a critical choice is missing, return:
{"status":"needs_clarification","questions":[{"id":"...","text":"...","options":["...","..."]}]}
Questions must be in LANGUAGE and have 2 to 4 short options.
Ask about the exact board/model, mounting method, or required accessible ports
when necessary.
Ask exactly one question at a time. After the user answers, use the answer
and ask the next single most important missing question. Continue until the
specification is complete, then return ready.

Otherwise return:
{"status":"ready","spec":{"part_type":"enclosure|bracket|mounting_plate|spacer",
"name":"...","components":[{"query":"...","library_id":null,"confidence":0.0}],
"constraints":{"usb_access":false,"mounting":"none|wall|screws",
"waterproof":false,"max_size_mm":null,"notes":"..."},
"parameters":{"only_explicit_parameter_name":0.0},"language":"LANGUAGE"}}

Respond with JSON only. No markdown and no explanation.
""".replace("LANGUAGE", request.language).strip()
    user = json.dumps(
        {"description": request.description, "answers": request.answers},
        ensure_ascii=False,
    )
    try:
        payload = meta_client.chat_json(system, user, project_id=project_id)
        if payload.get("status") == "needs_clarification":
            questions = payload.get("questions")
            if isinstance(questions, list) and len(questions) > 1:
                payload = {**payload, "questions": questions[:1]}
            return AnalyzeNeedsClarification.model_validate(payload)
        if payload.get("status") == "ready":
            ready = AnalyzeReady.model_validate(payload)
            for component in ready.spec.components:
                matches = find_component(component.query, limit=2)
                if matches:
                    best, score = matches[0]
                    component.confidence = max(component.confidence, score / 100)
                    if score >= 85:
                        component.library_id = best.id
                    elif score >= 65 and len(matches) > 1:
                        raise MetaClientError(
                            f"Component match for '{component.query}' is ambiguous."
                        )
            return ready
        raise MetaClientError("Meta returned an unknown analysis status.")
    except MetaClientError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/designs/generate", response_model=GenerateResult)
def generate_design(request: GenerateRequest) -> GenerateResult:
    try:
        result = generate_part(request.spec, request.project_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return GenerateResult(
        project_id=result.project_id,
        files={"stl_url": f"/api/projects/{result.project_id}/stl"},
        bounding_box_mm=result.bounding_box_mm,
        parameters_used=result.parameters_used,
        warnings=result.warnings,
    )


@router.get("/projects/{project_id}/stl")
def download_stl(project_id: str):
    from fastapi.responses import FileResponse

    path = __import__("pathlib").Path(__file__).resolve().parents[2] / "output" / project_id / "design.stl"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="STL not found")
    return FileResponse(path, media_type="model/stl", filename=f"{project_id}.stl")


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
