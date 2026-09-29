# 🛡️ CyberHinsight

> **Defensive AI Security Incident Response Assistant with Persistent Hindsight Memory**
>
> CyberHinsight transforms enterprise cybersecurity operations from stateless LLM playbooks into a conversational SOC security assistant that feels like Claude. Powered by **Hindsight Cloud** persistent agent memory and **Groq** sub-second inference, CyberHinsight recalls past investigations, correlates multi-week adversary campaigns, and actively learns from containment outcomes to deliver context-aware defenses.

---

## 💡 Why CyberHinsight?

* **Stateless LLM Amnesia**: Standard AI incident response tools analyze every ticket in isolation. When the same attacker infrastructure returns two weeks later, the AI starts from scratch with zero context.
* **Hindsight-Powered Memory**: CyberHinsight uses Hindsight Cloud as its persistent organizational memory bank. It retains past investigations, containment outcomes, and analyst instructions. When an alert arrives, it recalls relevant precedents, checks shared infrastructure, and adapts its response.
* **Strict Grounding**: For historical questions, the assistant answers *only* from recalled memory. It never invents incident numbers, dates, or IP addresses.
* **Outcome Learning**: When an analyst marks a containment step as effective or notes an asset's priority, that fact is retained into Hindsight to shape future answers.

---

## 🏛️ System Architecture

![CyberHinsight Defense Architecture](docs/architecture.svg)

```
User (SOC Analyst)
       ↓
Chat Interface (React 18 + Vite · SSE Streaming)
       ↓
FastAPI Backend & Intent Router
   ├─► Investigate  ──► IOC Extractor ──► Hindsight Recall ──► Groq Analysis ──► Campaign Correlator ──► Retain
   ├─► Ask History  ──► Hindsight Recall / Reflect ────────► Groq Plaintext Q&A (Strict Grounding)
   ├─► Teach        ──► Hindsight Retain (Tags: analyst_note / outcome) ──► Confirmation
   └─► General      ──► Groq Defensive Guidance (Enriched with memory if relevant)
```

| Layer | Component | Technology | Purpose |
|---|---|---|---|
| **Client UI** | Calm Chat Console | React 18 + Vite | Single-screen Claude-like conversation, streaming SSE, collapsed report cards, memory source chips |
| **API Gateway** | Intent Router & Engine | Python 3.13 + FastAPI | Deterministic routing + LLM fallback, IOC extraction, campaign linking, atomic JSON chat store |
| **Inference** | Sub-Second Diagnostics | Groq Cloud | `openai/gpt-oss-120b` (Primary) with fallback support, streaming SSE generation |
| **Memory** | Persistent Vector Bank | Hindsight Cloud | `aretain`, `arecall`, `areflect`, `aset_mission` (Bank: `cyberhinsight`) |

---

## ⚡ Quick Start Guide

### Prerequisites
* **Python**: 3.11+ (Python 3.13 tested)
* **Node.js**: 18+ and npm 9+
* **Groq API Key**: [console.groq.com](https://console.groq.com)
* **Hindsight Cloud Account**: [ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io/signup)

---

### Backend Setup

```bash
# 1. Navigate to backend directory
cd backend

# 2. Create virtual environment
python -m venv .venv

# 3. Activate virtual environment
# Windows:
.venv\Scripts\activate
# Linux / macOS:
source .venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# 5. Configure environment
cp .env.example .env
# Edit .env with your GROQ_API_KEY, HINDSIGHT_API_KEY, and HINDSIGHT_BANK_ID

# 6. Run the server
uvicorn app.main:app --reload --port 8000
```

---

### Frontend Setup

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🎬 60-Second Demo Walkthrough

Try the core learning loop right in the chat interface:

1. **Act 1: First Phishing Incident (Memory Off)**
   - Toggle **Memory: Off** in the composer.
   - Send: `"Finance user opened invoice_7482.docm and PowerShell executed on FIN-WS-042 connecting to 198.51.100.45"`
   - Result: Standard generic containment advice. No past memory is recalled or saved (`is_baseline: true`).
2. **Act 2: Similar Incident (Memory On)**
   - Toggle **Memory: On**.
   - Send: `"Another Finance endpoint FIN-WS-067 observed PowerShell executing and beaconing to 198.51.100.45"`
   - Result: The assistant recalls the earlier incident, highlights the shared C2 IP `198.51.100.45`, links the campaign across Finance endpoints, and suggests containment based on organizational history.
3. **Act 3: Grounded History Inquiry**
   - Ask: `"What worked last time for phishing in Finance?"` or `"Have we seen 198.51.100.45 before?"`
   - Result: Answer is synthesized strictly from recalled memories. Click **Used N memories** to inspect the real Hindsight document IDs, text snippets, and relevance scores.
4. **Act 4: Teaching Feedback**
   - Send: `"Remember that FIN-WS-042 is the CFO's laptop, treat as high priority"`
   - Result: The assistant confirms and retains the note into Hindsight. Subsequent investigations for that host reflect this context.

---

## 📡 API Endpoints

### Chat System
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat` | Non-streaming chat endpoint returning complete `ChatResponse` |
| `POST` | `/api/chat/stream` | Server-Sent Events (SSE) streaming `status`, `token`, and `final` events |
| `GET` | `/api/chat` | List recent conversations with titles and timestamps |
| `GET` | `/api/chat/{id}` | Get messages for a specific conversation |
| `DELETE` | `/api/chat/{id}` | Delete a conversation |

### Incident Triage & Memory
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/incidents/investigate` | Full pipeline investigation (triage, IOC extraction, campaign linking) |
| `POST` | `/api/incidents/{id}/feedback` | Record containment feedback (effective/ineffective) to Hindsight |
| `GET` | `/api/incidents/history` | Auditable history of past investigated incidents |
| `GET` | `/api/memory/playbook` | Synthesized organizational playbook from Hindsight `areflect()` |
| `POST` | `/api/memory/search` | Direct semantic search across the Hindsight memory bank |
| `POST` | `/api/demo/new-session` | Initialize a fresh memory bank session for isolated testing |
| `GET` | `/api/health` | Service health status for FastAPI, Groq, and Hindsight |

---

## 🧪 Running Tests

All unit tests run completely offline using fakes and mocks (no live API keys or external network calls required):

```bash
# Run backend test suite
cd backend
pytest -q tests

# Run frontend build check
cd ../frontend
npm run build
```

---

## ⚖️ Safety, Scope & Honest Limitations

* **Defensive Purpose Only**: CyberHinsight is designed exclusively for SOC defense, triage, containment analysis, and historical inquiry. It does not generate exploits or offensive malware.
* **Synthetic Test Telemetry**: Incident demonstrations use synthetic IP addresses strictly within RFC 5737 test ranges (`198.51.100.0/24`, `203.0.113.0/24`) and private RFC 1918 networks.
* **Strict Grounding Boundaries**: Historical Q&A is strictly bound by recalled memories. If an incident or host is not in memory, the assistant explicitly states it has no record of it.
* **Context Truncation**: Chat history sent to LLM prompts is capped at the last 20 turns to prevent context exhaustion.

---

Powered by [Hindsight](https://hindsight.vectorize.io) & [Groq](https://groq.com).
