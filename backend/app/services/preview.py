from ..models import DesignPreview, DesignRequest


def build_preview(request: DesignRequest) -> DesignPreview:
    warnings: list[str] = []
    if min(request.width_mm, request.depth_mm, request.height_mm) < 10:
        warnings.append("At least one dimension is below 10 mm.")
    if request.part_type.value == "enclosure" and min(request.width_mm, request.depth_mm) < 20:
        warnings.append("This enclosure may not leave enough room for components.")
    if request.part_type.value == "spacer" and request.height_mm < 3:
        warnings.append("This spacer may be too short to print reliably.")

    return DesignPreview(
        **request.model_dump(),
        wall_thickness_mm=2.0,
        basic_dimension_warnings=warnings,
    )
