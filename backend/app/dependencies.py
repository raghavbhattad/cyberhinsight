import logging
from fastapi import Header, HTTPException, Depends
from app.config import settings

logger = logging.getLogger(__name__)


async def verify_api_key(x_api_key: str = Header(default=None)):
    """Optional API-key dependency for write endpoints.
    If APP_API_KEY is empty, auth is disabled (dev mode)."""
    if not settings.APP_API_KEY:
        return  # Dev mode — no auth required
    if x_api_key != settings.APP_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
