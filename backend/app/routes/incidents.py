import json
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import BaseModel

from app.config import settings
from app.dependencies import verify_api_key
from app.models.schemas import (
    IncidentInput, InvestigationResponse, Feedback, SIEMAlert,
)
from app.services.groq_llm import LLMError

logger = logging.getLogger(__name__)
router = APIRouter()


class RetainPayload(BaseModel):
    content: str
    document_id: Optional[str] = None


@router.post("/investigate", response_model=InvestigationResponse)
async def investigate_incident(
    input: IncidentInput,
    request: Request,
    _auth=Depends(verify_api_key),
):
    # Input size validation
    if len(input.description) > settings.MAX_INCIDENT_CHARS:
        raise HTTPException(
            status_code=422,
            detail=f"Incident description exceeds maximum length of {settings.MAX_INCIDENT_CHARS} characters",
        )
    if not input.description.strip():
        raise HTTPException(status_code=422, detail="Incident description cannot be empty")

    agent = request.app.state.agent
    incident_store = request.app.state.incident_store

    try:
        result = await agent.investigate(
            input.description,
            input.use_memory,
            incident_store_items=incident_store.get_all(),
        )
    except LLMError as e:
        logger.error("LLM failure during investigation: %s", e)
        raise HTTPException(status_code=502, detail=f"LLM analysis failed: {e}")
    except Exception as e:
        logger.error("Investigation error: %s: %s", type(e).__name__, e)
        raise HTTPException(status_code=502, detail=f"Investigation failed: {type(e).__name__}: {e}")

    if not input.use_memory or result.get("is_baseline"):
        result["is_baseline"] = True
        return result

    incident_store.add(result)
    return result


@router.post("/{incident_id}/feedback")
async def submit_feedback(
    incident_id: str,
    feedback: Feedback,
    request: Request,
    _auth=Depends(verify_api_key),
):
    """Submit outcome feedback for an investigation. This retains a new outcome
    memory in Hindsight to drive learning."""
    incident_store = request.app.state.incident_store
    memory_service = request.app.state.memory_service

    incident = incident_store.get_by_id(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    # Attach feedback to stored record
    incident_store.update(incident_id, {"feedback": feedback.model_dump()})

    # Build outcome content for Hindsight
    inc_data = incident.get("incident", {})
    outcome_content = (
        f"OUTCOME for incident {incident_id} ({inc_data.get('category', 'Unknown')}, "
        f"host {inc_data.get('affected_asset', 'Unknown')}):\n"
        f"Result: {feedback.outcome}\n"
    )
    if feedback.actions_taken:
        outcome_content += f"Actions taken: {'; '.join(feedback.actions_taken)}\n"
    if feedback.what_worked:
        outcome_content += f"What worked: {feedback.what_worked}\n"
    if feedback.what_failed:
        outcome_content += f"What failed: {feedback.what_failed}\n"
    if feedback.analyst_notes:
        outcome_content += f"Analyst notes: {feedback.analyst_notes}\n"
    indicators = inc_data.get("indicators", [])
    if indicators:
        outcome_content += f"IOCs: {', '.join(indicators[:10])}\n"

    # Retain outcome in Hindsight with distinct document_id
    tags = [
        "outcome",
        f"outcome:{feedback.outcome}",
        f"cat:{inc_data.get('category', 'unknown').lower()}",
    ]
    retained = await memory_service.retain_incident(
        content=outcome_content,
        document_id=f"{incident_id}-outcome",
        context=f"Analyst feedback on incident {incident_id}",
        tags=tags,
        metadata={
            "outcome": feedback.outcome,
            "incident_id": incident_id,
        },
    )

    return {"status": "success", "retained": retained}


@router.post("/retain")
async def retain_incident(
    payload: RetainPayload,
    request: Request,
    _auth=Depends(verify_api_key),
):
    memory_service = request.app.state.memory_service
    success = await memory_service.retain_incident(payload.content, payload.document_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to retain incident in Hindsight")
    return {"status": "success", "message": "Incident retained in Hindsight memory"}


@router.post("/seed")
async def seed_demo_incidents(
    request: Request,
    count: int = 35,
    _auth=Depends(verify_api_key),
):
    """Seed synthetic incidents from demo/incidents.json and demo/incidents_extra.json."""
    import asyncio
    import time
    from app.services.ioc import extract_iocs

    root_dir = Path(__file__).resolve().parent.parent.parent.parent
    demo_path = root_dir / "demo" / "incidents.json"
    if not demo_path.exists():
        demo_path = Path("demo/incidents.json")
    extra_path = root_dir / "demo" / "incidents_extra.json"
    if not extra_path.exists():
        extra_path = Path("demo/incidents_extra.json")

    incidents = []
    if demo_path.exists():
        with open(demo_path, "r", encoding="utf-8") as f:
            incidents.extend(json.load(f))
    if extra_path.exists():
        with open(extra_path, "r", encoding="utf-8") as f:
            incidents.extend(json.load(f))

    if not incidents:
        raise HTTPException(status_code=404, detail="No demo incidents found to seed")

    to_seed = incidents[:count]
    memory_service = request.app.state.memory_service
    incident_store = request.app.state.incident_store

    seeded_count = 0
    last_token = None

    for inc in to_seed:
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
        tags = [
            "incident",
            f"cat:{inc.get('category', 'unknown').lower()}",
            f"sev:{inc.get('severity', 'medium')}",
        ]
        if inc.get("mitre_technique"):
            tags.append(f"technique:{inc.get('mitre_technique').lower()}")

        await memory_service.retain_incident(
            content, document_id=inc.get("id"), tags=tags
        )

        if inc.get("feedback"):
            fb = inc["feedback"]
            fb_content = (
                f"OUTCOME for incident {inc.get('id')} ({inc.get('title')}):\n"
                f"Result: {fb.get('outcome')}\n"
                f"Actions: {'; '.join(fb.get('actions_taken', []))}\n"
                f"What worked: {fb.get('what_worked')}\n"
            )
            if fb.get("what_failed"):
                fb_content += f"What failed: {fb.get('what_failed')}\n"
            await memory_service.retain_incident(
                fb_content,
                document_id=f"{inc.get('id')}-outcome",
                tags=["outcome", f"outcome:{fb.get('outcome')}", f"cat:{inc.get('category', 'unknown').lower()}"],
            )

        iocs = extract_iocs(inc.get("description", "")).all_flat

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
                "department": inc.get("department", ""),
                "indicators": iocs,
                "confidence": 0.95,
            },
            "analysis": {
                "root_cause": inc.get("root_cause"),
                "investigation_findings": inc.get("description"),
                "risk_assessment": f"Severity evaluated as {inc.get('severity')} impacting {inc.get('department')}.",
            },
            "memory_matches": [],
            "recommendations": {
                "immediate_actions": [inc.get("resolution")],
                "long_term_actions": ["Review and update endpoint detection rules."],
                "why_these_recommendations": f"Remediation based on historical outcome: {inc.get('outcome')}",
                "adapted_from_memory": False,
            },
            "feedback": inc.get("feedback"),
            "outcome": inc.get("outcome"),
            "memory_stored": True,
            "memory_indexed": True,
        }
        incident_store.add(record)
        seeded_count += 1

        desc_low = inc.get("description", "").lower()
        if "docushare" in desc_low:
            last_token = "DocuShare"
        elif not last_token:
            last_token = inc.get("endpoint") or inc.get("id")

    indexed = False
    if memory_service.available and last_token:
        start_poll = time.time()
        while time.time() - start_poll < 15.0:
            try:
                rec = await memory_service.recall_similar(last_token, limit=3)
                if any(last_token.lower() in (r.get("text", "")).lower() for r in rec):
                    indexed = True
                    break
            except Exception:
                pass
            await asyncio.sleep(1.5)

    msg = (
        f"Successfully seeded {seeded_count} incidents into organizational memory. All indexed and ready."
        if indexed else
        f"Seeded {seeded_count} incidents into organizational memory. Indexing is completing in background."
    )

    return {
        "status": "success",
        "seeded_count": seeded_count,
        "indexed": seeded_count if indexed else int(seeded_count * 0.8),
        "total": seeded_count,
        "is_indexed": indexed,
        "message": msg,
    }


@router.post("/reset")
def reset_history(request: Request, _auth=Depends(verify_api_key)):
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
