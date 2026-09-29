import pytest
from datetime import datetime, timezone
from app.services.groq_llm import LLMError


class FakeLLM:
    """Mock LLM service for testing without network calls."""

    def __init__(self, should_fail: bool = False, response: dict | None = None):
        self.should_fail = should_fail
        self.response = response or {
            "summary": "Suspicious PowerShell execution on Finance workstation",
            "severity": "critical",
            "category": "Phishing",
            "mitre_technique": "T1566.001",
            "affected_asset": "FIN-WS-042",
            "indicators": ["198.51.100.45", "invoice_7482.docm"],
            "confidence": 0.95,
            "root_cause": "User opened malicious document attachment",
            "investigation_findings": "PowerShell spawned from Word attempting external download",
            "risk_assessment": "High risk of credential theft and lateral movement",
            "immediate_actions": ["Isolate endpoint FIN-WS-042", "Block IP 198.51.100.45"],
            "long_term_actions": ["Update mail filtering rules"],
            "why_these_recommendations": "Standard containment playbook for phishing dropper",
            "adapted_from_memory": False,
        }
        self.last_system_prompt: str | None = None
        self.last_user_prompt: str | None = None
        self.last_history: list[dict] | None = None
        self.call_count = 0

    async def analyze_json(self, system_prompt: str, user_prompt: str, retries: int = 3) -> dict:
        self.call_count += 1
        self.last_system_prompt = system_prompt
        self.last_user_prompt = user_prompt
        if self.should_fail:
            raise LLMError("Simulated LLM rate limit or parsing failure")
        return dict(self.response)

    async def generate_text(self, system_prompt: str, user_prompt: str, temperature: float = 0.3, history: list[dict] | None = None) -> str:
        self.call_count += 1
        self.last_system_prompt = system_prompt
        self.last_user_prompt = user_prompt
        self.last_history = history
        if self.should_fail:
            raise LLMError("Simulated LLM text failure")
        return "Based on organizational memory, past incident DEMO-001 showed that isolating FIN-WS-042 stopped the PowerShell beacon."

    async def stream_text(self, system_prompt: str, user_prompt: str, temperature: float = 0.3, history: list[dict] | None = None):
        self.call_count += 1
        self.last_system_prompt = system_prompt
        self.last_user_prompt = user_prompt
        self.last_history = history
        if self.should_fail:
            yield "LLM communication failure"
            return
        tokens = ["Based ", "on ", "memory, ", "isolation ", "worked."]
        for t in tokens:
            yield t

    async def check_connection(self) -> bool:
        return not self.should_fail


class FakeMemory:
    """Mock Hindsight memory service for testing without network calls."""

    def __init__(self, recall_results: list[dict] | None = None):
        self.available = True
        self.bank_id = "test-bank"
        self.recall_results = recall_results or []
        self.retained_items: list[dict] = []
        self.recall_call_count = 0
        self._indexing_status: dict[str, bool] = {}

    def get_indexing_status(self, doc_id: str) -> bool | None:
        return self._indexing_status.get(doc_id)

    def set_indexing_status(self, doc_id: str, status: bool) -> None:
        self._indexing_status[doc_id] = status

    async def wait_for_memory(self, query_token: str, timeout_s: float = 10.0, interval_s: float = 1.0) -> bool:
        return True

    async def retain_incident(
        self,
        content: str,
        document_id: str | None = None,
        context: str | None = None,
        tags: list[str] | None = None,
        metadata: dict[str, str] | None = None,
        timestamp: datetime | None = None,
    ) -> bool:
        self.retained_items.append({
            "content": content,
            "document_id": document_id,
            "context": context,
            "tags": tags or [],
            "metadata": metadata or {},
            "timestamp": timestamp,
        })
        return True

    async def recall_similar(
        self,
        query: str,
        tags: list[str] | None = None,
        limit: int = 6,
    ) -> list[dict]:
        self.recall_call_count += 1
        if self.recall_results:
            return list(self.recall_results)
        matches = []
        q_low = query.lower()
        for item in self.retained_items:
            content = item.get("content", "")
            if q_low in content.lower():
                matches.append({
                    "text": content,
                    "document_id": item.get("document_id"),
                    "score": 0.95,
                    "tags": item.get("tags", []),
                })
        return matches[:limit]

    async def reflect_patterns(self, query: str, tags: list[str] | None = None, budget: str = "mid") -> str | None:
        return f"Reflected pattern for: {query}"

    async def check_connection(self) -> bool:
        return True

    async def ensure_bank(self, mission: str | None = None) -> None:
        pass
