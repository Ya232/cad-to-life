from datetime import datetime
from enum import Enum
from typing import Annotated, Literal, Union

from pydantic import BaseModel, Field


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
    basic_dimension_warnings: list[str]


class Project(DesignPreview):
    id: str
    created_at: datetime


class ComponentRef(BaseModel):
    query: str = Field(min_length=1, max_length=200)
    library_id: str | None = None
    confidence: float = Field(ge=0, le=1)


class DesignConstraints(BaseModel):
    usb_access: bool = False
    mounting: Literal["none", "wall", "screws"] = "none"
    waterproof: bool = False
    max_size_mm: tuple[float, float, float] | None = None
    notes: str = ""


class DesignSpec(BaseModel):
    part_type: PartType
    name: str = Field(min_length=1, max_length=120)
    components: list[ComponentRef] = Field(default_factory=list)
    constraints: DesignConstraints = Field(default_factory=DesignConstraints)
    parameters: dict[str, float] = Field(default_factory=dict)
    language: Literal["fr", "en"]


class ClarificationQuestion(BaseModel):
    id: str = Field(min_length=1, max_length=80)
    text: str = Field(min_length=1, max_length=500)
    options: list[str] = Field(min_length=2, max_length=4)


class AnalyzeNeedsClarification(BaseModel):
    status: Literal["needs_clarification"]
    questions: list[ClarificationQuestion] = Field(min_length=1, max_length=8)


class AnalyzeReady(BaseModel):
    status: Literal["ready"]
    spec: DesignSpec


AnalyzeResponse = Annotated[
    Union[AnalyzeNeedsClarification, AnalyzeReady],
    Field(discriminator="status"),
]


class AnalyzeRequest(BaseModel):
    description: str = Field(min_length=1, max_length=4000)
    language: Literal["fr", "en"] = "en"
    answers: dict[str, str] | None = None
