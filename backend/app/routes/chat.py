import logging
from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import StreamingResponse

from app.config import settings
from app.dependencies import verify_api_key
from app.models.schemas import ChatRequest, ChatResponse, ConversationSummary
from app.services.chat_orchestrator import ChatOrchestrator

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("", response_model=ChatResponse)
async def post_chat(
    req: ChatRequest,
    request: Request,
    _auth=Depends(verify_api_key),
):
    """Non-streaming chat endpoint: routes message, recalls memory if appropriate, and returns ChatResponse."""
    if len(req.message) > settings.MAX_INCIDENT_CHARS:
        raise HTTPException(
            status_code=422,
            detail=f"Message exceeds maximum length of {settings.MAX_INCIDENT_CHARS} characters",
        )
    if not req.message.strip():
        raise HTTPException(status_code=422, detail="Message cannot be empty")

    orchestrator: ChatOrchestrator = request.app.state.chat_orchestrator
    try:
        response = await orchestrator.process_chat(req)
        return response
    except Exception as e:
        logger.error("Chat processing failed: %s: %s", type(e).__name__, e)
        raise HTTPException(status_code=502, detail=f"Chat processing error: {e}")


@router.post("/stream")
async def post_chat_stream(
    req: ChatRequest,
    request: Request,
    _auth=Depends(verify_api_key),
):
    """Server-Sent Events streaming chat endpoint emitting status, token, and final events."""
    if len(req.message) > settings.MAX_INCIDENT_CHARS:
        raise HTTPException(
            status_code=422,
            detail=f"Message exceeds maximum length of {settings.MAX_INCIDENT_CHARS} characters",
        )
    if not req.message.strip():
        raise HTTPException(status_code=422, detail="Message cannot be empty")

    orchestrator: ChatOrchestrator = request.app.state.chat_orchestrator

    return StreamingResponse(
        orchestrator.stream_chat(req),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("", response_model=list[ConversationSummary])
async def list_conversations(request: Request):
    """List recent conversations sorted by last updated."""
    chat_store = request.app.state.chat_store
    return chat_store.list_conversations()


@router.get("/{conversation_id}")
async def get_conversation(conversation_id: str, request: Request):
    """Get all messages in a specific conversation."""
    chat_store = request.app.state.chat_store
    messages = chat_store.get(conversation_id)
    if not messages:
        return {"id": conversation_id, "messages": []}
    return {"id": conversation_id, "messages": messages}


@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    request: Request,
    _auth=Depends(verify_api_key),
):
    """Delete a conversation by ID."""
    chat_store = request.app.state.chat_store
    deleted = chat_store.delete(conversation_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"status": "success", "message": f"Conversation {conversation_id} deleted"}
