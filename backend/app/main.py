from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.services.groq_llm import GroqLLMService
from app.services.hindsight_memory import HindsightMemoryService
from app.services.agent import SecurityAgent
from app.services.incidents import IncidentStore

from app.routes import health, incidents, memory

app = FastAPI(
    title="CyberHinsight API",
    description="Backend API for CyberHinsight Incident Response",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

groq_service = GroqLLMService(settings.GROQ_API_KEY, settings.LLM_MODEL)
memory_service = HindsightMemoryService(
    settings.HINDSIGHT_API_KEY, 
    settings.HINDSIGHT_BASE_URL, 
    settings.HINDSIGHT_BANK_ID
)
agent = SecurityAgent(groq_service, memory_service)
incident_store = IncidentStore()

app.state.agent = agent
app.state.memory_service = memory_service
app.state.incident_store = incident_store

app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(incidents.router, prefix="/api/incidents", tags=["Incidents"])
app.include_router(memory.router, prefix="/api/memory", tags=["Memory"])

@app.get("/")
def root():
    return {"name": "CyberHinsight API", "version": "1.0.0", "status": "running"}
