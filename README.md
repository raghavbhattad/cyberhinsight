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

Experience the core intelligence loop in 4 quick turns:

1. **Turn 1: Incident Investigation**
   - **User sends**: `"Finance user opened invoice_7482.docm, PowerShell beaconed to 198.51.100.45 on FIN-WS-042"`
   - **Assistant outputs**: A concise conversational briefing and an expandable report card.
   - **Memory action**: Extracts IOCs (`198.51.100.45`, `invoice_7482.docm`, `FIN-WS-042`), queries Hindsight, detects any active campaigns, and asynchronously indexes the investigation into Hindsight. A status chip displays `Indexing memory…` transitioning to `Memory indexed ✓`.

2. **Turn 2: Grounded Historical Inquiry (Immediate Follow-Up)**
   - **User sends**: `"Have we seen 198.51.100.45 before in prior incidents?"`
   - **Assistant outputs**: Answers strictly grounded in memory—citing Turn 1's incident and any historical matches, with zero hallucination.
   - **Memory action**: Uses two-prong recall (indicator-focused + semantic), pronoun resolution ("that host"), and seamless local store fallback if remote vector indexing is still finalizing. Click **Used N memories** to inspect document IDs, relevance scores, and snippets.

3. **Turn 3: Pattern Synthesis & What Worked**
   - **User sends**: `"What worked last time for phishing in Finance?"`
   - **Assistant outputs**: Synthesizes effective remediation strategies with specific citations of past actions and outcomes.
   - **Memory action**: Calls Hindsight `areflect` (with 60-second caching) to extract macro patterns across past incidents and analyst feedback, surfaced as an `observation` source.

4. **Turn 4: Teaching Organizational Facts & Feedback**
   - **User sends**: `"Remember that FIN-WS-042 is the CFO's laptop, treat as high priority"`
   - **Assistant outputs**: Confirms the note has been cataloged into organizational memory.
   - **Memory action**: LLM cleans and extracts entity tags (`host:fin-ws-042`) and retains into Hindsight. Any subsequent alert targeting `FIN-WS-042` recalls this fact and escalates severity accordingly.

---

## 📸 Interface Verification & Screenshots Checklist

When running the application locally (`npm run dev` + `uvicorn app.main:app`), evaluators can verify each key product state:

| Screen State | How to View / Trigger | Key Visual Elements |
|---|---|---|
| **1. Chat Home (Empty State)** | Open `http://localhost:5173` | Clean dark theme, brand header, starter scenario chips, memory toggle, active status pill |
| **2. Investigation & Indexing** | Click "Phishing + PowerShell" prompt | Conversational summary, `Indexing memory…` chip → `Memory indexed ✓`, collapsed report button |
| **3. Full Incident Dossier** | Click **"View full report"** | Severity badge, MITRE technique card, IOC tags, root cause, campaign link (`CMP-...`), immediate actions |
| **4. Grounded History & Sources** | Ask `"Have we seen 198.51.100.45 before?"` | Direct factual answer, **"Used N memories"** pill, drawer with document IDs, match percentages, and text snippets |
| **5. Pattern Reflection** | Ask `"What worked last time for phishing?"` | Plain-English organizational insights, `observation` source chip from Hindsight `areflect()` |
| **6. Memory Bank & Playbook** | Click **"Hindsight Memory"** in sidebar | Searchable memory bank, live vector status, category playbooks synthesized with evidence |

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
| `GET` | `/api/memory/status/{doc_id}` | Polling endpoint for real-time document indexing status |
| `GET` | `/api/memory/playbook` | Synthesized organizational playbook from Hindsight `areflect()` |
| `POST` | `/api/memory/search` | Direct semantic search across the Hindsight memory bank |
| `POST` | `/api/demo/new-session` | Initialize a fresh memory bank session for isolated testing |
| `GET` | `/api/health` | Service health status for FastAPI, Groq, and Hindsight |

---

## 🧪 Running Tests & Local State Reset

All unit tests run completely offline using fakes and mocks (no live API keys or external network calls required):

```bash
# Run backend test suite (all 28 tests offline)
cd backend
.venv\Scripts\python -m pytest -q tests

# Run frontend build check
cd ../frontend
npm run build

# Reset local state between demo runs
cd ..
python scripts/reset_local_state.py
```

---

## ⚖️ Safety, Scope & Honest Limitations

* **Defensive Purpose Only**: CyberHinsight is designed exclusively for SOC defense, triage, containment analysis, and historical inquiry. It does not generate exploits or offensive malware.
* **Synthetic Test Telemetry**: Incident demonstrations use synthetic IP addresses strictly within RFC 5737 test ranges (`198.51.100.0/24`, `203.0.113.0/24`) and private RFC 1918 networks.
* **Strict Grounding Boundaries**: Historical Q&A is strictly bound by recalled memories. If an incident or host is not in memory, the assistant explicitly states it has no record of it.
* **Relevance Score Floor**: Memories recalled from Hindsight are filtered through a `MIN_RECALL_SCORE=0.15` floor to eliminate low-confidence vector noise before LLM prompting.
* **Asynchronous Indexing Latency**: Remote vector ingestion in Hindsight Cloud typically requires 1–3 seconds to index. CyberHinsight handles this transparently through client-side indexing indicators (`Memory indexed ✓`) and an honest in-memory local incident log fallback to ensure immediate follow-up queries never produce false negatives.
* **Context Window Budget**: Multi-turn chat history passed to inference models is bounded to the 8 most recent conversation turns with memory blocks restricted to the final prompt turn to avoid token bloat.

---

Powered by [Hindsight](https://hindsight.vectorize.io) & [Groq](https://groq.com).
