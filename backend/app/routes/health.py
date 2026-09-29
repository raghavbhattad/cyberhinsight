from fastapi import APIRouter, Request
from app.models.schemas import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check(request: Request):
    agent = request.app.state.agent
    groq_status = await agent.llm.check_connection()
    hindsight_status = await agent.memory.check_connection()

    status = "ok" if groq_status and hindsight_status else "degraded"

    return HealthResponse(
        status=status,
        hindsight=hindsight_status,
        groq=groq_status,
        version="1.0.0",
    )
