import logging
from fastapi import APIRouter, Request, Depends

from app.dependencies import verify_api_key
from app.models.schemas import SIEMAlert, InvestigationResponse
from app.services.groq_llm import LLMError
from fastapi import HTTPException

logger = logging.getLogger(__name__)
router = APIRouter()


def normalize_alert(alert: SIEMAlert) -> str:
    """Convert a SIEM alert into a natural-language incident description."""
    parts = []
    if alert.rule_name:
        parts.append(f"Security rule triggered: {alert.rule_name}.")
    if alert.host:
        parts.append(f"Affected host: {alert.host}.")
    if alert.user:
        parts.append(f"Associated user: {alert.user}.")
    if alert.department:
        parts.append(f"Department: {alert.department}.")
    if alert.process_tree:
        parts.append(f"Process tree observed: {alert.process_tree}.")
    if alert.src_ip and alert.dst_ip:
        parts.append(f"Network activity from {alert.src_ip} to {alert.dst_ip}.")
    elif alert.dst_ip:
        parts.append(f"Outbound connection to {alert.dst_ip}.")
    elif alert.src_ip:
        parts.append(f"Inbound connection from {alert.src_ip}.")
    if alert.severity:
        parts.append(f"Alert severity: {alert.severity}.")
    if alert.raw:
        parts.append(f"Raw log: {alert.raw[:500]}")
    if alert.timestamp:
        parts.append(f"Event timestamp: {alert.timestamp}.")
    if alert.source and alert.source != "generic":
        parts.append(f"Source: {alert.source}.")

    return " ".join(parts) if parts else "Security alert received with insufficient detail."


@router.post("/alert", response_model=InvestigationResponse)
async def ingest_alert(
    alert: SIEMAlert,
    request: Request,
    _auth=Depends(verify_api_key),
):
    """Accept a SIEM-style alert, normalize to description, and investigate."""
    description = normalize_alert(alert)
    logger.info(
        "Ingested SIEM alert: source=%s, rule=%s, host=%s",
        alert.source, alert.rule_name, alert.host,
    )

    agent = request.app.state.agent
    incident_store = request.app.state.incident_store

    try:
        result = await agent.investigate(
            description,
            use_memory=True,
            incident_store_items=incident_store.get_all(),
        )
    except LLMError as e:
        raise HTTPException(status_code=502, detail=f"LLM analysis failed: {e}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Investigation failed: {e}")

    incident_store.add(result)
    return result
