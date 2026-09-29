import asyncio
from hindsight_client import Hindsight

class HindsightMemoryService:
    def __init__(self, api_key: str, base_url: str, bank_id: str):
        self.api_key = api_key
        self.base_url = base_url
        self.bank_id = bank_id
        self.available = bool(api_key)
        self._client = None
        self._loop = None
        if not api_key:
            print("Warning: HINDSIGHT_API_KEY not set. Memory features disabled.")

    def _get_client(self) -> Hindsight:
        """Lazily create client bound to the current running asyncio loop"""
        try:
            current_loop = asyncio.get_running_loop()
        except RuntimeError:
            current_loop = None

        if self._client is None or self._loop != current_loop:
            self._client = Hindsight(api_key=self.api_key, base_url=self.base_url)
            self._loop = current_loop
        return self._client

    async def retain_incident(self, content: str, document_id: str = None) -> bool:
        if not self.available:
            return False
        try:
            client = self._get_client()
            if document_id:
                await client.aretain(bank_id=self.bank_id, content=content, document_id=document_id)
            else:
                await client.aretain(bank_id=self.bank_id, content=content)
            return True
        except Exception as e:
            print(f"Error retaining memory in Hindsight: {type(e).__name__}: {e}")
            return False

    async def recall_similar(self, query: str) -> list[dict]:
        if not self.available:
            return []
        try:
            client = self._get_client()
            response = await client.arecall(bank_id=self.bank_id, query=query)
            return [{"text": memory.text, "relevance": "high"} for memory in response.results]
        except Exception as e:
            print(f"Error recalling memory from Hindsight: {type(e).__name__}: {e}")
            return []

    async def reflect_patterns(self, query: str) -> str | None:
        if not self.available:
            return None
        try:
            client = self._get_client()
            response = await client.areflect(bank_id=self.bank_id, query=query, budget="mid")
            return response.text
        except Exception as e:
            print(f"Error reflecting on memory from Hindsight: {type(e).__name__}: {e}")
            return None

    async def check_connection(self) -> bool:
        if not self.available:
            return False
        try:
            client = self._get_client()
            await client.arecall(bank_id=self.bank_id, query="ping")
            return True
        except Exception as e:
            print(f"Hindsight check_connection error: {type(e).__name__}: {e}")
            return False
