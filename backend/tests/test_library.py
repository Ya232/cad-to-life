import json

import pytest
from fastapi.testclient import TestClient

from app.library.loader import find_component, load_components
from app.main import app


def test_seed_component_has_source_and_dimensions() -> None:
    matches = find_component("ESP32 DevKitC")
    assert matches
    component, score = matches[0]
    assert component.dimensions_mm.length > 0
    assert component.source.url
    assert score > 50


def test_loader_rejects_missing_source(tmp_path) -> None:
    path = tmp_path / "components.json"
    path.write_text(
        json.dumps(
            [
                {
                    "id": "bad-component",
                    "name": "Bad",
                    "category": "other",
                    "manufacturer": "Test",
                    "dimensions_mm": {"length": 1, "width": 1, "height": 1},
                    "source": None,
                }
            ]
        ),
        encoding="utf-8",
    )
    with pytest.raises(ValueError):
        load_components(path)


def test_component_endpoints() -> None:
    client = TestClient(app)
    response = client.get("/api/components", params={"search": "ESP32"})
    assert response.status_code == 200
    assert response.json()[0]["id"] == "esp32-devkitc-v4-example"
