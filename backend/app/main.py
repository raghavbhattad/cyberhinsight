import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.services.groq_llm import GroqLLMService
from app.services.hindsight_memory import HindsightMemoryService
from app.services.agent import SecurityAgent
from app.services.incidents import IncidentStore
from app.routes import health, incidents, memory, ingest, demo

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

BANK_MISSION = (
    "Organizational memory for a SOC. Remember incidents, attacker infrastructure, "
    "which remediation steps worked or failed in THIS organization, and analyst feedback. "
    "Prefer facts with outcomes."
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: ensure Hindsight bank exists with mission."""
    logger.info("CyberHinsight starting up...")
    try:
        await app.state.memory_service.ensure_bank(mission=BANK_MISSION)
    except Exception as e:
        logger.warning("Could not configure bank on startup: %s", e)
    yield
    logger.info("CyberHinsight shutting down.")


app = FastAPI(
    title="CyberHinsight API",
    description="Defensive AI Security Incident Response Agent with Persistent Memory",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Services
groq_service = GroqLLMService(
    settings.GROQ_API_KEY,
    settings.LLM_MODEL,
    fallback_model=settings.LLM_FALLBACK_MODEL,
)
memory_service = HindsightMemoryService(
    settings.HINDSIGHT_API_KEY,
    settings.HINDSIGHT_BASE_URL,
    settings.HINDSIGHT_BANK_ID,
)
agent = SecurityAgent(groq_service, memory_service)
incident_store = IncidentStore()

app.state.agent = agent
app.state.memory_service = memory_service
app.state.incident_store = incident_store
app.state.groq_service = groq_service

# Routes
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(incidents.router, prefix="/api/incidents", tags=["Incidents"])
app.include_router(memory.router, prefix="/api/memory", tags=["Memory"])
app.include_router(ingest.router, prefix="/api/ingest", tags=["Ingestion"])
app.include_router(demo.router, prefix="/api/demo", tags=["Demo"])


@app.get("/")
async def root():
    return {"name": "CyberHinsight API", "version": "1.0.0", "status": "running"}
