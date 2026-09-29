import json
import uuid
import re
from datetime import datetime
from app.services.groq_llm import GroqLLMService
from app.services.hindsight_memory import HindsightMemoryService
from app.prompts.system import ANALYSIS_SYSTEM_PROMPT, MEMORY_AWARE_PROMPT_TEMPLATE

class SecurityAgent:
    def __init__(self, llm_service: GroqLLMService, memory_service: HindsightMemoryService):
        self.llm = llm_service
        self.memory = memory_service

    def _parse_json(self, content: str) -> dict:
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            match = re.search(r'```(?:json)?\s*(.*?)\s*```', content, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(1))
                except:
                    pass
            return {"error": "Failed to parse LLM response"}

    async def investigate(self, description: str, use_memory: bool = True) -> dict:
        memory_matches = []
        historical_context = ""

        if use_memory:
            memory_matches = await self.memory.recall_similar(description)
            if memory_matches:
                formatted_memories = [f"HISTORICAL INCIDENT:\n{m['text']}\n---" for m in memory_matches]
                historical_context = "\n".join(formatted_memories)

        if historical_context:
            system_prompt = "You are a senior cybersecurity incident response analyst."
            user_prompt = MEMORY_AWARE_PROMPT_TEMPLATE.format(
                incident_description=description,
                historical_context=historical_context
            )
        else:
            system_prompt = ANALYSIS_SYSTEM_PROMPT
            user_prompt = f"INCIDENT DESCRIPTION:\n{description}"

        llm_response_text = self.llm.analyze(system_prompt, user_prompt)
        parsed_result = self._parse_json(llm_response_text)

        summary = parsed_result.get("summary", "No summary provided")
        severity = parsed_result.get("severity", "medium")
        category = parsed_result.get("category", "Unknown")
        
        findings_val = parsed_result.get('investigation_findings', '')
        findings_str = "; ".join(str(f) for f in findings_val) if isinstance(findings_val, list) else str(findings_val)
        
        actions_val = parsed_result.get('immediate_actions', [])
        actions_str = ", ".join(str(a) for a in actions_val) if isinstance(actions_val, list) else str(actions_val)
        
        retain_content = f"Incident: {summary}\nSeverity: {severity}\nCategory: {category}\nDescription: {description}\nFindings: {findings_str}\nRecommendations: {actions_str}"

        
        memory_stored = False
        if use_memory:
            memory_stored = await self.memory.retain_incident(retain_content)


        return {
            "id": str(uuid.uuid4()),
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "incident": {
                "description": description,
                "summary": summary,
                "severity": severity,
                "category": category,
                "mitre_technique": parsed_result.get("mitre_technique", "Unknown"),
                "affected_asset": parsed_result.get("affected_asset", "Unknown"),
                "indicators": parsed_result.get("indicators", []),
                "confidence": parsed_result.get("confidence", 0.5)
            },
            "analysis": {
                "root_cause": parsed_result.get("root_cause", "Unknown"),
                "investigation_findings": parsed_result.get("investigation_findings", "None"),
                "risk_assessment": parsed_result.get("risk_assessment", "Unknown")
            },
            "memory_matches": memory_matches,
            "recommendations": {
                "immediate_actions": parsed_result.get("immediate_actions", []),
                "long_term_actions": parsed_result.get("long_term_actions", []),
                "why_these_recommendations": parsed_result.get("why_these_recommendations", ""),
                "adapted_from_memory": parsed_result.get("adapted_from_memory", False)
            },
            "memory_stored": memory_stored
        }
