from fastapi.testclient import TestClient

from app.api.routes import meta_client
from app.main import app


client = TestClient(app)


def test_analyze_clarification(monkeypatch) -> None:
    monkeypatch.setattr(meta_client, "api_key", "test-key")
    monkeypatch.setattr(
        meta_client,
        "chat_json",
        lambda *args, **kwargs: {
            "status": "needs_clarification",
            "questions": [
                {
                    "id": "board",
                    "text": "Which exact board model is it?",
                    "options": ["ESP32 DevKit C", "ESP32-S3", "Other"],
                }
            ],
        },
    )
    response = client.post(
        "/api/designs/analyze",
        json={"description": "An enclosure for an ESP32", "language": "en"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "needs_clarification"


def test_analyze_ready_does_not_turn_product_number_into_dimension(monkeypatch) -> None:
    monkeypatch.setattr(meta_client, "api_key", "test-key")
    monkeypatch.setattr(
        meta_client,
        "chat_json",
        lambda *args, **kwargs: {
            "status": "ready",
            "spec": {
                "part_type": "enclosure",
                "name": "ESP32 enclosure",
                "components": [
                    {"query": "ESP32 DevKit", "library_id": None, "confidence": 0.8}
                ],
                "constraints": {
                    "usb_access": True,
                    "mounting": "none",
                    "waterproof": False,
                    "max_size_mm": None,
                    "notes": "",
                },
                "parameters": {},
                "language": "en",
            },
        },
    )
    response = client.post(
        "/api/designs/analyze",
        json={"description": "An enclosure for an ESP32", "language": "en"},
    )
    assert response.status_code == 200
    assert response.json()["spec"]["parameters"] == {}
