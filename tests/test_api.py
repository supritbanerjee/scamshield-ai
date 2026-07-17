"""Small API smoke suite. Run with: pytest -q"""
import os
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND))

os.environ["SCAMSHIELD_DB"] = str(Path(__file__).with_name("test_scans.db"))

from app import app  # noqa: E402


def test_health():
    client = app.test_client()
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.get_json()["status"] == "ok"


def test_scam_analysis_is_explainable():
    client = app.test_client()
    response = client.post("/api/analyze", json={
        "message": "Urgent! Your bank KYC expires today. Click http://bit.ly/fake and share OTP now."
    })
    body = response.get_json()
    assert response.status_code == 201
    assert body["verdict"] == "SCAM"
    assert body["confidence"] >= 50
    assert len(body["signals"]) >= 1


def test_legitimate_message_and_history():
    client = app.test_client()
    response = client.post("/api/analyze", json={
        "message": "Hi, are we still meeting at the college library at 6 pm?"
    })
    assert response.status_code == 201
    assert response.get_json()["verdict"] == "LEGIT"

    history = client.get("/api/history")
    assert history.status_code == 200
    assert history.get_json()["summary"]["total"] >= 1


def test_empty_message_is_rejected():
    client = app.test_client()
    response = client.post("/api/analyze", json={"message": ""})
    assert response.status_code == 400
    assert "error" in response.get_json()
