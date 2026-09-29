from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from app.models.schemas import MemorySearchRequest, MemorySearchResult

router = APIRouter()

class RetainRequest(BaseModel):
    content: str

class ReflectRequest(BaseModel):
    query: str

@router.post("/search", response_model=MemorySearchResult)
async def search_memory(input: MemorySearchRequest, request: Request):
    memory_service = request.app.state.memory_service
    results = await memory_service.recall_similar(input.query)
    return MemorySearchResult(
        results=results,
        total=len(results)
    )

@router.post("/retain")
async def retain_memory(input: RetainRequest, request: Request):
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
        "message": "Memory bank is available"
    }

@router.post("/reflect")
async def reflect_memory(input: ReflectRequest, request: Request):
    memory_service = request.app.state.memory_service
    reflection = await memory_service.reflect_patterns(input.query)
    if not reflection:
        raise HTTPException(status_code=500, detail="Failed to reflect on memory")
    return {"reflection": reflection, "text": reflection}


