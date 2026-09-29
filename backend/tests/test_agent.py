import pytest
from app.services.agent import SecurityAgent
from app.services.incidents import IncidentStore
from app.services.groq_llm import LLMError
from tests.conftest import FakeLLM, FakeMemory


@pytest.mark.asyncio
async def test_no_retain_on_llm_failure():
    """Test 1: When LLM fails, retain is NEVER called and an exception is raised."""
    fake_llm = FakeLLM(should_fail=True)
    fake_memory = FakeMemory()
    agent = SecurityAgent(fake_llm, fake_memory)

    with pytest.raises(LLMError):
        await agent.investigate("Suspicious PowerShell activity on FIN-WS-042", use_memory=True)

    assert len(fake_memory.retained_items) == 0, "Retain was called despite LLM failure!"


@pytest.mark.asyncio
async def test_recall_influences_prompt():
    """Test 2: With memory ON, recalled text appears in the prompt. With memory OFF, it doesn't."""
    memory_text = "Prior incident DEMO-001: FIN-WS-042 compromised via phishing"
    fake_memory = FakeMemory(recall_results=[{"text": memory_text, "score": 0.85, "document_id": "DEMO-001"}])
    fake_llm = FakeLLM()
    agent = SecurityAgent(fake_llm, fake_memory)

    # Memory ON
    await agent.investigate("New phishing incident on FIN-WS-067", use_memory=True)
    assert fake_llm.last_user_prompt is not None
    assert memory_text in fake_llm.last_user_prompt
    assert "<memory>" in fake_llm.last_user_prompt

    # Memory OFF
    await agent.investigate("New phishing incident on FIN-WS-067", use_memory=False)
    assert fake_llm.last_user_prompt is not None
    assert memory_text not in fake_llm.last_user_prompt
    assert "<memory>" not in fake_llm.last_user_prompt


@pytest.mark.asyncio
async def test_baseline_does_not_retain_or_recall():
    """Test 3: use_memory=False → no recall, no retain."""
    fake_memory = FakeMemory()
    fake_llm = FakeLLM()
    agent = SecurityAgent(fake_llm, fake_memory)

    result = await agent.investigate("Routine alert on host SRV-01", use_memory=False)

    assert fake_memory.recall_call_count == 0, "Recall was called when use_memory=False!"
    assert len(fake_memory.retained_items) == 0, "Retain was called when use_memory=False!"
    assert result["memory_stored"] is False
    assert len(result["memory_matches"]) == 0


@pytest.mark.asyncio
async def test_successful_investigation_retains_structured_memory():
    """Verify that a successful investigation retains with tags and document_id."""
    fake_memory = FakeMemory()
    fake_llm = FakeLLM()
    agent = SecurityAgent(fake_llm, fake_memory)

    result = await agent.investigate("Phishing alert on FIN-WS-042", use_memory=True)

    assert len(fake_memory.retained_items) == 1
    retained = fake_memory.retained_items[0]
    assert retained["document_id"] == result["id"]
    assert "incident" in retained["tags"]
    assert "cat:phishing" in retained["tags"]
    assert "sev:critical" in retained["tags"]
    assert "Incident ID:" in retained["content"]
