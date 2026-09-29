import asyncio
import json
import logging
import time
from groq import AsyncGroq

logger = logging.getLogger(__name__)


class LLMError(Exception):
    """Raised when the LLM cannot produce a valid JSON response."""


class GroqLLMService:
    def __init__(self, api_key: str, model: str, fallback_model: str | None = None):
        self.client = AsyncGroq(api_key=api_key)
        self.model = model
        self.fallback_model = fallback_model
        self._health_cache: tuple[float, bool] = (0.0, False)

    async def _call(self, model: str, system_prompt: str, user_prompt: str) -> dict:
        """Single LLM call returning parsed JSON dict."""
        resp = await self.client.chat.completions.create(
            model=model,
            temperature=0.2,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        raw = resp.choices[0].message.content
        return json.loads(raw)

    async def analyze_json(
        self, system_prompt: str, user_prompt: str, retries: int = 3
    ) -> dict:
        """Call LLM with retry and fallback model. Returns parsed JSON dict.
        Raises LLMError if all attempts fail."""
        models = [self.model]
        if self.fallback_model:
            models.append(self.fallback_model)
        last_err: Exception | None = None
        for model in models:
            for attempt in range(retries):
                try:
                    result = await self._call(model, system_prompt, user_prompt)
                    logger.info("LLM call succeeded", extra={"model": model, "attempt": attempt + 1})
                    return result
                except Exception as e:
                    last_err = e
                    wait = 0.8 * (2 ** attempt)
                    logger.warning(
                        "LLM call failed (model=%s, attempt=%d/%d): %s: %s. Retrying in %.1fs",
                        model, attempt + 1, retries, type(e).__name__, e, wait
                    )
                    await asyncio.sleep(wait)
            logger.warning("All retries exhausted for model=%s, trying fallback", model)
        raise LLMError(f"LLM failed after retries: {type(last_err).__name__}: {last_err}")

    async def generate_text(
        self, system_prompt: str, user_prompt: str, temperature: float = 0.3
    ) -> str:
        """Call LLM returning plain Markdown text (not constrained to JSON)."""
        models = [self.model]
        if self.fallback_model:
            models.append(self.fallback_model)
        for model in models:
            try:
                resp = await self.client.chat.completions.create(
                    model=model,
                    temperature=temperature,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                )
                return resp.choices[0].message.content or ""
            except Exception as e:
                logger.warning("LLM text generation failed for model %s: %s", model, e)
        raise LLMError("LLM text generation failed across all available models")

    async def stream_text(
        self, system_prompt: str, user_prompt: str, temperature: float = 0.3
    ):
        """Async generator streaming text tokens from the LLM."""
        models = [self.model]
        if self.fallback_model:
            models.append(self.fallback_model)
        for model in models:
            try:
                stream = await self.client.chat.completions.create(
                    model=model,
                    temperature=temperature,
                    stream=True,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                )
                async for chunk in stream:
                    delta = chunk.choices[0].delta.content or ""
                    if delta:
                        yield delta
                return
            except Exception as e:
                logger.warning("LLM text streaming failed for model %s: %s", model, e)
        yield "I encountered a communication error with the analysis model. Please try again."

    async def check_connection(self) -> bool:
        """Cached for 30s so /health doesn't burn tokens on every poll."""
        ts, ok = self._health_cache
        if time.time() - ts < 30:
            return ok
        try:
            await self.client.models.list()
            ok = True
        except Exception:
            ok = False
        self._health_cache = (time.time(), ok)
        return ok
