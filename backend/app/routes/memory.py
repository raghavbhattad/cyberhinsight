import time
import logging
from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import BaseModel

from app.dependencies import verify_api_key
from app.models.schemas import MemorySearchRequest, MemorySearchResult

logger = logging.getLogger(__name__)
router = APIRouter()

# Playbook cache: category -> (timestamp, result)
_playbook_cache: dict[str, tuple[float, str]] = {}


class RetainRequest(BaseModel):
    content: str


class ReflectRequest(BaseModel):
    query: str


@router.post("/search", response_model=MemorySearchResult)
async def search_memory(input: MemorySearchRequest, request: Request):
    memory_service = request.app.state.memory_service
    results = await memory_service.recall_similar(input.query)
    return MemorySearchResult(results=results, total=len(results))


@router.post("/retain")
async def retain_memory(
    input: RetainRequest,
    request: Request,
    _auth=Depends(verify_api_key),
):
    memory_service = request.app.state.memory_service
    success = await memory_service.retain_incident(input.content)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to retain memory")
    return {"status": "success"}


@router.get("/stats")
async def memory_stats(request: Request):
    memory_service = request.app.state.memory_service
    is_connected = await memory_service.check_connection()
    return {
        "bank_id": memory_service.bank_id,
        "status": "connected" if is_connected else "disconnected",
        "message": "Memory bank is available",
    }


@router.post("/reflect")
async def reflect_memory(input: ReflectRequest, request: Request):
    memory_service = request.app.state.memory_service
    reflection = await memory_service.reflect_patterns(input.query)
    if not reflection:
        raise HTTPException(status_code=500, detail="Failed to reflect on memory")
    return {"reflection": reflection, "text": reflection}


@router.get("/playbook")
async def get_playbook(category: str, request: Request):
    """Get a learned playbook for a category via Hindsight Reflect.
    Cached for 60 seconds per category."""
    global _playbook_cache
    now = time.time()

    # Check cache
    if category in _playbook_cache:
        ts, cached = _playbook_cache[category]
        if now - ts < 60:
            return {"category": category, "playbook": cached, "cached": True}

    memory_service = request.app.state.memory_service
    query = (
        f"For {category} incidents in this organization, which remediation actions "
        f"were effective vs ineffective? Rank the top 5 actions with evidence "
        f"(incident IDs and hostnames). Note recurring attacker infrastructure "
        f"and timing patterns."
    )
    tags = [f"cat:{category.lower()}", "outcome"]
    reflection = await memory_service.reflect_patterns(query, tags=tags, budget="high")
    if not reflection:
        return {"category": category, "playbook": "No playbook data available yet. Investigate incidents and submit feedback to build the playbook.", "cached": False}

    _playbook_cache[category] = (now, reflection)
    return {"category": category, "playbook": reflection, "cached": False}
