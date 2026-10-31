from pathlib import Path

import trimesh
from fastapi.testclient import TestClient

from app.main import app


def test_generate_enclosure_and_download() -> None:
    client = TestClient(app)
    response = client.post(
        "/api/designs/generate",
        json={
            "project_id": "test-enclosure",
            "spec": {
                "part_type": "enclosure",
                "name": "Test enclosure",
                "components": [],
                "constraints": {
                    "usb_access": False,
                    "mounting": "none",
                    "waterproof": False,
                    "max_size_mm": None,
                    "notes": "",
                },
                "parameters": {
                    "wall_thickness_mm": 2,
                    "floor_thickness_mm": 2,
                    "clearance_mm": 1,
                },
                "language": "en",
            },
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["bounding_box_mm"] == [84.0, 54.0, 32.0]
    assert Path("output/test-enclosure/design.stl").is_file()
    assert client.get("/api/projects/test-enclosure/stl").status_code == 200


def test_generate_spacer_has_a_real_inner_hole() -> None:
    client = TestClient(app)
    response = client.post(
        "/api/designs/generate",
        json={
            "project_id": "test-spacer",
            "spec": {
                "part_type": "spacer",
                "name": "Test spacer",
                "components": [],
                "constraints": {},
                "parameters": {
                    "outer_diameter_mm": 12,
                    "inner_diameter_mm": 4,
                    "height_mm": 10,
                },
                "language": "en",
            },
        },
    )
    assert response.status_code == 200
    mesh = trimesh.load("output/test-spacer/design.stl")
    assert mesh.is_watertight
    assert mesh.bounding_box.extents.tolist() == [12.0, 12.0, 10.0]
    radial_distances = (mesh.vertices[:, :2] ** 2).sum(axis=1) ** 0.5
    assert radial_distances.min() >= 1.99


def test_generation_rejects_max_size_smaller_than_component() -> None:
    client = TestClient(app)
    response = client.post(
        "/api/designs/generate",
        json={
            "project_id": "test-too-small",
            "spec": {
                "part_type": "enclosure",
                "name": "Too small",
                "components": [
                    {
                        "query": "ESP32",
                        "library_id": "esp32-devkitc-v4-example",
                        "confidence": 1,
                    }
                ],
                "constraints": {
                    "max_size_mm": [20, 20, 20],
                },
                "parameters": {},
                "language": "en",
            },
        },
    )
    assert response.status_code == 422


def test_usb_access_creates_cutout_parameters() -> None:
    client = TestClient(app)
    response = client.post(
        "/api/designs/generate",
        json={
            "project_id": "test-usb-cutout",
            "spec": {
                "part_type": "enclosure",
                "name": "USB enclosure",
                "components": [
                    {
                        "query": "ESP32",
                        "library_id": "esp32-devkitc-v4-example",
                        "confidence": 1,
                    }
                ],
                "constraints": {"usb_access": True},
                "parameters": {},
                "language": "en",
            },
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["parameters_used"]["usb_cutout_width_mm"] == 9.0
    assert body["parameters_used"]["usb_cutout_height_mm"] == 6.0
    assert not any("not implemented" in warning for warning in body["warnings"])
