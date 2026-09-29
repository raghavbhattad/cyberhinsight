import json
import re
import uuid
import logging
import time
from datetime import datetime, timezone
from pydantic import ValidationError

from app.services.groq_llm import GroqLLMService, LLMError
from app.services.hindsight_memory import HindsightMemoryService
from app.services.ioc import extract_iocs, merge_iocs, extract_department
from app.services.campaigns import link_campaign, predict_escalation
from app.services.memory_labels import (
    format_memory_label,
    derive_outcome_status,
    sanitize_uuid_citations,
    sanitize_outcome_claims,
)
from app.prompts.playbooks import detect_technique, get_base_playbook
from app.models.schemas import LLMAnalysis
from app.prompts.system import ANALYSIS_SYSTEM_PROMPT, MEMORY_AWARE_PROMPT_TEMPLATE

logger = logging.getLogger(__name__)


class SecurityAgent:
    def __init__(self, llm_service: GroqLLMService, memory_service: HindsightMemoryService):
        self.llm = llm_service
        self.memory = memory_service

    async def investigate(
        self,
        description: str,
        use_memory: bool = True,
        incident_store_items: list[dict] | None = None,
        progress_callback = None,
    ) -> dict:
        """Full investigation pipeline:
        1. Extract IOCs and detect MITRE technique deterministically
        2. Recall from Hindsight (including technique to rank same-type first)
        3. Filter unrelated attack types unless they share infrastructure
        4. Build prompt with bracketed labels, outcome status, and base playbook
        5. Call LLM with validation
        6. Clean unknown assets and sanitize UUID citations / outcome claims
        7. Campaign linking and escalation prediction
        8. Retain in Hindsight
        """
        incident_id = str(uuid.uuid4())
        ts = datetime.now(timezone.utc).isoformat()
        store_items = incident_store_items or []
        timings = {}
        is_baseline = not use_memory

        # Strip control characters from input
        clean_desc = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', description)

        # 1. Extract IOCs and technique deterministically
        t0 = time.time()
        incident_iocs = extract_iocs(clean_desc)
        tech_id, tech_name = detect_technique(clean_desc)
        timings["ioc_extraction_ms"] = int((time.time() - t0) * 1000)

        # 2. Recall from Hindsight (include technique so same-technique incidents rank first)
        memory_matches = []
        if use_memory:
            t0 = time.time()
            recall_query = clean_desc
            if tech_id:
                recall_query = f"{clean_desc} {tech_id} {tech_name}"
            raw_matches = await self.memory.recall_similar(recall_query, limit=8)

            # 3. Attack-type awareness: only reuse a memory of a different attack type
            # if it shares infrastructure (IPs, domains, hashes, subnets)
            if tech_id:
                filtered_matches = []
                for m in raw_matches:
                    m_text = m.get("text", "")
                    m_iocs = extract_iocs(m_text)
                    shared_infra = bool(
                        set(incident_iocs.ipv4) & set(m_iocs.ipv4)
                        or set(incident_iocs.domains) & set(m_iocs.domains)
                        or set(incident_iocs.hashes_sha256) & set(m_iocs.hashes_sha256)
                        or set(incident_iocs.ip_networks) & set(m_iocs.ip_networks)
                    )
                    m_tech, _ = detect_technique(m_text)
                    if shared_infra or (m_tech == tech_id) or not m_tech:
                        filtered_matches.append(m)
                    else:
                        logger.info(
                            "Dropping memory %s: technique %s differs from %s without shared infrastructure",
                            m.get("document_id"), m_tech, tech_id
                        )
                memory_matches = filtered_matches
            else:
                memory_matches = raw_matches

            timings["recall_ms"] = int((time.time() - t0) * 1000)
            if progress_callback:
                await progress_callback("recall_done", len(memory_matches))

        # Base playbook block
        base_actions = get_base_playbook(tech_id)
        if base_actions:
            base_playbook_block = (
                f"\n<base_playbook technique=\"{tech_id}\" name=\"{tech_name}\">\n"
                f"Standard required actions for {tech_name} ({tech_id}):\n"
                + "\n".join(f"- {act}" for act in base_actions)
                + "\n</base_playbook>\n"
            )
        else:
            base_playbook_block = ""

        # Build label and outcome maps for citations
        id_to_label_map: dict[str, str] = {}
        label_outcome_map: dict[str, str] = {}

        if memory_matches:
            formatted_memories = []
            for m in memory_matches:
                doc_id = m.get('document_id') or "unknown"
                st_item = next((item for item in store_items if item.get("id") == doc_id), None)
                label = format_memory_label(doc_id, store_item=st_item, text=m.get('text', ''))
                m['label'] = label
                if doc_id and doc_id != "unknown":
                    id_to_label_map[doc_id] = label
                    id_to_label_map[doc_id.replace("-outcome", "")] = label

                outcome_status = derive_outcome_status(
                    tags=m.get('tags'),
                    feedback=st_item.get('feedback') if st_item else None,
                    text=m.get('text'),
                    raw_outcome=st_item.get('outcome') if st_item else None,
                )
                m['outcome_status'] = outcome_status
                label_outcome_map[label] = outcome_status

                score = m.get('score')
                score_str = f" (relevance: {score:.2f})" if score else ""
                tags = m.get('tags', []) or []
                tags_str = f" [tags: {', '.join(tags)}]" if tags else ""
                formatted_memories.append(
                    f"MEMORY {label} (outcome: {outcome_status}{score_str}{tags_str}):\n{m['text']}\n---"
                )

            historical_context = "\n".join(formatted_memories)
            system_prompt = "You are a senior cybersecurity incident response analyst for an enterprise SOC."
            user_prompt = MEMORY_AWARE_PROMPT_TEMPLATE.format(
                incident_description=clean_desc,
                base_playbook_block=base_playbook_block,
                historical_context=historical_context,
            )
        else:
            system_prompt = ANALYSIS_SYSTEM_PROMPT
            user_prompt = f"<incident>\n{clean_desc}\n</incident>\n{base_playbook_block}"

        # 4. Call LLM with validation
        t0 = time.time()
        parsed = await self.llm.analyze_json(system_prompt, user_prompt)

        # Validate with Pydantic
        try:
            analysis = LLMAnalysis.model_validate(parsed)
        except ValidationError as ve:
            logger.warning("LLM output validation failed, retrying: %s", ve)
            retry_prompt = (
                f"{user_prompt}\n\n"
                f"ATTENTION: Your previous response failed schema validation: {ve}\n"
                f"Please re-analyze the incident above and output valid JSON matching the exact schema."
            )
            parsed = await self.llm.analyze_json(system_prompt, retry_prompt)
            analysis = LLMAnalysis.model_validate(parsed)

        timings["llm_ms"] = int((time.time() - t0) * 1000)
        if progress_callback:
            await progress_callback("analysis_done", analysis.category)

        # Merge IOCs (deterministic + LLM)
        merged_indicators = merge_iocs(incident_iocs, analysis.indicators)

        # Determine department deterministically
        department = extract_department(clean_desc, analysis.affected_asset)

        # Fix G: Clean unknown assets
        asset_raw = str(analysis.affected_asset or "").strip()
        if (
            "not yet identified" in asset_raw.lower()
            or "unidentified" in asset_raw.lower()
            or "workstation (" in asset_raw.lower()
            or asset_raw.lower() in ("unknown", "none", "")
            or len(asset_raw) > 35
        ):
            if department and department.lower() != "unknown":
                analysis.affected_asset = f"Unknown ({department} team)"
            else:
                analysis.affected_asset = "Unknown"

        # Sanitize citations and outcome claims across all fields
        analysis.summary = sanitize_outcome_claims(
            sanitize_uuid_citations(analysis.summary, id_to_label_map), label_outcome_map
        )
        analysis.investigation_findings = sanitize_outcome_claims(
            sanitize_uuid_citations(analysis.investigation_findings, id_to_label_map), label_outcome_map
        )
        analysis.immediate_actions = [
            sanitize_outcome_claims(sanitize_uuid_citations(act, id_to_label_map), label_outcome_map)
            for act in analysis.immediate_actions
        ]
        analysis.long_term_actions = [
            sanitize_outcome_claims(sanitize_uuid_citations(act, id_to_label_map), label_outcome_map)
            for act in analysis.long_term_actions
        ]
        analysis.why_these_recommendations = sanitize_outcome_claims(
            sanitize_uuid_citations(analysis.why_these_recommendations, id_to_label_map), label_outcome_map
        )

        # 5. Campaign linking & 6. Escalation prediction (only when memory is active)
        campaign_link = None
        predicted_escalation = None
        if use_memory:
            campaign_link = link_campaign(
                incident_iocs, memory_matches, store_items, incident_id, current_text=clean_desc
            )
            predicted_escalation = predict_escalation(
                campaign_link, memory_matches, store_items
            )
        if progress_callback:
            await progress_callback("campaign_done", campaign_link)

        # 7. Retain in Hindsight (only because analysis validated and use_memory is True)
        memory_stored = False
        if use_memory:
            t0 = time.time()
            retain_parts = [
                f"Incident ID: {incident_id}",
                f"Timestamp: {ts}",
                f"Summary: {analysis.summary}",
                f"Severity: {analysis.severity}",
                f"Category: {analysis.category}",
                f"MITRE Technique: {analysis.mitre_technique}",
                f"Affected Asset: {analysis.affected_asset}",
                f"Description: {clean_desc}",
                f"Root Cause: {analysis.root_cause}",
                f"Findings: {analysis.investigation_findings}",
                f"Immediate Actions: {'; '.join(analysis.immediate_actions)}",
                f"Long-term Actions: {'; '.join(analysis.long_term_actions)}",
                f"IOCs: {', '.join(merged_indicators[:20])}",
            ]
            if campaign_link:
                retain_parts.append(f"Campaign: {campaign_link['campaign_id']}")
            retain_content = "\n".join(retain_parts)

            tags = [
                "incident",
                f"cat:{analysis.category.lower()}",
                f"sev:{analysis.severity}",
            ]
            if campaign_link:
                tags.append(f"campaign:{campaign_link['campaign_id']}")
            if tech_id:
                tags.append(f"technique:{tech_id.lower()}")

            memory_stored = await self.memory.retain_incident(
                content=retain_content,
                document_id=incident_id,
                context=f"SOC incident investigation for {analysis.category} targeting {analysis.affected_asset}",
                tags=tags,
                metadata={
                    "severity": analysis.severity,
                    "category": analysis.category,
                    "asset": analysis.affected_asset,
                },
                timestamp=datetime.now(timezone.utc),
            )
            timings["retain_ms"] = int((time.time() - t0) * 1000)

        if progress_callback:
            await progress_callback("saved", memory_stored)

        logger.info(
            "Investigation complete: id=%s, severity=%s, memory_matches=%d, "
            "retained=%s, campaign=%s, timings=%s",
            incident_id, analysis.severity, len(memory_matches),
            memory_stored,
            campaign_link.get("campaign_id") if campaign_link else None,
            timings,
        )

        return {
            "id": incident_id,
            "timestamp": ts,
            "incident": {
                "description": clean_desc,
                "summary": analysis.summary,
                "severity": analysis.severity,
                "category": analysis.category,
                "mitre_technique": analysis.mitre_technique,
                "affected_asset": analysis.affected_asset,
                "department": department,
                "indicators": merged_indicators,
                "confidence": analysis.confidence,
            },
            "analysis": {
                "root_cause": analysis.root_cause,
                "investigation_findings": analysis.investigation_findings,
                "risk_assessment": analysis.risk_assessment,
            },
            "memory_matches": memory_matches,
            "recommendations": {
                "immediate_actions": analysis.immediate_actions,
                "long_term_actions": analysis.long_term_actions,
                "why_these_recommendations": analysis.why_these_recommendations,
                "adapted_from_memory": analysis.adapted_from_memory,
            },
            "memory_stored": memory_stored,
            "is_baseline": is_baseline,
            "campaign_link": campaign_link,
            "predicted_escalation": predicted_escalation,
            "iocs": incident_iocs.to_dict(),
        }
