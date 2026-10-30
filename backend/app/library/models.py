from enum import Enum

from pydantic import BaseModel, Field, HttpUrl


class ComponentCategory(str, Enum):
    mcu_board = "mcu_board"
    display = "display"
    sensor = "sensor"
    battery_holder = "battery_holder"
    actuator = "actuator"
    connector = "connector"
    fastener = "fastener"
    other = "other"


class Dimensions(BaseModel):
    length: float = Field(gt=0, le=1000)
    width: float = Field(gt=0, le=1000)
    height: float = Field(gt=0, le=1000)


class MountingHole(BaseModel):
    x: float = Field(ge=0, le=1000)
    y: float = Field(ge=0, le=1000)
    diameter: float = Field(gt=0, le=100)


class Port(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    type: str = Field(min_length=1, max_length=80)
    side: str
    offset_mm: float = Field(ge=0, le=1000)
    width_mm: float = Field(gt=0, le=1000)
    height_mm: float = Field(gt=0, le=1000)


class ComponentSource(BaseModel):
    url: HttpUrl
    document: str = Field(min_length=1, max_length=200)
    page: str = Field(min_length=1, max_length=40)


class Component(BaseModel):
    id: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    name: str = Field(min_length=1, max_length=160)
    category: ComponentCategory
    manufacturer: str = Field(min_length=1, max_length=160)
    dimensions_mm: Dimensions
    mounting_holes: list[MountingHole] = Field(default_factory=list)
    ports: list[Port] = Field(default_factory=list)
    source: ComponentSource
    verified: bool = False
    verified_by: str | None = None
    notes: str = ""

