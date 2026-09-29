import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.agent import SecurityAgent
from app.services.incidents import IncidentStore
from app.config import settings
from tests.conftest import FakeLLM, FakeMemory


@pytest.fixture
def test_app():
    """Setup app with fake services for testing routes without real APIs."""
    fake_llm = FakeLLM()
    fake_memory = FakeMemory()
    agent = SecurityAgent(fake_llm, fake_memory)
    incident_store = IncidentStore()

    app.state.agent = agent
    app.state.memory_service = fake_memory
    app.state.incident_store = incident_store
    app.state.groq_service = fake_llm

    return app, fake_llm, fake_memory, incident_store


@pytest.mark.asyncio
async def test_feedback_retains_outcome_doc(test_app):
    """Test 4: POST /api/incidents/{id}/feedback retains an outcome document with right tags."""
    app_instance, fake_llm, fake_memory, store = test_app

    # Seed an incident first
    store.add({
        "id": "test-inc-001",
        "incident": {"category": "Phishing", "affected_asset": "FIN-WS-042"},
        "analysis": {},
    })

    feedback_payload = {
        "outcome": "effective",
        "actions_taken": ["Endpoint isolated", "Credentials reset"],
        "what_worked": "Quick isolation stopped the spread",
        "what_failed": "",
        "analyst_notes": "Well handled by Tier 1",
    }

    transport = ASGITransport(app=app_instance)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/incidents/test-inc-001/feedback", json=feedback_payload)

    assert resp.status_code == 200
    assert resp.json()["retained"] is True

    # Check that FakeMemory received the outcome doc
    assert len(fake_memory.retained_items) == 1
    retained = fake_memory.retained_items[0]
    assert retained["document_id"] == "test-inc-001-outcome"
    assert "outcome" in retained["tags"]
    assert "outcome:effective" in retained["tags"]
    assert "cat:phishing" in retained["tags"]
    assert "Result: effective" in retained["content"]


@pytest.mark.asyncio
async def test_webhook_normalisation(test_app):
    """Test 7: POST /api/ingest/alert normalises SIEM payload to description and calls investigate."""
    app_instance, fake_llm, fake_memory, store = test_app

    alert_payload = {
        "source": "sentinel",
        "rule_name": "Suspicious PowerShell spawned by Office",
        "severity": "critical",
        "host": "FIN-WS-042",
        "user": "j.doe",
        "department": "Finance",
        "src_ip": "10.10.4.22",
        "dst_ip": "198.51.100.45",
        "process_tree": "WINWORD.EXE > powershell.exe -ep bypass",
        "timestamp": "2026-09-25T14:30:00Z",
        "raw": "EventID=4688",
    }

    transport = ASGITransport(app=app_instance)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/ingest/alert", json=alert_payload)

    assert resp.status_code == 200
    data = resp.json()
    assert data["incident"]["summary"] != ""
    assert fake_llm.call_count == 1
    # Check that normalized text contains key alert details
    assert "FIN-WS-042" in fake_llm.last_user_prompt
    assert "198.51.100.45" in fake_llm.last_user_prompt


@pytest.mark.asyncio
async def test_auth_rejection_when_key_configured(test_app):
    """Test 8: With APP_API_KEY set, write endpoints without the header return 401."""
    app_instance, _, _, _ = test_app

    # Temporarily set APP_API_KEY
    original_key = settings.APP_API_KEY
    settings.APP_API_KEY = "super-secret-key-123"

    try:
        transport = ASGITransport(app=app_instance)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # Without key -> 401
            resp = await client.post(
                "/api/incidents/investigate",
                json={"description": "Test incident", "use_memory": False},
            )
            assert resp.status_code == 401

            # With wrong key -> 401
            resp = await client.post(
                "/api/incidents/investigate",
                json={"description": "Test incident", "use_memory": False},
                headers={"X-API-Key": "wrong-key"},
            )
            assert resp.status_code == 401

            # With right key -> 200
            resp = await client.post(
                "/api/incidents/investigate",
                json={"description": "Test incident", "use_memory": False},
                headers={"X-API-Key": "super-secret-key-123"},
            )
            assert resp.status_code == 200
    finally:
        settings.APP_API_KEY = original_key


@pytest.mark.asyncio
async def test_oversize_input_rejected(test_app):
    """Test 9: Incident description exceeding MAX_INCIDENT_CHARS is rejected with 422."""
    app_instance, _, _, _ = test_app

    oversize_description = "A" * (settings.MAX_INCIDENT_CHARS + 100)

    transport = ASGITransport(app=app_instance)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/incidents/investigate",
            json={"description": oversize_description, "use_memory": False},
        )

    assert resp.status_code == 422
    assert "exceeds maximum length" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_empty_description_rejected(test_app):
    """Empty description should be rejected with 422."""
    app_instance, _, _, _ = test_app

    transport = ASGITransport(app=app_instance)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/incidents/investigate",
            json={"description": "   ", "use_memory": False},
        )

    assert resp.status_code == 422
