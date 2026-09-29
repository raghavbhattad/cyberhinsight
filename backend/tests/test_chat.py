import pytest
import json
import uuid
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock
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
    fake_llm.analyze_json = MagicMock(return_value={"intent": "general", "reason": "General question"})
    intent_g, _ = await route_intent(gen_msg, fake_llm)
    assert intent_g == "general"


@pytest.mark.asyncio
async def test_ask_history_empty_recall_and_no_local_log(temp_chat_store, temp_incident_store):
    """When recall and local log are both empty, ask_history returns a clear 'no record' message."""
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
    assert fake_llm.call_count == 0


@pytest.mark.asyncio
async def test_follow_up_after_investigate_finds_incident(temp_chat_store, temp_incident_store):
    """After an investigate turn, 'Have we seen X before?' finds the incident via recall or local log, never 'no record'."""
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

    conv_id = "test-conv-followup"

    # Turn 1: Investigate
    inv_req = ChatRequest(
        conversation_id=conv_id,
        message="Finance user opened invoice_7482.docm and PowerShell beaconed to 198.51.100.45 on FIN-WS-042",
        use_memory=True,
    )
    inv_resp = await orchestrator.process_chat(inv_req)
    assert inv_resp.intent == "investigate"
    assert inv_resp.report is not None

    # Turn 2: Follow-up question right after
    hist_req = ChatRequest(
        conversation_id=conv_id,
        message="Have we seen 198.51.100.45 before in prior incidents?",
        use_memory=True,
    )
    hist_resp = await orchestrator.process_chat(hist_req)

    assert hist_resp.intent == "ask_history"
    assert "no record" not in hist_resp.answer.lower()
    assert len(hist_resp.sources) > 0
    assert any(s.kind in ("incident", "local_log") for s in hist_resp.sources)


@pytest.mark.asyncio
async def test_pronoun_followup_resolves_last_asset(temp_chat_store, temp_incident_store):
    """Pronoun follow-ups like 'What did you recommend for that host?' resolve to the last investigate asset."""
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

    conv_id = "test-conv-pronoun"

    # Turn 1: Investigate on FIN-WS-042
    inv_req = ChatRequest(
        conversation_id=conv_id,
        message="Alert: macro execution on FIN-WS-042 downloading payload from 198.51.100.45",
        use_memory=True,
    )
    await orchestrator.process_chat(inv_req)

    # Turn 2: Pronoun inquiry about 'that host'
    hist_req = ChatRequest(
        conversation_id=conv_id,
        message="What did you recommend for that host?",
        use_memory=True,
    )
    hist_resp = await orchestrator.process_chat(hist_req)

    assert hist_resp.intent == "ask_history"
    assert "no record" not in hist_resp.answer.lower()
    # Ensure FIN-WS-042 was resolved and included in prompt/sources
    assert len(hist_resp.sources) > 0
    assert any("FIN-WS-042" in s.snippet for s in hist_resp.sources)


@pytest.mark.asyncio
async def test_relevance_floor_drops_low_score_memories(temp_chat_store, temp_incident_store):
    """Memories below MIN_RECALL_SCORE are dropped; if all are dropped and no local log, returns no record."""
    fake_memory = FakeMemory(recall_results=[
        {
            "text": "Completely unrelated memory about printer configuration",
            "document_id": "IRRELEVANT-01",
            "score": 0.05,  # below 0.15 floor
            "tags": ["incident"],
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
        message="Have we seen 203.0.113.199 before in prior incidents?",
        use_memory=True,
    )
    resp = await orchestrator.process_chat(req)

    assert resp.intent == "ask_history"
    assert resp.sources == []
    assert "no record" in resp.answer.lower()


@pytest.mark.asyncio
async def test_multi_turn_history_passed_to_llm(temp_chat_store, temp_incident_store):
    """Conversation history up to 8 turns is passed to LLM; memory block is only in final user message."""
    fake_memory = FakeMemory(recall_results=[{
        "text": "Incident DEMO-001: FIN-WS-042 isolated. Malicious connection to 198.51.100.45 observed.",
        "document_id": "DEMO-001",
        "score": 0.85,
        "tags": ["incident"],
    }])
    fake_llm = FakeLLM()
    agent = SecurityAgent(fake_llm, fake_memory)
    orchestrator = ChatOrchestrator(
        agent=agent,
        memory_service=fake_memory,
        llm_service=fake_llm,
        incident_store=temp_incident_store,
        chat_store=temp_chat_store,
    )

    conv_id = "test-conv-history-pass"
    # Seed 10 turns in store
    for i in range(10):
        role = "user" if i % 2 == 0 else "assistant"
        temp_chat_store.add_message(conv_id, {"role": role, "content": f"Turn {i}"})

    req = ChatRequest(
        conversation_id=conv_id,
        message="Have we seen 198.51.100.45 before in prior incidents?",
        use_memory=True,
    )
    await orchestrator.process_chat(req)

    # Check history passed to generate_text
    assert fake_llm.last_history is not None
    # Maximum 8 turns in history
    assert len(fake_llm.last_history) <= 8
    # Ensure memory is ONLY in last_user_prompt
    assert "<memory>" in fake_llm.last_user_prompt
    for turn in fake_llm.last_history:
        assert "<memory>" not in turn["content"]


@pytest.mark.asyncio
async def test_pattern_question_calls_reflect(temp_chat_store, temp_incident_store):
    """Pattern questions ('what worked', 'trend') invoke reflect_patterns and include observation source."""
    fake_memory = FakeMemory(recall_results=[{
        "text": "Incident DEMO-001: FIN-WS-042 PowerShell containment",
        "document_id": "DEMO-001",
        "score": 0.88,
        "tags": ["incident"],
    }])
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
        message="What worked last time for phishing in Finance?",
        use_memory=True,
    )
    resp = await orchestrator.process_chat(req)

    assert resp.intent == "ask_history"
    assert "<reflection>" in fake_llm.last_user_prompt
    assert any(s.kind == "observation" for s in resp.sources)


@pytest.mark.asyncio
async def test_teach_cleanup_host_tags_and_feedback(temp_chat_store, temp_incident_store):
    """Teach cleans statement with LLM, extracts host tags, and updates incident feedback if referencing past turn."""
    fake_memory = FakeMemory()
    fake_llm = FakeLLM()
    # Mock LLM analyze_json for structured parsing
    fake_llm.analyze_json = AsyncMock(return_value={
        "kind": "analyst_note",
        "text": "FIN-WS-042 is the CFO laptop and must be treated as critical priority",
        "entities": ["FIN-WS-042"],
        "incident_ref": None,
    })
    agent = SecurityAgent(fake_llm, fake_memory)
    orchestrator = ChatOrchestrator(
        agent=agent,
        memory_service=fake_memory,
        llm_service=fake_llm,
        incident_store=temp_incident_store,
        chat_store=temp_chat_store,
    )

    req = ChatRequest(
        message="Remember that FIN-WS-042 is the CFO's laptop, treat as high priority",
        use_memory=True,
    )
    resp = await orchestrator.process_chat(req)

    assert resp.intent == "teach"
    assert resp.memory_saved is True
    assert len(fake_memory.retained_items) == 1
    retained = fake_memory.retained_items[0]
    assert "host:fin-ws-042" in retained["tags"]
    assert "CFO laptop" in retained["content"]


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
    assert len(fake_memory.retained_items) == 0
    assert len(temp_incident_store.get_all()) == 0


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
        first_status_idx = events.index("status")
        final_idx = events.index("final")
        assert first_status_idx < final_idx


# ==============================================================================
# FIX ROUND 3 TESTS
# ==============================================================================

@pytest.mark.asyncio
async def test_ask_have_we_seen_after_investigate_ignores_irrelevant_recall(temp_chat_store, temp_incident_store):
    """Test 1: Ask 'Have we seen 203.0.113.77 before?' right after investigating it,
    with a fake memory returning 8 irrelevant memories -> answer cites the just-investigated
    incident via the local log; chip is not 'used 8'."""
    # Fake memory returns 8 completely irrelevant memories
    irrelevant_memories = [
        {"document_id": f"IRR-{i}", "text": f"Printer paper jam on PRN-{i} in Bldg B", "score": 0.95, "tags": ["it"]}
        for i in range(8)
    ]
    fake_memory = FakeMemory(recall_results=irrelevant_memories)
    fake_llm = FakeLLM()
    agent = SecurityAgent(fake_llm, fake_memory)
    orchestrator = ChatOrchestrator(
        agent=agent,
        memory_service=fake_memory,
        llm_service=fake_llm,
        incident_store=temp_incident_store,
        chat_store=temp_chat_store,
    )

    conv_id = "test-conv-irrelevant-recall"

    # Turn 1: Investigate incident containing 203.0.113.77
    inv_req = ChatRequest(
        conversation_id=conv_id,
        message="Suspicious connection observed from workstation FIN-WS-099 to 203.0.113.77 after phishing email",
        use_memory=True,
    )
    inv_resp = await orchestrator.process_chat(inv_req)
    assert inv_resp.intent == "investigate"

    # Turn 2: Ask about the indicator
    hist_req = ChatRequest(
        conversation_id=conv_id,
        message="Have we seen 203.0.113.77 before?",
        use_memory=True,
    )
    hist_resp = await orchestrator.process_chat(hist_req)

    assert hist_resp.intent == "ask_history"
    # Must NOT say 'no record'
    assert "no record" not in hist_resp.answer.lower()
    # Must cite via local log because Hindsight returned irrelevant memories
    assert len(hist_resp.sources) > 0
    assert any(s.kind == "local_log" for s in hist_resp.sources)
    # The 8 irrelevant memories must NOT be in sources
    assert not any(s.id.startswith("IRR-") for s in hist_resp.sources)
    # Chip checked_count is 8, but sources length is local log only (not 8)
    assert len(hist_resp.sources) != 8


@pytest.mark.asyncio
async def test_lookup_question_irrelevant_recall_entity_gated(temp_chat_store, temp_incident_store):
    """Test 2: Lookup question with entities and irrelevant recall -> those memories are discarded;
    both empty -> 'no record… (checked N memories and M logged incidents)'."""
    irrelevant_memories = [
        {"document_id": f"IRR-{i}", "text": f"Printer config issue on host PRN-{i}", "score": 0.88, "tags": ["it"]}
        for i in range(5)
    ]
    fake_memory = FakeMemory(recall_results=irrelevant_memories)
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
        message="Have we seen 192.0.2.250 before?",
        use_memory=True,
    )
    resp = await orchestrator.process_chat(req)

    assert resp.intent == "ask_history"
    assert resp.memory_used is False
    assert resp.sources == []
    # Must match honest phrasing
    assert "no record" in resp.answer.lower()
    assert "checked 5 memories and 0 logged incidents" in resp.answer.lower()
    assert resp.checked_count == 5


@pytest.mark.asyncio
async def test_no_raw_uuid_in_answers_labels_used(temp_chat_store, temp_incident_store):
    """Test 3: No raw UUID appears in any answer; readable bracketed labels are used."""
    raw_uuid = "c80c547e-1f65-43ae-9b34-39e3d0b151ea"
    fake_memory = FakeMemory(recall_results=[{
        "text": f"Incident ID: {raw_uuid}\nHost: FIN-WS-042\nDepartment: Finance\nCategory: Phishing\nTimestamp: 2026-09-25T14:30:00Z\nIP: 198.51.100.45",
        "document_id": raw_uuid,
        "score": 0.92,
        "tags": ["incident", "cat:phishing"],
    }])
    fake_llm = FakeLLM()
    # LLM outputs a raw UUID citation
    fake_llm.generate_text = AsyncMock(
        return_value=f"Based on past records, see {raw_uuid} where FIN-WS-042 was isolated."
    )
    agent = SecurityAgent(fake_llm, fake_memory)
    orchestrator = ChatOrchestrator(
        agent=agent,
        memory_service=fake_memory,
        llm_service=fake_llm,
        incident_store=temp_incident_store,
        chat_store=temp_chat_store,
    )

    req = ChatRequest(
        message="Have we seen 198.51.100.45 before in prior incidents?",
        use_memory=True,
    )
    resp = await orchestrator.process_chat(req)

    assert raw_uuid not in resp.answer
    assert "[" in resp.answer and "]" in resp.answer
    assert "FIN-WS-042" in resp.answer


def test_effective_validator_rewrites_unrecorded_claims():
    """Test 4: 'Effective' appears only next to sources whose outcome status is effective;
    validator rewrites otherwise."""
    from app.services.memory_labels import sanitize_outcome_claims

    label_outcome_map = {
        "[DEMO-031 · HR · phishing]": "effective",
        "[DEMO-032 · Marketing · phishing]": "not effective",
        "[DEMO-001 · Finance · phishing]": "unknown",
    }

    # 1. Unrecorded outcome rewritten
    answer1 = "Password reset was effective in [DEMO-032 · Marketing · phishing] to mitigate the threat."
    cleaned1 = sanitize_outcome_claims(answer1, label_outcome_map)
    assert "effective in [DEMO-032 · Marketing · phishing]" not in cleaned1
    assert "was used in [DEMO-032 · Marketing · phishing]" in cleaned1

    # 2. Permitted outcome preserved
    answer2 = "Revoking consent was effective in [DEMO-031 · HR · phishing]."
    cleaned2 = sanitize_outcome_claims(answer2, label_outcome_map)
    assert "effective in [DEMO-031 · HR · phishing]" in cleaned2

    # 3. Campaign outcome claim neutralized
    answer3 = "This action proved effective in campaign CMP-d6c46589 across endpoints."
    cleaned3 = sanitize_outcome_claims(answer3, label_outcome_map)
    assert "proved effective in campaign CMP-d6c46589" not in cleaned3
    assert "observed in campaign CMP-d6c46589" in cleaned3


@pytest.mark.asyncio
async def test_no_prior_alerts_placeholder_and_campaign_count(temp_chat_store, temp_incident_store):
    """Test 5: No 'prior alerts' placeholder; campaign count uses distinct passed incidents only."""
    fake_memory = FakeMemory(recall_results=[{
        "text": "Incident DEMO-001: Host FIN-WS-042 phishing containment",
        "document_id": "DEMO-001",
        "score": 0.88,
        "tags": ["incident"],
    }])
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
        message="User in Finance on FIN-WS-042 observed malware downloading from 198.51.100.45",
        use_memory=True,
    )
    resp = await orchestrator.process_chat(req)

    assert "(e.g., prior alerts)" not in resp.answer
    assert "prior alerts" not in resp.answer.lower() or "DEMO-001" in resp.answer


@pytest.mark.asyncio
async def test_oauth_consent_message_injects_t1528_base_playbook(temp_chat_store, temp_incident_store):
    """Test 6: OAuth consent message -> prompt contains the T1528 base playbook;
    a memory of a macro incident is only used if it shares infrastructure."""
    # Memory 1: Macro incident with NO shared infrastructure
    macro_memory = {
        "text": "Incident DEMO-001: Macro execution on FIN-WS-042 via invoice.docm, IP 198.51.100.45",
        "document_id": "DEMO-001",
        "score": 0.82,
        "tags": ["incident", "cat:phishing"],
    }
    # Memory 2: OAuth incident with matching technique and shared domain
    oauth_memory = {
        "text": "Incident DEMO-031: OAuth consent grant on docs-secure-share.example from 203.0.113.77",
        "document_id": "DEMO-031",
        "score": 0.89,
        "tags": ["incident", "cat:phishing", "technique:t1528"],
    }
    fake_memory = FakeMemory(recall_results=[macro_memory, oauth_memory])
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
        message='A Legal team member granted consent to an app called "DocuShare Pro" after a "contract review" email. Consent page was on docs-secure-share.example, sign-in from 203.0.113.77.',
        use_memory=True,
    )
    await orchestrator.process_chat(req)

    # Prompt must contain T1528 base playbook
    assert fake_llm.last_user_prompt is not None
    assert '<base_playbook technique="T1528"' in fake_llm.last_user_prompt
    assert "Revoke the malicious app's OAuth consent" in fake_llm.last_user_prompt
    # Macro memory must be dropped because technique differs and shares NO infrastructure with 203.0.113.77
    assert "invoice.docm" not in fake_llm.last_user_prompt


@pytest.mark.asyncio
async def test_unknown_asset_formatted_cleanly(temp_chat_store, temp_incident_store):
    """Test 7: Unknown host -> affected_asset is 'Unknown (<dept>)' and suggestion is added."""
    fake_memory = FakeMemory(recall_results=[])
    # LLM returns an overly verbose unidentified asset
    fake_llm = FakeLLM(response={
        "summary": "OAuth consent granted by legal user",
        "severity": "high",
        "category": "Phishing",
        "mitre_technique": "T1528",
        "affected_asset": "Legal workstation (user account not yet identified)",
        "indicators": ["docs-secure-share.example", "203.0.113.77"],
        "confidence": 0.9,
        "root_cause": "OAuth consent phishing lure",
        "investigation_findings": "Consent granted to DocuShare app",
        "risk_assessment": "High risk of cloud mailbox access",
        "immediate_actions": ["Revoke app consent", "Revoke refresh tokens"],
        "long_term_actions": ["Restrict third party app consent"],
        "why_these_recommendations": "Base playbook for OAuth phishing",
        "adapted_from_memory": False,
    })
    agent = SecurityAgent(fake_llm, fake_memory)
    orchestrator = ChatOrchestrator(
        agent=agent,
        memory_service=fake_memory,
        llm_service=fake_llm,
        incident_store=temp_incident_store,
        chat_store=temp_chat_store,
    )

    req = ChatRequest(
        message="A Legal team member granted consent to an app called DocuShare Pro on docs-secure-share.example from 203.0.113.77",
        use_memory=True,
    )
    resp = await orchestrator.process_chat(req)

    assert resp.report is not None
    assert resp.report.incident.affected_asset == "Unknown (Legal team)"
    assert "Which host or user was affected?" in resp.suggestions


@pytest.mark.asyncio
async def test_seed_polling_returns_progress(temp_incident_store):
    """Test 8: Seed polling returns progress and completes when fake memory becomes searchable."""
    from unittest.mock import MagicMock
    from app.routes.incidents import seed_demo_incidents

    fake_memory = FakeMemory()
    fake_request = MagicMock()
    fake_request.app.state.memory_service = fake_memory
    fake_request.app.state.incident_store = temp_incident_store

    result = await seed_demo_incidents(fake_request, count=5)

    assert result["status"] == "success"
    assert result["seeded_count"] == 5
    assert result["is_indexed"] is True
    assert result["indexed"] == 5
    assert "indexed and ready" in result["message"].lower()

