# 🛡️ CyberHinsight

> AI-Powered Security Incident Response Agent with Persistent Memory

## The Problem
- Security teams handle repeated incidents without organizational memory
- Previous investigation findings and successful remediations are lost
- Each incident starts from zero, even when similar incidents were resolved before

## The Solution
CyberHinsight is a defensive AI cybersecurity incident response agent that uses **Hindsight** as persistent memory.

- Analyze security incidents using AI (Groq LLM)
- Store investigation findings in Hindsight memory
- Recall relevant historical incidents when new threats emerge  
- Generate context-aware recommendations informed by organizational history

## How Hindsight Makes CyberHinsight Better

1. **Incident (Reflect):** The agent analyzes an incident and synthesizes key findings, root causes, and resolutions.
2. **Recall:** When a new incident occurs, the agent queries Hindsight to retrieve context from similar historical events.
3. **Retain:** The agent stores its final investigation report in the Hindsight Cloud to improve future responses.

By continuously learning, the agent improves its recommendations over time, ensuring your organization does not repeat the same mistakes.

## Architecture

```
User (SOC Analyst)
    ↓
React Dashboard (Vite)
    ↓
FastAPI Backend
    ↓ ←——————————————————————→ Hindsight Cloud
    ↓                           (retain / recall / reflect)
Groq LLM (Analysis)
    ↓
Memory-Aware Response
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|----------|
| Frontend | React + Vite | SOC Dashboard UI |
| Backend | Python + FastAPI | API & Agent Orchestration |
| LLM | Groq | Fast AI Incident Analysis |
| Memory | Hindsight Cloud | Persistent Agent Memory |

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Groq API Key (https://console.groq.com)
- Hindsight Cloud API Key (https://ui.hindsight.vectorize.io/signup)

### Setup

1. Clone the repository
2. Backend setup:
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your API keys
uvicorn app.main:app --reload --port 8000
```

3. Frontend setup:
```bash
cd frontend
npm install
npm run dev
```

4. Open http://localhost:5173

## Environment Variables

| Variable | Description | Required |
|----------|-----------|----------|
| HINDSIGHT_API_KEY | Hindsight Cloud API key | Yes |
| HINDSIGHT_BASE_URL | Hindsight API endpoint | Yes |
| HINDSIGHT_BANK_ID | Memory bank identifier | Yes |
| GROQ_API_KEY | Groq API key for LLM | Yes |
| LLM_MODEL | LLM model name | Yes |

## Demo Scenario

### Act 1: First Phishing Incident
The SOC receives an alert for a phishing incident involving a macro attachment in the Finance department. Without prior context, CyberHinsight provides a standard, generic response outlining basic containment and eradication steps based on general best practices.

### Act 2: Similar Incident with Memory
Another Finance endpoint falls victim to a similar phishing campaign. This time, CyberHinsight recalls the previous incident from Hindsight memory. Instead of a generic response, it specifically highlights the connection, identifies the shared threat actor infrastructure, and recommends proactive organization-wide sweeps and blocklisting based on the previous investigation's findings.

### Key Demonstration Points
- Without memory: Generic incident response playbook
- With memory: Organization-specific recommendations based on previous incidents
- The agent learns from each investigation

## Features

- 🔍 AI-powered incident analysis
- 🧠 Persistent memory via Hindsight (retain/recall/reflect)
- 📊 SOC-style security dashboard
- 📋 Incident history tracking
- 🔄 Before/After memory comparison
- 🎯 Demo mode with realistic scenarios

## API Endpoints

- `GET /api/incidents`: Retrieve a list of all incidents.
- `GET /api/incidents/{id}`: Retrieve details for a specific incident.
- `POST /api/analyze`: Trigger an AI analysis of an incident.
- `POST /api/memory/recall`: Query Hindsight memory for similar past incidents.
- `POST /api/memory/retain`: Store an investigation report in Hindsight memory.

## Screenshots

> Screenshots will be added after deployment

## Safety & Ethics

This is a **defensive** cybersecurity tool. It does NOT:
- Generate malware or exploits
- Perform offensive security operations
- Use real confidential data
- Connect to production security systems

All incident data is synthetic and used for demonstration purposes.

## Future Improvements

- Real SIEM integration
- Multi-tenant support
- Automated incident triage
- MITRE ATT&CK visualization
- Team collaboration features

## Built With ❤️ for [Hackathon Name]

CyberHinsight Team

---

Powered by [Hindsight](https://hindsight.vectorize.io) · [Groq](https://groq.com)
