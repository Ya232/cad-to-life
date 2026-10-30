from datetime import datetime
from enum import Enum

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
