from typing import Union, List, Any
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

    @field_validator("summary", "severity", "category", mode="before")
    @classmethod
    def format_text_fields(cls, v):
        if isinstance(v, list):
            return " ".join(str(item) for item in v)
        return str(v) if v is not None else ""

    @field_validator("indicators", mode="before")
    @classmethod
    def format_indicators(cls, v):
        if isinstance(v, str):
            return [v]
        return v if isinstance(v, list) else []


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
    relevance: str

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
    memory_matches: list[MemoryMatch]
    recommendations: Recommendations
    memory_stored: bool

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
