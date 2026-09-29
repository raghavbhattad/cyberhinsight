import re
import time
import uuid
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import BaseModel

from app.config import settings
from app.dependencies import verify_api_key
from app.services.hindsight_memory import HindsightMemoryService
from app.services.ioc import extract_iocs

logger = logging.getLogger(__name__)
router = APIRouter()

# Global state for demo sequences
_demo_results: dict[str, list] = {}


class SequenceRequest(BaseModel):
    num_incidents: int = 6


def calculate_specificity_score(
    recommendations: dict,
    why_text: str,
    incident_iocs: list[str],
    campaign_id: str | None,
    feedback_history: list[dict],
) -> dict:
    """Calculate a transparent, documented specificity score.
    Components:
    - org_references: count of org-specific hostnames, incident IDs, or department names cited
    - ioc_references: count of specific IOCs (IPs, hashes, filenames) cited in actions/why
    - campaign_awareness: 1 if campaign ID or shared infrastructure is cited, else 0
    - ineffective_action_avoidance: 1 if known-ineffective actions from past feedback were avoided, else 0
    Total score: sum of components normalized to 0-10 scale.
    """
    full_text = " ".join(recommendations.get("immediate_actions", [])) + " " + why_text

    # 1. Org references (hostnames like FIN-WS-xxx, DEMO-xxx, INC-xxx, departments)
    host_matches = re.findall(r'\b[A-Z]{2,4}-WS-\d+\b', full_text)
    inc_matches = re.findall(r'\b(?:DEMO|INC)-\w+\b', full_text)
    dept_matches = re.findall(r'\b(?:Finance|Engineering|Executive|HR|IT|R&D)\b', full_text, re.IGNORECASE)
    org_ref_count = len(set(host_matches + inc_matches + dept_matches))

    # 2. IOC references
    ioc_ref_count = 0
    for ioc in incident_iocs:
        if ioc.lower() in full_text.lower():
            ioc_ref_count += 1

    # 3. Campaign awareness
    campaign_aware = 1 if (campaign_id and campaign_id.lower() in full_text.lower()) or "campaign" in full_text.lower() else 0

    # 4. Ineffective action avoidance
    ineffective_actions = []
    for fb in feedback_history:
        if fb.get("outcome") in ("ineffective", "partially_effective"):
            what_failed = fb.get("what_failed", "").lower()
            if what_failed:
                ineffective_actions.append(what_failed)

    avoided = 1
    for failed in ineffective_actions:
        if failed and failed in full_text.lower():
            avoided = 0
            break

    # Compute total score (0 to 10 scale)
    raw = (org_ref_count * 1.5) + (ioc_ref_count * 1.0) + (campaign_aware * 2.0) + (avoided * 1.5)
    score = min(10.0, round(raw, 1))

    return {
        "score": score,
        "components": {
            "org_references": org_ref_count,
            "ioc_references": ioc_ref_count,
            "campaign_aware": campaign_aware,
            "avoided_ineffective": avoided,
        },
    }


@router.post("/new-session")
async def start_new_session(request: Request, _auth=Depends(verify_api_key)):
    """Create a fresh Hindsight bank ID for demo isolation (cold start).
    Guarantees Act 1 starts with no memory."""
    new_bank_id = f"cyberhinsight-demo-{int(time.time())}"
    logger.info("Creating new demo bank: %s", new_bank_id)

    # Instantiate a new memory service targeting the new bank
    new_memory_service = HindsightMemoryService(
        api_key=settings.HINDSIGHT_API_KEY,
        base_url=settings.HINDSIGHT_BASE_URL,
        bank_id=new_bank_id,
    )

    # Best-effort create the bank with mission
    mission = (
        "Organizational memory for a SOC. Remember incidents, attacker infrastructure, "
        "which remediation steps worked or failed in THIS organization, and analyst feedback. "
        "Prefer facts with outcomes."
    )
    await new_memory_service.ensure_bank(mission=mission)

    # Update app state
    request.app.state.memory_service = new_memory_service
    request.app.state.agent.memory = new_memory_service
    request.app.state.incident_store.clear()

    return {
        "status": "success",
        "bank_id": new_bank_id,
        "message": f"Fresh demo session started with bank {new_bank_id}. Memory is empty (cold start).",
    }


@router.post("/run-sequence")
async def run_learning_sequence(
    seq: SequenceRequest,
    request: Request,
    _auth=Depends(verify_api_key),
):
    """Run N scripted, related incidents in TWO modes: memory OFF and memory ON.
    Computes transparent specificity scores for the learning curve."""
    agent = request.app.state.agent
    memory_service = request.app.state.memory_service
    incident_store = request.app.state.incident_store

    # 6 scripted sequential incidents telling a realistic campaign story
    scripted_incidents = [
        {
            "step": 1,
            "title": "Initial Phishing on FIN-WS-042",
            "desc": (
                "Finance employee on FIN-WS-042 opened an email with 'invoice_7482.docm'. "
                "PowerShell executed and attempted connection to external IP 198.51.100.45. "
                "User accounts j.martinez potentially compromised."
            ),
            "feedback": {
                "outcome": "effective",
                "actions_taken": ["Endpoint isolated", "Credentials reset"],
                "what_worked": "Host isolation prevented lateral movement",
                "what_failed": "",
            },
        },
        {
            "step": 2,
            "title": "Second Phishing on FIN-WS-088",
            "desc": (
                "Another Finance workstation FIN-WS-088 reported similar behavior: Word spawned "
                "powershell.exe -ep bypass connecting to 198.51.100.48 (same /24 subnet). "
                "User r.thompson credentials harvested."
            ),
            "feedback": {
                "outcome": "partially_effective",
                "actions_taken": ["Endpoint isolated", "Email purged"],
                "what_worked": "Mailbox purge removed 14 additional phishing emails",
                "what_failed": "Rebooting without network disconnect allowed C2 beacon",
            },
        },
        {
            "step": 3,
            "title": "Credential Spray Targeting Finance",
            "desc": (
                "Multiple failed login attempts from external IP 198.51.100.52 against Finance "
                "workstations FIN-WS-042, FIN-WS-088, and FIN-WS-012. Attacker attempting password spraying."
            ),
            "feedback": {
                "outcome": "effective",
                "actions_taken": ["Subnet 198.51.100.0/24 blocked at edge", "MFA enforced"],
                "what_worked": "Subnet block stopped all inbound spray attempts",
                "what_failed": "",
            },
        },
        {
            "step": 4,
            "title": "Ransomware Staging on FIN-WS-012",
            "desc": (
                "Escalated payload observed on FIN-WS-012: process tree shows vssadmin.exe attempting "
                "to delete volume shadow copies. Files being renamed with .crypt extension. "
                "Outbound connection attempt to 198.51.100.50 blocked by firewall."
            ),
            "feedback": {
                "outcome": "effective",
                "actions_taken": ["Emergency host shutdown", "Backup verification", "Re-imaging"],
                "what_worked": "Firewall subnet block prevented key retrieval; offline backups intact",
                "what_failed": "",
            },
        },
        {
            "step": 5,
            "title": "Lateral Movement Attempt to HR-WS-015",
            "desc": (
                "Suspicious SMB connection from Finance subnet targeting HR-WS-015 using compromised "
                "service account. Command line indicates attempts to stage secondary ransomware loader."
            ),
            "feedback": {
                "outcome": "effective",
                "actions_taken": ["Service account disabled", "Inter-VLAN SMB disabled"],
                "what_worked": "Disabling inter-VLAN SMB stopped cross-department spread",
                "what_failed": "",
            },
        },
        {
            "step": 6,
            "title": "Supply Chain Phishing Variant",
            "desc": (
                "Procurement employee on PRO-WS-003 received email referencing vendor payment update. "
                "Link leads to 198.51.100.75 attempting credential harvesting similar to the Finance campaign."
            ),
            "feedback": {
                "outcome": "effective",
                "actions_taken": ["Domain blocked", "Creds reset", "Pre-emptive procurement audit"],
                "what_worked": "Applying Finance containment playbook immediately neutralized threat",
                "what_failed": "",
            },
        },
    ]

    limit = min(seq.num_incidents, len(scripted_incidents))
    results = []
    feedback_history = []

    for item in scripted_incidents[:limit]:
        step = item["step"]
        desc = item["desc"]
        iocs = extract_iocs(desc).all_flat

        # Run WITHOUT memory (control baseline)
        ctrl_res = await agent.investigate(desc, use_memory=False, incident_store_items=[])
        ctrl_score = calculate_specificity_score(
            ctrl_res["recommendations"],
            ctrl_res["recommendations"].get("why_these_recommendations", ""),
            iocs,
            None,
            [],
        )

        # Run WITH memory
        mem_res = await agent.investigate(
            desc, use_memory=True, incident_store_items=incident_store.get_all()
        )
        incident_store.add(mem_res)

        campaign_id = mem_res.get("campaign_link", {}).get("campaign_id") if mem_res.get("campaign_link") else None
        mem_score = calculate_specificity_score(
            mem_res["recommendations"],
            mem_res["recommendations"].get("why_these_recommendations", ""),
            iocs,
            campaign_id,
            feedback_history,
        )

        # Submit scripted feedback to train Hindsight
        fb = item["feedback"]
        feedback_history.append(fb)
        inc_id = mem_res["id"]
        incident_store.update(inc_id, {"feedback": fb})

        # Retain feedback into memory
        fb_content = (
            f"OUTCOME for incident {inc_id} ({item['title']}):\n"
            f"Result: {fb['outcome']}\n"
            f"Actions: {'; '.join(fb['actions_taken'])}\n"
            f"What worked: {fb['what_worked']}\n"
        )
        if fb.get("what_failed"):
            fb_content += f"What failed: {fb['what_failed']}\n"
        await memory_service.retain_incident(
            fb_content,
            document_id=f"{inc_id}-outcome",
            tags=["outcome", f"outcome:{fb['outcome']}"],
        )

        results.append({
            "step": step,
            "title": item["title"],
            "score_without_memory": ctrl_score["score"],
            "score_with_memory": mem_score["score"],
            "components_without": ctrl_score["components"],
            "components_with": mem_score["components"],
            "campaign_id": campaign_id,
            "memory_matches_count": len(mem_res.get("memory_matches", [])),
        })

    session_id = str(uuid.uuid4())[:8]
    _demo_results[session_id] = results

    return {
        "status": "success",
        "session_id": session_id,
        "results": results,
    }


@router.get("/sequence-results")
async def get_sequence_results(session_id: str | None = None):
    """Get the latest demo sequence results for chart rendering."""
    if session_id and session_id in _demo_results:
        return {"results": _demo_results[session_id]}
    if _demo_results:
        latest = list(_demo_results.values())[-1]
        return {"results": latest}
    return {"results": []}
