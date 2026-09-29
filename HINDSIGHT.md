# Hindsight Agent Memory Architecture in CyberHinsight

> **CyberHinsight** is an enterprise defensive security incident-response assistant that uses **Hindsight Cloud** (by Vectorize) as its persistent organizational memory layer.
>
> Unlike generic chatbots that execute static LLM playbooks, CyberHinsight remembers past security investigations, identifies multi-week attacker campaigns, and **actively learns from incident outcomes** to adapt future containment recommendations.

---

## 1. Verified SDK Capabilities & Integration Surface

Before implementation, the `hindsight-client` Python SDK (v0.10.x) was inspected to verify available parameters:

```python
from hindsight_client import Hindsight
# Verified signatures:
# Hindsight.aretain(bank_id, content, timestamp=None, context=None, document_id=None, metadata=None, entities=None, resolve_entities=None, tags=None, update_mode=None, retain_async=False, operation_id=None)
# Hindsight.arecall(bank_id, query, types=None, max_tokens=4096, budget='mid', trace=False, query_timestamp=None, include_entities=False, tags=None, tags_match='any', tag_groups=None, prefer_observations=False, min_scores=None, temporal_window=None)
# Hindsight.areflect(bank_id, query, budget='low', context=None, max_tokens=None, response_schema=None, tags=None, tags_match='any', ...)
# Hindsight.aset_mission(bank_id, mission)
# Hindsight.acreate_bank(bank_id, name=None, mission=None, ...)
```

All three core Hindsight operations—**Retain**, **Recall**, and **Reflect**—are utilized natively through asynchronous asyncio primitives without blocking the FastAPI event loop.

---

## 2. Chat Intents: What Gets Retained vs. Not Retained

CyberHinsight routes every conversation turn into one of four distinct intents with explicit retention policies:

| Intent | Description | Memory Recall | Memory Retention Policy |
|---|---|---|---|
| **`investigate`** | User provides an incident alert narrative, malware execution, or suspicious telemetry. | **Yes** (`arecall(limit=6)`) | **Conditional Retain**: Retained into Hindsight *only* if `use_memory=True` and Pydantic analysis validates successfully. Control/baseline runs (`use_memory=False`) are **never** retained and **never** stored in history. |
| **`ask_history`** | User asks questions about past incidents, seen IOCs, or previous resolutions (e.g., *"Have we seen 198.51.100.45 before?"*). | **Yes** (`arecall(limit=8)`) | **No Retain**: Strictly read-only. Answer is synthesized purely from recalled memories. Never invents incidents or infrastructure. |
| **`teach`** | Analyst provides feedback on past investigations (e.g., *"That isolation worked"*) or organizational facts (*"FIN-WS-042 is the CFO's laptop"*). | **No** (Direct ingest) | **Always Retained**: Upserted into Hindsight with tags `[analyst_note, teach]` or `[outcome, outcome:<status>]`. |
| **`general`** | General cybersecurity questions, MITRE technique explanations, or procedure questions. | **Light** (Optional context) | **No Retain**: General queries and small talk do not pollute organizational memory. |

---

## 3. What We Retain: Structured Memory Types

CyberHinsight maintains a bidirectional learning loop by retaining three structured memory types:

### A. Incident Investigation Memories
When an incident is investigated and the analysis is validated by Pydantic, the agent retains a structured summary:

```text
Incident ID: 4f9e1208-8e6d-4b52-9b21-88c9df178220
Timestamp: 2026-09-25T14:30:00Z
Summary: Phishing Email with Malicious Attachment
Severity: critical
Category: Phishing
MITRE Technique: T1566.001
Affected Asset: FIN-WS-042
Description: Finance employee clicked invoice_7482.docm, executing PowerShell...
Root Cause: Employee opened macro attachment
Findings: Obfuscated PowerShell attempting external download
Immediate Actions: Isolate endpoint FIN-WS-042; Reset user credentials; Block IP 198.51.100.45
Long-term Actions: Update mail filtering rules; Conduct security awareness training
IOCs: 198.51.100.45, invoice_7482.docm, FIN-WS-042, T1566.001
Campaign: CMP-a8b2c1d0
```

* **Document ID**: The incident's UUID is passed as `document_id` to ensure idempotency.
* **Tags Attached**: `incident`, `cat:<category>`, `sev:<severity>`, `campaign:<id>`.

### B. Outcome Feedback Memories (The Learning Signal)
CyberHinsight does not just store its own predictions—it records **what actually happened** when the containment actions were carried out.

When a SOC analyst marks a recommendation outcome via the feedback buttons or chat (*"That isolation worked"*), an outcome memory is retained with `document_id=f"{id}-outcome"`:

```text
OUTCOME for incident 4f9e1208-8e6d-4b52-9b21-88c9df178220 (Phishing, host FIN-WS-042):
Result: effective
Actions taken: Isolate endpoint FIN-WS-042; Reset user credentials; Block IP 198.51.100.45
What worked: Immediate host isolation stopped C2 beaconing before credential dump
What failed: Rebooting endpoint without network disconnect allowed persistence execution
Analyst notes: Attacker used same /24 infrastructure as previous Finance campaign.
IOCs: 198.51.100.45, FIN-WS-042
```

* **Tags Attached**: `outcome`, `outcome:<effective|partially_effective|ineffective|false_positive>`, `cat:<category>`.

### C. Analyst Notes & Asset Priority Teaching
When an analyst states a policy or priority in chat (*"Remember that FIN-WS-042 is the CFO's laptop, treat as high priority"*):

```text
ANALYST NOTE (note-a8f3b201): Remember that FIN-WS-042 is the CFO's laptop, treat as high priority
```

* **Document ID**: `note-{uuid}`
* **Tags Attached**: `analyst_note`, `teach`.

---

## 4. How Sources Are Displayed to Analysts

Every assistant turn in the chat interface displays a quiet metadata row showing the exact memory contribution:

* **Used N Memories Chip**: Shows the count of real recalled memories used in the turn. Clicking the chip expands the source drawer showing:
  * **Document ID**: The real Hindsight document ID (e.g., `DEMO-001` or `note-a8f3b201`).
  * **Relevance Match**: Bucketed from the real empirical score:
    * `Score >= 0.7`: **Strong Match**
    * `0.4 <= Score < 0.7`: **Medium Match**
    * `Score < 0.4`: **Weak Match**
  * **Snippet**: Verbatim first 200 characters of the recalled memory text.
* **No Matching Past Incidents**: Displayed when recall returns empty or memory is disabled. Never displays fabricated sources.

---

## 5. Organizational Reflection: "What I've Learned" Playbooks

The Memory page provides a synthesized organizational playbook powered by `client.areflect()`:

```python
query = (
    f"For {category} incidents in this organization, which remediation actions "
    f"were effective vs ineffective? Rank the top 5 actions with evidence "
    f"(incident IDs and hostnames). Note recurring attacker infrastructure "
    f"and timing patterns."
)
tags = [f"cat:{category.lower()}", "outcome"]
reflection = await memory_service.reflect_patterns(query, tags=tags, budget="high")
```

This distills all historical outcome memories for a threat category into plain-English containment principles (e.g., *"Isolating the endpoint before rebooting succeeded in 4 of 5 cases, while rebooting first allowed malicious persistence"*).

---

## 6. How Taught Facts Visibly Change Later Answers

1. **Analyst Statement**: Analyst chats `"Remember that FIN-WS-042 is the CFO's laptop, treat as high priority"`.
2. **Hindsight Retain**: The statement is retained with tags `[analyst_note, teach]`.
3. **Subsequent Turn**: Later, a new alert is received referencing `FIN-WS-042`.
4. **Hindsight Recall**: The note is retrieved during vector recall and injected into `<memory>` tags.
5. **Prompt Directives**: The LLM prompt specifically directs the agent to adapt severity and actions based on recalled organizational notes.
6. **Adapted Answer**: The resulting investigation elevates the incident to `CRITICAL` citing the CFO laptop ownership directly from memory.

---

## 7. Indexing Latency & The Immediate Follow-Up Guarantee

### The Latency Challenge
When an incident is investigated and retained into Hindsight Cloud (`aretain`), background indexing typically takes 1 to 3 seconds before the document becomes searchable via vector recall. If an analyst immediately follows up with *"Have we seen that IP before?"*, a naive vector search could produce a false-negative *"No record found"*.

### CyberHinsight's Multi-Tiered Solution
1. **Active Awaiting**: `wait_for_memory(query_token, timeout_s=3.0)` polls Hindsight recall briefly after retention.
2. **Visual Transparency**: The UI displays an `Indexing memory…` status chip which polls `GET /api/memory/status/{doc_id}` every 2 seconds, smoothly transitioning to `Memory indexed ✓`.
3. **Honest Local Incident Store Fallback**: If remote vector indexing has not yet finalized when an immediate query arrives, CyberHinsight checks the local in-memory incident log (`incident_store`). If matched, the result is returned with `kind="local_log"`, `score=1.0`, and full factual evidence, guaranteeing that an incident investigated seconds ago is never forgotten.

---

## 8. Two-Prong Recall & Pronoun Resolution

### Two-Prong Recall Queries
Queries like *"Have we seen 198.51.100.45 before in prior incidents?"* contain both technical indicators and conversational framing. CyberHinsight runs a two-pronged recall:
1. **Indicator Query**: Queries Hindsight directly with extracted technical tokens (e.g., `198.51.100.45`).
2. **Semantic Query**: Queries Hindsight with the full natural-language sentence.
The results are merged and deduplicated, guaranteeing technical precision alongside semantic breadth.

### Pronoun & Asset Resolution
When analysts ask conversational follow-up questions referencing pronouns (e.g., *"What did you recommend for that host?"* or *"Was that IP blocked?"*):
* The orchestrator inspects the conversation's previous assistant turn.
* If the previous turn investigated an incident with `affected_asset` (e.g., `FIN-WS-042`), the pronoun query resolves to the explicit asset context.

---

## 9. Relevance Score Floor (`MIN_RECALL_SCORE=0.15`)

To prevent irrelevant vector matches from diluting the LLM's prompt context:
* All recalled items with an empirical relevance score below `MIN_RECALL_SCORE` (default `0.15`) are discarded.
* If all recalled items fall below the threshold and no local incident matches exist, the assistant returns an honest *"I have no prior record of this indicator"* response rather than hallucinating or speculating.

---

## 10. Pattern Reflection with 60-Second Caching

For macro-level queries (e.g., *"What worked last time for phishing in Finance?"* or *"What campaign trends exist?"*):
* The orchestrator calls Hindsight's `areflect` API (`budget="mid"`, filtered by category tags).
* Responses are cached for 60 seconds to provide responsive answers while saving LLM tokens.
* The synthesized pattern is included as an `observation` source in the response metadata drawer.

