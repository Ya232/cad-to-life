from pathlib import Path

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
