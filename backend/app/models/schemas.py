from typing import Optional, Literal
from pydantic import BaseModel, field_validator


class IncidentInput(BaseModel):
    description: str
    use_memory: bool = True


class IncidentInfo(BaseModel):
    description: str
    summary: str
    severity: str
    category: str
    mitre_technique: str
    affected_asset: str
    department: str = ""
    indicators: list[str] = []
    confidence: float = 0.85

    @field_validator("mitre_technique", mode="before")
    @classmethod
    def format_mitre(cls, v):
        if isinstance(v, list):
            return ", ".join(str(item) for item in v)
        return str(v) if v is not None else "N/A"

    @field_validator("affected_asset", mode="before")
    @classmethod
    def format_asset(cls, v):
        if isinstance(v, list):
            return ", ".join(str(item) for item in v)
        return str(v) if v is not None else "Unknown"

    @field_validator("summary", "category", mode="before")
    @classmethod
    def format_text_fields(cls, v):
        if isinstance(v, list):
            return " ".join(str(item) for item in v)
        return str(v) if v is not None else ""

    @field_validator("severity", mode="before")
    @classmethod
    def normalize_severity(cls, v):
        if isinstance(v, list):
            v = v[0] if v else "medium"
        v = str(v).lower().strip()
        if v in ("critical", "high", "medium", "low"):
            return v
        return "medium"

    @field_validator("indicators", mode="before")
    @classmethod
    def format_indicators(cls, v):
        if isinstance(v, str):
            return [v]
        return v if isinstance(v, list) else []

    @field_validator("confidence", mode="before")
    @classmethod
    def clamp_confidence(cls, v):
        try:
            val = float(v)
            return max(0.0, min(1.0, val))
        except (ValueError, TypeError):
            return 0.5


class AnalysisResult(BaseModel):
    root_cause: str
    investigation_findings: str
    risk_assessment: str

    @field_validator("investigation_findings", mode="before")
    @classmethod
    def format_findings(cls, v):
        if isinstance(v, list):
            return "\n".join(f"- {item}" for item in v)
        return str(v) if v is not None else "None"

    @field_validator("root_cause", mode="before")
    @classmethod
    def format_root_cause(cls, v):
        if isinstance(v, list):
            return ", ".join(str(item) for item in v)
        return str(v) if v is not None else "Unknown"

    @field_validator("risk_assessment", mode="before")
    @classmethod
    def format_risk(cls, v):
        if isinstance(v, list):
            return ", ".join(str(item) for item in v)
        return str(v) if v is not None else "Moderate"


class MemoryMatch(BaseModel):
    text: str
    relevance: str = "medium"
    rank: int | None = None
    score: float | None = None
    scores: dict | None = None
    document_id: str | None = None
    tags: list[str] | None = None
    type: str | None = None


class CampaignLink(BaseModel):
    campaign_id: str
    linked_incident_ids: list[str] = []
    shared_iocs: list[str] = []
    link_strength: str = "weak"  # strong|moderate|weak
    incident_count: int = 0
    departments_touched: list[str] = []
    shared_mitre: list[str] = []


class EscalationPrediction(BaseModel):
    predicted_next_stage: str
    confidence: str = "low"
    grounding_evidence: list[dict] = []
    preventive_action: str = ""
    based_on_incidents: list[str] = []


class Recommendations(BaseModel):
    immediate_actions: list[str] = []
    long_term_actions: list[str] = []
    why_these_recommendations: str = ""
    adapted_from_memory: bool = False

    @field_validator("immediate_actions", "long_term_actions", mode="before")
    @classmethod
    def format_actions(cls, v):
        if isinstance(v, str):
            return [v]
        return v if isinstance(v, list) else []

    @field_validator("why_these_recommendations", mode="before")
    @classmethod
    def format_why(cls, v):
        if isinstance(v, list):
            return " ".join(str(item) for item in v)
        return str(v) if v is not None else ""


class InvestigationResponse(BaseModel):
    id: str
    timestamp: str
    incident: IncidentInfo
    analysis: AnalysisResult
    memory_matches: list[MemoryMatch] = []
    recommendations: Recommendations
    memory_stored: bool
    is_baseline: bool = False
    campaign_link: CampaignLink | None = None
    predicted_escalation: EscalationPrediction | None = None
    iocs: dict | None = None


class Feedback(BaseModel):
    outcome: Literal["effective", "partially_effective", "ineffective", "false_positive"]
    actions_taken: list[str] = []
    what_worked: str = ""
    what_failed: str = ""
    analyst_notes: str = ""


class MemorySearchRequest(BaseModel):
    query: str


class MemorySearchResult(BaseModel):
    results: list[MemoryMatch]
    total: int


class HealthResponse(BaseModel):
    status: str
    hindsight: bool
    groq: bool
    version: str


class MemoryStats(BaseModel):
    bank_id: str
    status: str
    message: str


class LLMAnalysis(BaseModel):
    """Strict model for validated LLM output. Used to ensure we never
    persist garbage into Hindsight."""
    summary: str = "No summary provided"
    severity: str = "medium"
    category: str = "Unknown"
    mitre_technique: str = "Unknown"
    affected_asset: str = "Unknown"
    indicators: list[str] = []
    confidence: float = 0.5
    root_cause: str = "Unknown"
    investigation_findings: str = ""
    risk_assessment: str = "Unknown"
    immediate_actions: list[str] = []
    long_term_actions: list[str] = []
    why_these_recommendations: str = ""
    adapted_from_memory: bool = False

    @field_validator("severity", mode="before")
    @classmethod
    def normalize_severity(cls, v):
        if isinstance(v, list):
            v = v[0] if v else "medium"
        v = str(v).lower().strip()
        if v in ("critical", "high", "medium", "low"):
            return v
        return "medium"

    @field_validator("confidence", mode="before")
    @classmethod
    def clamp_confidence(cls, v):
        try:
            val = float(v)
            return max(0.0, min(1.0, val))
        except (ValueError, TypeError):
            return 0.5

    @field_validator("mitre_technique", "affected_asset", "summary", "category",
                     "root_cause", "risk_assessment", "why_these_recommendations",
                     mode="before")
    @classmethod
    def coerce_string(cls, v):
        if isinstance(v, list):
            return ", ".join(str(item) for item in v)
        return str(v) if v is not None else ""

    @field_validator("indicators", "immediate_actions", "long_term_actions", mode="before")
    @classmethod
    def coerce_list(cls, v):
        if isinstance(v, str):
            return [v]
        return v if isinstance(v, list) else []

    @field_validator("investigation_findings", mode="before")
    @classmethod
    def format_findings(cls, v):
        if isinstance(v, list):
            return "\n".join(f"- {item}" for item in v)
        return str(v) if v is not None else ""


class SIEMAlert(BaseModel):
    """Generic SIEM-style alert payload for ingestion."""
    source: str = "generic"  # sentinel|splunk|crowdstrike|generic
    rule_name: str = ""
    severity: str = "medium"
    host: str = ""
    user: str = ""
    department: str = ""
    src_ip: str = ""
    dst_ip: str = ""
    process_tree: str = ""
    timestamp: str = ""
    raw: str = ""
