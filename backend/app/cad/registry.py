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


def _front_wall(
    outer: tuple[float, float, float],
    wall: float,
    floor: float,
    port_width: float | None = None,
    port_height: float | None = None,
) -> list[trimesh.Trimesh]:
    outer_x, outer_y, outer_z = outer
    wall_height = outer_z - floor
    if not port_width or not port_height:
        return [_box((outer_x - 2 * wall, wall, wall_height), (outer_x / 2, wall / 2, floor + wall_height / 2))]

    opening_width = min(port_width + 2.0, outer_x - 4 * wall)
    opening_height = min(port_height + 2.0, wall_height - 2 * wall)
    opening_left = (outer_x - opening_width) / 2
    opening_bottom = floor + (wall_height - opening_height) / 2
    pieces: list[trimesh.Trimesh] = []
    if opening_left > 0:
        pieces.append(_box((opening_left, wall, wall_height), (opening_left / 2, wall / 2, floor + wall_height / 2)))
    right_width = outer_x - wall - (opening_left + opening_width)
    if right_width > 0:
        pieces.append(
            _box(
                (right_width, wall, wall_height),
                (opening_left + opening_width + right_width / 2, wall / 2, floor + wall_height / 2),
            )
        )
    if opening_height < wall_height:
        pieces.append(
            _box(
                (opening_width, wall, opening_bottom - floor),
                (opening_left + opening_width / 2, wall / 2, floor + (opening_bottom - floor) / 2),
            )
        )
        top_height = outer_z - (opening_bottom + opening_height)
        if top_height > 0:
            pieces.append(
                _box(
                    (opening_width, wall, top_height),
                    (opening_left + opening_width / 2, wall / 2, opening_bottom + opening_height + top_height / 2),
                )
            )
    return pieces


def _component_supports(
    components: list[Component],
    outer: tuple[float, float, float],
    wall: float,
    floor: float,
    clearance: float,
) -> tuple[list[trimesh.Trimesh], int, bool]:
    supports: list[trimesh.Trimesh] = []
    estimated = False
    y_cursor = wall + clearance
    support_height = min(3.0, max(1.0, outer[2] - floor - 4.0))
    for component in components:
        length = component.dimensions_mm.length
        width = component.dimensions_mm.width
        origin_x = wall + clearance
        origin_y = y_cursor
        if component.mounting_holes:
            for hole in component.mounting_holes:
                supports.append(
                    trimesh.creation.annulus(
                        r_min=max(0.5, hole.diameter / 2),
                        r_max=hole.diameter / 2 + 1.5,
                        height=support_height,
                        sections=32,
                    )
                )
                supports[-1].apply_translation(
                    (origin_x + hole.x, origin_y + hole.y, floor + support_height / 2)
                )
        else:
            estimated = True
            pad_size = 5.0
            for x in (origin_x + 1.0, origin_x + length - pad_size - 1.0):
                for y in (origin_y + 1.0, origin_y + width - pad_size - 1.0):
                    supports.append(
                        _box(
                            (pad_size, pad_size, support_height),
                            (x + pad_size / 2, y + pad_size / 2, floor + support_height / 2),
                        )
                    )
        y_cursor += width + 2 * clearance
    return supports, len(supports), estimated


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
        inner_z = max(30.0, max(component.dimensions_mm.height for component in components) + clearance)
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
    usb_port = next(
        (
            port
            for component in components
            for port in component.ports
            if port.type.lower() in {"usb", "micro-usb", "usb-c"}
        ),
        None,
    )
    supports, support_count, estimated_supports = _component_supports(
        components, outer, wall, floor, clearance
    )
    meshes = [
        _box((outer[0], outer[1], floor), (outer[0] / 2, outer[1] / 2, floor / 2)),
        _box((wall, outer[1], height - floor), (wall / 2, outer[1] / 2, floor + (height - floor) / 2)),
        _box((wall, outer[1], height - floor), (outer[0] - wall / 2, outer[1] / 2, floor + (height - floor) / 2)),
        *_front_wall(
            outer,
            wall,
            floor,
            usb_port.width_mm if spec.constraints.usb_access and usb_port else None,
            usb_port.height_mm if spec.constraints.usb_access and usb_port else None,
        ),
        _box((outer[0] - 2 * wall, wall, height - floor), (outer[0] / 2, outer[1] - wall / 2, floor + (height - floor) / 2)),
        *supports,
    ]
    parameters = {
        "wall_thickness_mm": wall,
        "floor_thickness_mm": floor,
        "clearance_mm": clearance,
    }
    if usb_port and spec.constraints.usb_access:
        parameters["usb_cutout_width_mm"] = min(usb_port.width_mm + 2.0, outer[0] - 4 * wall)
        parameters["usb_cutout_height_mm"] = min(usb_port.height_mm + 2.0, height - floor - 2 * wall)
    if components:
        parameters["component_support_count"] = float(support_count)
        parameters["component_support_height_mm"] = min(3.0, max(1.0, height - floor - 4.0))
    return meshes, parameters, outer


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
        has_usb_port = any(
            component_store.get(reference.library_id)
            and any(
                port.type.lower() in {"usb", "micro-usb", "usb-c"}
                for port in component_store.get(reference.library_id).ports
            )
            for reference in spec.components
            if reference.library_id
        )
        if not has_usb_port:
            warnings.append("USB access was requested but no USB port is available in the component library.")
    if spec.part_type == PartType.enclosure and spec.components:
        if any(
            component_store.get(reference.library_id)
            and not component_store.get(reference.library_id).mounting_holes
            for reference in spec.components
            if reference.library_id
        ):
            warnings.append("Some component supports are estimated because mounting-hole data is unavailable.")
    if spec.part_type == PartType.enclosure and spec.constraints.waterproof:
        warnings.append("Waterproofing is requested but the current enclosure is open-top.")
    return GeneratedPart(
        project_id=project_id,
        path=path,
        bounding_box_mm=tuple(float(value) for value in bounds),
        parameters_used=parameters,
        warnings=warnings,
    )
