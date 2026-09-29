import json
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from app.models.schemas import IncidentInput, InvestigationResponse

router = APIRouter()

class RetainPayload(BaseModel):
    content: str
    document_id: Optional[str] = None

@router.post("/investigate", response_model=InvestigationResponse)
async def investigate_incident(input: IncidentInput, request: Request):
    agent = request.app.state.agent
    incident_store = request.app.state.incident_store
    
    result = await agent.investigate(input.description, input.use_memory)
    incident_store.add(result)
    
    return result

@router.post("/retain")
async def retain_incident(payload: RetainPayload, request: Request):
    memory_service = request.app.state.memory_service
    success = await memory_service.retain_incident(payload.content, payload.document_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to retain incident in Hindsight")
    return {"status": "success", "message": "Incident retained in Hindsight memory"}

@router.post("/seed")
async def seed_demo_incidents(request: Request, count: int = 5):
    """Seed synthetic incidents from demo/incidents.json into Hindsight memory and the incident store"""
    demo_path = Path(__file__).resolve().parent.parent.parent.parent / "demo" / "incidents.json"
    if not demo_path.exists():
        # Fallback location
        demo_path = Path("demo/incidents.json")
    
    if not demo_path.exists():
        raise HTTPException(status_code=404, detail="demo/incidents.json not found")
        
    with open(demo_path, "r", encoding="utf-8") as f:
        incidents = json.load(f)

    to_seed = incidents[:count]
    memory_service = request.app.state.memory_service
    incident_store = request.app.state.incident_store
    
    seeded_count = 0
    for inc in to_seed:
        # Structured memory retain content
        content = (
            f"Incident: {inc.get('title')}\n"
            f"Department: {inc.get('department')}\n"
            f"Endpoint: {inc.get('endpoint')}\n"
            f"Severity: {inc.get('severity')}\n"
            f"Category: {inc.get('category')}\n"
            f"MITRE Technique: {inc.get('mitre_technique')}\n"
            f"Description: {inc.get('description')}\n"
            f"Root Cause: {inc.get('root_cause')}\n"
            f"Resolution: {inc.get('resolution')}\n"
            f"Outcome: {inc.get('outcome')}"
        )
        await memory_service.retain_incident(content, document_id=inc.get("id"))

        
        # Also add to incident store for history view
        record = {
            "id": inc.get("id"),
            "timestamp": inc.get("timestamp"),
            "incident": {
                "description": inc.get("description"),
                "summary": inc.get("title"),
                "severity": inc.get("severity"),
                "category": inc.get("category"),
                "mitre_technique": inc.get("mitre_technique"),
                "affected_asset": inc.get("endpoint"),
                "indicators": [],
                "confidence": 0.95
            },
            "analysis": {
                "root_cause": inc.get("root_cause"),
                "investigation_findings": inc.get("description"),
                "risk_assessment": f"Severity evaluated as {inc.get('severity')} impacting {inc.get('department')}."
            },
            "memory_matches": [],
            "recommendations": {
                "immediate_actions": [inc.get("resolution")],
                "long_term_actions": ["Review and update endpoint detection rules.", "Conduct targeted security awareness training."],
                "why_these_recommendations": f"Remediation based on historical containment outcome: {inc.get('outcome')}",
                "adapted_from_memory": False
            },
            "memory_stored": True
        }
        incident_store.add(record)
        seeded_count += 1
        
    return {
        "status": "success",
        "seeded_count": seeded_count,
        "message": f"Successfully seeded {seeded_count} incidents into Hindsight and local history"
    }

@router.post("/reset")
def reset_history(request: Request):
    request.app.state.incident_store.clear()
    return {"status": "success", "message": "Incident history cleared"}

@router.get("/history")
def get_history(request: Request):
    return request.app.state.incident_store.get_all()

@router.get("/stats")
def get_stats(request: Request):
    return request.app.state.incident_store.get_stats()

@router.get("/{incident_id}")
def get_incident(incident_id: str, request: Request):
    incident = request.app.state.incident_store.get_by_id(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident

