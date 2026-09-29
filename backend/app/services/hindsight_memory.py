import asyncio
import logging
import time
from datetime import datetime
from hindsight_client import Hindsight

logger = logging.getLogger(__name__)


def _bucket_relevance(score: float | None, rank: int, total: int) -> str:
    """Derive relevance bucket from real score or rank position.
    Documented in HINDSIGHT.md."""
    if score is not None:
        if score >= 0.7:
            return "high"
        if score >= 0.4:
            return "medium"
        return "low"
    # Fallback: rank-based (top third = high, middle = medium, rest = low)
    if total <= 0:
        return "medium"
    position = rank / total
    if position <= 0.33:
        return "high"
    if position <= 0.66:
        return "medium"
    return "low"


class HindsightMemoryService:
    def __init__(self, api_key: str, base_url: str, bank_id: str):
        self.api_key = api_key
        self.base_url = base_url
        self.bank_id = bank_id
        self.available = bool(api_key)
        self._client = None
        self._loop = None
        self._mission_set = False
        if not api_key:
            logger.warning("HINDSIGHT_API_KEY not set. Memory features disabled.")

    def _get_client(self) -> Hindsight:
        """Lazily create client bound to the current running asyncio loop."""
        try:
            current_loop = asyncio.get_running_loop()
        except RuntimeError:
            current_loop = None

        if self._client is None or self._loop != current_loop:
            self._client = Hindsight(api_key=self.api_key, base_url=self.base_url)
            self._loop = current_loop
        return self._client

    async def ensure_bank(self, mission: str | None = None) -> None:
        """Create bank if it doesn't exist. Set mission if provided."""
        if not self.available or self._mission_set:
            return
        try:
            client = self._get_client()
            try:
                await client.acreate_bank(
                    bank_id=self.bank_id,
                    name="CyberHinsight SOC Memory",
                    mission=mission,
                )
                logger.info("Created Hindsight bank: %s", self.bank_id)
            except Exception:
                # Bank likely already exists
                if mission:
                    try:
                        await client.aset_mission(bank_id=self.bank_id, mission=mission)
                        logger.info("Set mission on bank: %s", self.bank_id)
                    except Exception as me:
                        logger.debug("Could not set mission: %s", me)
            self._mission_set = True
        except Exception as e:
            logger.warning("ensure_bank failed: %s", e)

    async def retain_incident(
        self,
        content: str,
        document_id: str | None = None,
        context: str | None = None,
        tags: list[str] | None = None,
        metadata: dict[str, str] | None = None,
        timestamp: datetime | None = None,
    ) -> bool:
        """Retain content into Hindsight with optional structured metadata."""
        if not self.available:
            return False
        try:
            client = self._get_client()
            kwargs: dict = {
                "bank_id": self.bank_id,
                "content": content,
            }
            if document_id:
                kwargs["document_id"] = document_id
            if context:
                kwargs["context"] = context
            if tags:
                kwargs["tags"] = tags
            if metadata:
                kwargs["metadata"] = metadata
            if timestamp:
                kwargs["timestamp"] = timestamp
            await client.aretain(**kwargs)
            logger.info(
                "Retained memory (doc_id=%s, tags=%s)",
                document_id, tags
            )
            return True
        except Exception as e:
            logger.error("Error retaining memory: %s: %s", type(e).__name__, e)
            return False

    async def recall_similar(
        self,
        query: str,
        tags: list[str] | None = None,
        limit: int = 6,
    ) -> list[dict]:
        """Recall similar memories with real scores from Hindsight."""
        if not self.available:
            return []
        try:
            client = self._get_client()
            kwargs: dict = {
                "bank_id": self.bank_id,
                "query": query,
                "budget": "mid",
            }
            if tags:
                kwargs["tags"] = tags
                kwargs["tags_match"] = "any"
            response = await client.arecall(**kwargs)
            results = response.results[:limit]
            out = []
            for i, m in enumerate(results):
                # Extract real scores from SDK
                score = None
                scores_dict = None
                if hasattr(m, "scores") and m.scores is not None:
                    score = getattr(m.scores, "final", None)
                    scores_dict = {
                        "final": getattr(m.scores, "final", None),
                        "reranker": getattr(m.scores, "reranker", None),
                        "semantic": getattr(m.scores, "semantic", None),
                        "keyword": getattr(m.scores, "keyword", None),
                    }
                out.append({
                    "text": m.text,
                    "rank": i + 1,
                    "score": score,
                    "scores": scores_dict,
                    "type": getattr(m, "type", None),
                    "document_id": getattr(m, "document_id", None),
                    "tags": getattr(m, "tags", None),
                    "relevance": _bucket_relevance(score, i + 1, len(results)),
                })
            logger.info("Recalled %d memories for query (len=%d)", len(out), len(query))
            return out
        except Exception as e:
            logger.error("Error recalling memory: %s: %s", type(e).__name__, e)
            return []

    async def reflect_patterns(
        self,
        query: str,
        tags: list[str] | None = None,
        budget: str = "mid",
    ) -> str | None:
        """Use Hindsight reflect for pattern synthesis."""
        if not self.available:
            return None
        try:
            client = self._get_client()
            kwargs: dict = {
                "bank_id": self.bank_id,
                "query": query,
                "budget": budget,
            }
            if tags:
                kwargs["tags"] = tags
                kwargs["tags_match"] = "any"
            response = await client.areflect(**kwargs)
            return response.text
        except Exception as e:
            logger.error("Error reflecting on memory: %s: %s", type(e).__name__, e)
            return None

    async def check_connection(self) -> bool:
        """Check if Hindsight is reachable."""
        if not self.available:
            return False
        try:
            client = self._get_client()
            await client.arecall(bank_id=self.bank_id, query="ping", budget="low", max_tokens=100)
            return True
        except Exception as e:
            logger.debug("Hindsight check_connection error: %s: %s", type(e).__name__, e)
            return False

    async def wait_for_memory(
        self, query_token: str, timeout_s: float = 10.0, interval_s: float = 1.0
    ) -> bool:
        """Poll recall until the query_token appears in results, or timeout."""
        if not self.available:
            return False
        start = time.time()
        while time.time() - start < timeout_s:
            try:
                results = await self.recall_similar(query_token, limit=3)
                for r in results:
                    if query_token.lower() in r.get("text", "").lower():
                        return True
            except Exception:
                pass
            await asyncio.sleep(interval_s)
        return False
