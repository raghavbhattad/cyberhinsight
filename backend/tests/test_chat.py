import pytest
import json
from pathlib import Path
from unittest.mock import MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.models.schemas import ChatRequest, ChatResponse
from app.services.router import deterministic_intent_check, route_intent
from app.services.chat_store import ChatStore
from app.services.chat_orchestrator import ChatOrchestrator
from app.services.agent import SecurityAgent
from app.services.incidents import IncidentStore
from tests.conftest import FakeLLM, FakeMemory


@pytest.fixture
def temp_chat_store(tmp_path):
    store_file = tmp_path / "test_conversations.json"
    return ChatStore(path=store_file)


@pytest.fixture
def temp_incident_store(tmp_path):
    store_file = tmp_path / "test_incidents.json"
    return IncidentStore(path=store_file)


@pytest.mark.asyncio
async def test_router_mappings():
    """Verify router maps sample queries accurately across all 4 intents."""
    # 1. Investigate: alerts with indicators, processes, extensions
    inv_msg1 = "Finance user opened invoice_7482.docm and observed PowerShell beaconed to 198.51.100.45"
    inv_msg2 = "Alert: malware detected on FIN-WS-042 connecting to 203.0.113.88"
    intent1, _ = deterministic_intent_check(inv_msg1)
    intent2, _ = deterministic_intent_check(inv_msg2)
    assert intent1 == "investigate"
    assert intent2 == "investigate"

    # 2. Ask history: queries about past incidents, seen before, what worked
    hist_msg1 = "Have we seen 198.51.100.45 before in prior incidents?"
    hist_msg2 = "What worked last time for phishing in Finance?"
    hist_msg3 = "Which hosts were affected by the ransomware campaign?"
    intent_h1, _ = deterministic_intent_check(hist_msg1)
    intent_h2, _ = deterministic_intent_check(hist_msg2)
    intent_h3, _ = deterministic_intent_check(hist_msg3)
    assert intent_h1 == "ask_history"
    assert intent_h2 == "ask_history"
    assert intent_h3 == "ask_history"

    # 3. Teach: analyst notes, feedback, outcomes
    teach_msg1 = "Remember that FIN-WS-042 is the CFO's laptop, treat as high priority"
    teach_msg2 = "Note that endpoint isolation worked"
    teach_msg3 = "FYI that was a false positive"
    intent_t1, _ = deterministic_intent_check(teach_msg1)
    intent_t2, _ = deterministic_intent_check(teach_msg2)
    intent_t3, _ = deterministic_intent_check(teach_msg3)
    assert intent_t1 == "teach"
    assert intent_t2 == "teach"
    assert intent_t3 == "teach"

    # 4. General / LLM fallback
    gen_msg = "What is MITRE technique T1566.001?"
    fake_llm = FakeLLM()
    # Mock LLM fallback returning general
    fake_llm.analyze_json = MagicMock(return_value={"intent": "general", "reason": "General question"})
    intent_g, _ = await route_intent(gen_msg, fake_llm)
    assert intent_g == "general"


@pytest.mark.asyncio
async def test_ask_history_empty_recall(temp_chat_store, temp_incident_store):
    """When recall is empty, ask_history returns a clear 'no record' message without calling LLM to invent facts."""
    fake_memory = FakeMemory(recall_results=[])
    fake_llm = FakeLLM()
    agent = SecurityAgent(fake_llm, fake_memory)
    orchestrator = ChatOrchestrator(
        agent=agent,
        memory_service=fake_memory,
        llm_service=fake_llm,
        incident_store=temp_incident_store,
        chat_store=temp_chat_store,
    )

    req = ChatRequest(
        message="Have we seen 198.51.100.99 before?",
        use_memory=True,
    )
    resp = await orchestrator.process_chat(req)

    assert resp.intent == "ask_history"
    assert resp.memory_used is False
    assert resp.sources == []
    assert "no record" in resp.answer.lower()
    # FakeLLM text generate should NOT have been called with memory
    assert fake_llm.call_count == 0


@pytest.mark.asyncio
async def test_ask_history_with_recalled_memory(temp_chat_store, temp_incident_store):
    """When memories exist, ask_history injects them into the prompt inside <memory> tags and returns sources."""
    fake_memory = FakeMemory(recall_results=[
        {
            "text": "Incident DEMO-001: FIN-WS-042 beaconed to 198.51.100.45. Isolated endpoint successfully.",
            "document_id": "DEMO-001",
            "score": 0.88,
            "tags": ["incident", "cat:phishing"],
        }
    ])
    fake_llm = FakeLLM()
    agent = SecurityAgent(fake_llm, fake_memory)
    orchestrator = ChatOrchestrator(
        agent=agent,
        memory_service=fake_memory,
        llm_service=fake_llm,
        incident_store=temp_incident_store,
        chat_store=temp_chat_store,
    )

    req = ChatRequest(
        message="Have we seen 198.51.100.45 in past incidents?",
        use_memory=True,
    )
    resp = await orchestrator.process_chat(req)

    assert resp.intent == "ask_history"
    assert resp.memory_used is True
    assert len(resp.sources) == 1
    assert resp.sources[0].id == "DEMO-001"
    assert "<memory>" in fake_llm.last_user_prompt
    assert "DEMO-001" in fake_llm.last_user_prompt
    assert "Answer ONLY from the <memory> below" in fake_llm.last_system_prompt


@pytest.mark.asyncio
async def test_teach_retains_memory(temp_chat_store, temp_incident_store):
    """Teaching retains exactly one memory in Hindsight with appropriate tags, while general questions retain nothing."""
    fake_memory = FakeMemory()
    fake_llm = FakeLLM()
    agent = SecurityAgent(fake_llm, fake_memory)
    orchestrator = ChatOrchestrator(
        agent=agent,
        memory_service=fake_memory,
        llm_service=fake_llm,
        incident_store=temp_incident_store,
        chat_store=temp_chat_store,
    )

    # 1. Teach request
    req_teach = ChatRequest(
        message="Remember that FIN-WS-042 is the CFO's laptop, treat as high priority",
        use_memory=True,
    )
    resp_teach = await orchestrator.process_chat(req_teach)
    assert resp_teach.intent == "teach"
    assert resp_teach.memory_saved is True
    assert len(fake_memory.retained_items) == 1
    assert "analyst_note" in fake_memory.retained_items[0]["tags"]
    assert "CFO" in fake_memory.retained_items[0]["content"]

    # 2. General request retains nothing
    req_gen = ChatRequest(
        message="What is standard isolation protocol?",
        use_memory=True,
    )
    resp_gen = await orchestrator.process_chat(req_gen)
    assert resp_gen.memory_saved is False
    assert len(fake_memory.retained_items) == 1  # Still 1, nothing added


@pytest.mark.asyncio
async def test_teach_influences_subsequent_answer(temp_chat_store, temp_incident_store):
    """Proves with fakes that a taught note/feedback gets recalled in later investigations, changing the prompt context."""
    fake_memory = FakeMemory()
    fake_llm = FakeLLM()
    agent = SecurityAgent(fake_llm, fake_memory)
    orchestrator = ChatOrchestrator(
        agent=agent,
        memory_service=fake_memory,
        llm_service=fake_llm,
        incident_store=temp_incident_store,
        chat_store=temp_chat_store,
    )

    # Step 1: Analyst teaches a critical fact
    teach_req = ChatRequest(
        message="Remember that FIN-WS-042 is the CFO's laptop, treat as high priority",
        use_memory=True,
    )
    teach_resp = await orchestrator.process_chat(teach_req)
    assert teach_resp.memory_saved is True
    retained_item = fake_memory.retained_items[0]

    # Step 2: Make FakeMemory recall the newly taught memory
    fake_memory.recall_results = [{
        "text": retained_item["content"],
        "document_id": retained_item["document_id"],
        "score": 0.95,
        "tags": retained_item["tags"],
    }]

    # Step 3: Next investigation query for the same asset
    inv_req = ChatRequest(
        message="Alert observed on FIN-WS-042 connecting to 198.51.100.45 with PowerShell",
        use_memory=True,
    )
    inv_resp = await orchestrator.process_chat(inv_req)

    # Assert that the prompt now contains the taught note inside <memory>
    assert "CFO's laptop" in fake_llm.last_user_prompt
    assert "<memory>" in fake_llm.last_user_prompt
    assert inv_resp.memory_used is True


@pytest.mark.asyncio
async def test_investigate_baseline_does_not_retain(temp_chat_store, temp_incident_store):
    """Investigation with use_memory=False (baseline) does not retain or store in history."""
    fake_memory = FakeMemory()
    fake_llm = FakeLLM()
    agent = SecurityAgent(fake_llm, fake_memory)
    orchestrator = ChatOrchestrator(
        agent=agent,
        memory_service=fake_memory,
        llm_service=fake_llm,
        incident_store=temp_incident_store,
        chat_store=temp_chat_store,
    )

    req = ChatRequest(
        message="Observed malware alert on FIN-WS-042 connecting to 198.51.100.45 with PowerShell",
        use_memory=False,
    )
    resp = await orchestrator.process_chat(req)

    assert resp.intent == "investigate"
    assert resp.memory_saved is False
    assert resp.report is not None
    assert resp.report.is_baseline is True
    # Verify not retained in Hindsight
    assert len(fake_memory.retained_items) == 0
    # Verify not added to persistent incident store
    assert len(temp_incident_store.get_all()) == 0


@pytest.mark.asyncio
async def test_investigate_failure_no_retain(temp_chat_store, temp_incident_store):
    """If LLM fails during investigation, nothing is retained and friendly error is returned."""
    fake_memory = FakeMemory()
    fake_llm = FakeLLM(should_fail=True)
    agent = SecurityAgent(fake_llm, fake_memory)
    orchestrator = ChatOrchestrator(
        agent=agent,
        memory_service=fake_memory,
        llm_service=fake_llm,
        incident_store=temp_incident_store,
        chat_store=temp_chat_store,
    )

    req = ChatRequest(
        message="Observed malware alert on FIN-WS-042 connecting to 198.51.100.45 with PowerShell",
        use_memory=True,
    )
    resp = await orchestrator.process_chat(req)

    assert "couldn't reach the analysis model" in resp.answer
    assert resp.memory_saved is False
    assert len(fake_memory.retained_items) == 0


@pytest.mark.asyncio
async def test_chat_turn_truncation_cap(temp_chat_store):
    """ChatStore caps retrieved history turns at 20."""
    conv_id = "test-conv-cap"
    for i in range(35):
        temp_chat_store.add_message(conv_id, {"role": "user", "content": f"Turn {i}"})

    all_turns = temp_chat_store.get(conv_id)
    assert len(all_turns) == 35

    last_20 = temp_chat_store.get_last_turns(conv_id, max_turns=20)
    assert len(last_20) == 20
    assert last_20[0]["content"] == "Turn 15"
    assert last_20[-1]["content"] == "Turn 34"


def test_chat_sse_stream_events(client=None):
    """Test that /api/chat/stream emits status, token, and final events in order."""
    client = TestClient(app)
    req_body = {
        "message": "Have we seen 198.51.100.45 before in prior incidents?",
        "use_memory": True,
    }
    with client.stream("POST", "/api/chat/stream", json=req_body) as response:
        assert response.status_code == 200
        events = []
        for line in response.iter_lines():
            if line.startswith("event:"):
                events.append(line.split(":", 1)[1].strip())

        assert "status" in events
        assert "final" in events
        # Verify status comes before final
        first_status_idx = events.index("status")
        final_idx = events.index("final")
        assert first_status_idx < final_idx
