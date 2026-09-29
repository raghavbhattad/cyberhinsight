import json
import re
import uuid
import logging
import time
from datetime import datetime, timezone
from pydantic import ValidationError

from app.services.groq_llm import GroqLLMService, LLMError
from app.services.hindsight_memory import HindsightMemoryService
from app.services.ioc import extract_iocs, merge_iocs
from app.services.campaigns import link_campaign, predict_escalation
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
    ) -> dict:
        """Full investigation pipeline:
        1. Extract IOCs deterministically
        2. Recall from Hindsight (if enabled)
        3. Build prompt (memory-aware or standard)
        4. Call LLM with validation
        5. Campaign linking
        6. Escalation prediction
        7. Retain in Hindsight (only if analysis validated)
        """
        incident_id = str(uuid.uuid4())
        ts = datetime.now(timezone.utc).isoformat()
        store_items = incident_store_items or []
        timings = {}

        # Strip control characters from input
        clean_desc = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', description)

        # 1. Extract IOCs deterministically
        t0 = time.time()
        incident_iocs = extract_iocs(clean_desc)
        timings["ioc_extraction_ms"] = int((time.time() - t0) * 1000)

        # 2. Recall from Hindsight
        memory_matches = []
        if use_memory:
            t0 = time.time()
            memory_matches = await self.memory.recall_similar(clean_desc)
            timings["recall_ms"] = int((time.time() - t0) * 1000)

        # 3. Build prompt
        if memory_matches:
            formatted_memories = []
            for m in memory_matches:
                doc_id = m.get('document_id', 'unknown')
                score = m.get('score')
                score_str = f" (relevance: {score:.2f})" if score else ""
                tags = m.get('tags', []) or []
                tags_str = f" [tags: {', '.join(tags)}]" if tags else ""
                formatted_memories.append(
                    f"HISTORICAL INCIDENT (id={doc_id}{score_str}{tags_str}):\n{m['text']}\n---"
                )
            historical_context = "\n".join(formatted_memories)
            system_prompt = "You are a senior cybersecurity incident response analyst for an enterprise SOC."
            user_prompt = MEMORY_AWARE_PROMPT_TEMPLATE.format(
                incident_description=clean_desc,
                historical_context=historical_context,
            )
        else:
            system_prompt = ANALYSIS_SYSTEM_PROMPT
            user_prompt = f"<incident>\n{clean_desc}\n</incident>"

        # 4. Call LLM with validation
        t0 = time.time()
        parsed = await self.llm.analyze_json(system_prompt, user_prompt)

        # Validate with Pydantic
        try:
            analysis = LLMAnalysis.model_validate(parsed)
        except ValidationError as ve:
            # Retry once with error feedback
            logger.warning("LLM output validation failed, retrying: %s", ve)
            retry_prompt = (
                f"Your previous output failed validation: {ve}. "
                f"Please return valid JSON matching the exact schema requested."
            )
            parsed = await self.llm.analyze_json(system_prompt, retry_prompt)
            analysis = LLMAnalysis.model_validate(parsed)  # Let it raise if still bad

        timings["llm_ms"] = int((time.time() - t0) * 1000)

        # Merge IOCs (deterministic + LLM)
        merged_indicators = merge_iocs(incident_iocs, analysis.indicators)

        # 5. Campaign linking
        campaign_link = link_campaign(
            incident_iocs, memory_matches, store_items, incident_id
        )

        # 6. Escalation prediction
        predicted_escalation = predict_escalation(
            campaign_link, memory_matches, store_items
        )

        # 7. Retain in Hindsight (only because analysis validated)
        memory_stored = False
        if use_memory:
            t0 = time.time()
            # Build structured retain content
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

            # Build tags
            tags = [
                "incident",
                f"cat:{analysis.category.lower()}",
                f"sev:{analysis.severity}",
            ]
            if campaign_link:
                tags.append(f"campaign:{campaign_link['campaign_id']}")

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
            "campaign_link": campaign_link,
            "predicted_escalation": predicted_escalation,
            "iocs": incident_iocs.to_dict(),
        }
