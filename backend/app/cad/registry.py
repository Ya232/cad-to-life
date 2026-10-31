from dataclasses import dataclass
from pathlib import Path
from uuid import uuid4

import numpy as np
import trimesh

from ..library import Component, component_store
from ..models import DesignSpec, PartType

OUTPUT_ROOT = Path(__file__).resolve().parents[2] / "output"


@dataclass(frozen=True)
class GeneratedPart:
    project_id: str
    path: Path
    bounding_box_mm: tuple[float, float, float]
    parameters_used: dict[str, float]
    warnings: list[str]


def _box(size: tuple[float, float, float], center: tuple[float, float, float]) -> trimesh.Trimesh:
    mesh = trimesh.creation.box(extents=size)
    mesh.apply_translation(center)
    return mesh


def _component_warnings(spec: DesignSpec) -> list[str]:
    warnings: list[str] = []
    for reference in spec.components:
        component: Component | None = (
            component_store.get(reference.library_id)
            if reference.library_id
            else None
        )
        if component is None:
            warnings.append(f"Component '{reference.query}' has no library dimensions.")
        elif not component.verified:
            warnings.append(f"Component '{component.name}' is unverified.")
    return warnings


def _enclosure(spec: DesignSpec) -> tuple[list[trimesh.Trimesh], dict[str, float], tuple[float, float, float]]:
    wall = float(spec.parameters.get("wall_thickness_mm", 2.0))
    floor = float(spec.parameters.get("floor_thickness_mm", 2.0))
    clearance = float(spec.parameters.get("clearance_mm", 1.0))
    if not 1.0 <= wall <= 10 or not 1.0 <= floor <= 10 or not 0.1 <= clearance <= 10:
        raise ValueError("wall_thickness_mm, floor_thickness_mm, and clearance_mm are out of range.")

    components = [
        component_store.get(reference.library_id)
        for reference in spec.components
        if reference.library_id
    ]
    components = [component for component in components if component is not None]
    if components:
        inner_x = max(component.dimensions_mm.length + 2 * clearance for component in components)
        inner_y = sum(component.dimensions_mm.width + 2 * clearance for component in components)
        inner_z = max(component.dimensions_mm.height for component in components) + clearance
    else:
        inner_x, inner_y, inner_z = 80.0, 50.0, 30.0
    if spec.constraints.max_size_mm:
        max_x, max_y, max_z = spec.constraints.max_size_mm
        required_outer = (inner_x + 2 * wall, inner_y + 2 * wall, inner_z + floor)
        if any(required > limit for required, limit in zip(required_outer, spec.constraints.max_size_mm)):
            raise ValueError(
                "max_size_mm is too small for the requested components and clearances."
            )

    outer = (inner_x + 2 * wall, inner_y + 2 * wall, inner_z + floor)
    height = outer[2]
    meshes = [
        _box((outer[0], outer[1], floor), (outer[0] / 2, outer[1] / 2, floor / 2)),
        _box((wall, outer[1], height - floor), (wall / 2, outer[1] / 2, floor + (height - floor) / 2)),
        _box((wall, outer[1], height - floor), (outer[0] - wall / 2, outer[1] / 2, floor + (height - floor) / 2)),
        _box((outer[0] - 2 * wall, wall, height - floor), (outer[0] / 2, wall / 2, floor + (height - floor) / 2)),
        _box((outer[0] - 2 * wall, wall, height - floor), (outer[0] / 2, outer[1] - wall / 2, floor + (height - floor) / 2)),
    ]
    return meshes, {
        "wall_thickness_mm": wall,
        "floor_thickness_mm": floor,
        "clearance_mm": clearance,
    }, outer


def _simple_part(spec: DesignSpec) -> tuple[list[trimesh.Trimesh], dict[str, float], tuple[float, float, float]]:
    if spec.part_type == PartType.spacer:
        outer_d = float(spec.parameters.get("outer_diameter_mm", 12.0))
        height = float(spec.parameters.get("height_mm", 10.0))
        inner_d = float(spec.parameters.get("inner_diameter_mm", 4.0))
        if not 2 <= inner_d < outer_d <= 200 or not 1 <= height <= 200:
            raise ValueError("Spacer parameters are out of range.")
        mesh = trimesh.creation.annulus(
            r_min=inner_d / 2,
            r_max=outer_d / 2,
            height=height,
            sections=48,
        )
        return [mesh], {"outer_diameter_mm": outer_d, "inner_diameter_mm": inner_d, "height_mm": height}, (outer_d, outer_d, height)

    width = float(spec.parameters.get("width_mm", 80.0))
    depth = float(spec.parameters.get("depth_mm", 50.0))
    height = float(spec.parameters.get("height_mm", 4.0))
    if not 1 <= width <= 1000 or not 1 <= depth <= 1000 or not 1 <= height <= 200:
        raise ValueError("Part dimensions are out of range.")
    return [_box((width, depth, height), (width / 2, depth / 2, height / 2))], {
        "width_mm": width,
        "depth_mm": depth,
        "height_mm": height,
    }, (width, depth, height)


def generate_part(spec: DesignSpec, project_id: str | None = None) -> GeneratedPart:
    project_id = project_id or str(uuid4())
    if spec.part_type == PartType.enclosure:
        meshes, parameters, bounds = _enclosure(spec)
    else:
        meshes, parameters, bounds = _simple_part(spec)
    combined = trimesh.util.concatenate(meshes)
    actual_bounds = tuple(float(value) for value in combined.bounding_box.extents)
    if not combined.is_watertight:
        raise ValueError("Generated geometry is not watertight.")
    if any(abs(actual - expected) > 0.01 for actual, expected in zip(actual_bounds, bounds)):
        raise ValueError("Generated geometry bounds do not match the requested parameters.")
    output_dir = OUTPUT_ROOT / project_id
    output_dir.mkdir(parents=True, exist_ok=True)
    path = output_dir / "design.stl"
    combined.export(path)
    warnings = _component_warnings(spec)
    if spec.part_type == PartType.enclosure and spec.constraints.usb_access:
        warnings.append("USB access is requested but port cutouts are not implemented yet.")
    if spec.part_type == PartType.enclosure and spec.constraints.waterproof:
        warnings.append("Waterproofing is requested but the current enclosure is open-top.")
    return GeneratedPart(
        project_id=project_id,
        path=path,
        bounding_box_mm=tuple(float(value) for value in bounds),
        parameters_used=parameters,
        warnings=warnings,
    )
