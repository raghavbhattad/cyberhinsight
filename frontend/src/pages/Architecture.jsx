import React from 'react';
import { 
  Monitor, 
  Server, 
  Brain, 
  Cpu, 
  ArrowRight, 
  ArrowDown, 
  Zap, 
  ShieldCheck, 
  Layers, 
  Terminal, 
  Radio, 
  CheckCircle2,
  GitBranch,
  Network
} from 'lucide-react';

const Architecture = () => {
  return (
    <div className="architecture-page">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="badge badge-memory">TECHNICAL SYSTEM SPECIFICATION</span>
          <span className="text-xs text-muted font-mono">AGENT PIPELINE v1.0</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight">CyberHinsight Defense Architecture</h2>
        <p className="text-secondary text-sm">
          Autonomous SOC agent orchestration powered by Groq ultra-low-latency inference and Hindsight persistent vector memory.
        </p>
      </div>

      {/* Interactive System Canvas */}
      <div className="arch-canvas">
        {/* Tier 1: Presentation & SOC Interface */}
        <div className="arch-tier">
          <div className="arch-block">
            <span className="arch-badge">TIER 1 · TELEMETRY INGESTION</span>
            <div className="flex items-center gap-2">
              <Monitor size={18} className="text-cyan" />
              <h3 className="arch-title">React 18 SOC Console</h3>
            </div>
            <p className="arch-desc">
              Vite + Plain CSS Modules. Real-time SOC dashboard, 6-step live investigation pipeline, and before/after comparison engine.
            </p>
            <div className="tag font-mono text-[0.65rem] mt-1">PORT 5173 · ZERO TAILWIND</div>
          </div>
        </div>

        {/* Connector */}
        <div className="arch-connector-down">
          <div className="arch-line-vertical"></div>
          <span>HTTP / JSON (REST API)</span>
          <div className="arch-line-vertical"></div>
        </div>

        {/* Tier 2: Agent Orchestration Core */}
        <div className="arch-tier">
          <div className="arch-block highlight" style={{ width: '380px' }}>
            <span className="arch-badge">TIER 2 · AGENTIC ORCHESTRATION</span>
            <div className="flex items-center gap-2">
              <Server size={18} className="text-cyan" />
              <h3 className="arch-title">FastAPI Security Agent Engine</h3>
            </div>
            <p className="arch-desc">
              Asynchronous Python 3.13 backend. Coordinates Hindsight semantic recall, builds memory-enriched prompt templates, parses structured JSON diagnostics, and manages retain lifecycles.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="tag text-[0.65rem]">PORT 8000</span>
              <span className="tag text-[0.65rem]">ASYNCIO EVENT LOOP</span>
              <span className="tag text-[0.65rem]">PYDANTIC V2</span>
            </div>
          </div>
        </div>

        {/* Connector */}
        <div className="arch-connector-down">
          <div className="arch-line-vertical"></div>
          <span>PARALLEL INTELLIGENCE PIPELINE</span>
          <div className="arch-line-vertical"></div>
        </div>

        {/* Tier 3: Dual Intelligence Cores */}
        <div className="arch-tier" style={{ gap: '3rem' }}>
          {/* Groq Inference */}
          <div className="arch-block" style={{ width: '320px' }}>
            <span className="arch-badge" style={{ color: 'var(--accent-purple)' }}>
              LLM INFERENCE ENGINE
            </span>
            <div className="flex items-center gap-2">
              <Cpu size={18} className="text-purple-400" />
              <h3 className="arch-title">Groq LLM Acceleration</h3>
            </div>
            <p className="arch-desc">
              Model: <code className="text-primary font-mono text-xs">openai/gpt-oss-120b</code>. Generates MITRE ATT&CK mappings, root cause analysis, and memory-adapted containment playbooks.
            </p>
            <span className="tag font-mono text-[0.65rem] mt-1 text-purple-300">SUB-SECOND LATENCY</span>
          </div>

          {/* Hindsight Vector Memory Bank */}
          <div className="arch-block highlight" style={{ width: '360px', borderColor: 'var(--accent-cyan)' }}>
            <span className="arch-badge" style={{ color: 'var(--accent-cyan)' }}>
              PERSISTENT MEMORY BANK
            </span>
            <div className="flex items-center gap-2">
              <Brain size={18} className="text-cyan" />
              <h3 className="arch-title">Hindsight Cloud</h3>
            </div>
            <p className="arch-desc">
              Persistent memory bank <code className="text-primary font-mono text-xs">cyberhinsight</code>. Provides semantic vector recall, entity graph matching, and autonomous pattern reflection.
            </p>
            <span className="tag font-mono text-[0.65rem] mt-1 text-cyan">hindsight-client v0.10.1</span>
          </div>
        </div>
      </div>

      {/* The 3 Pillars of Hindsight (Hackathon Core Value) */}
      <div>
        <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
          <Brain size={20} className="text-cyan" />
          The Three Operations of Hindsight in CyberHinsight
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pillar 1: RETAIN */}
          <div className="card border-subtle hover:border-cyan">
            <div className="flex items-center justify-between mb-3">
              <span className="badge badge-memory">OPERATION 01</span>
              <span className="text-xs font-mono text-muted">client.aretain()</span>
            </div>
            <h4 className="text-base font-bold text-primary mb-2">1. Autonomous Retain</h4>
            <p className="text-xs text-secondary leading-relaxed mb-3">
              Every completed incident investigation—including detected attack vectors, root cause findings, and validated containment actions—is automatically converted into high-dimensional embeddings and stored in Hindsight Cloud.
            </p>
            <div className="p-2.5 rounded bg-input text-[0.7rem] font-mono text-cyan border border-subtle">
              Incident summary + IoCs + Remediation ➔ Vector Index
            </div>
          </div>

          {/* Pillar 2: RECALL */}
          <div className="card border-cyan" style={{ background: 'linear-gradient(145deg, rgba(0, 240, 255, 0.05) 0%, rgba(14, 21, 38, 0.95) 100%)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="badge badge-memory">OPERATION 02 · CORE</span>
              <span className="text-xs font-mono text-muted">client.arecall()</span>
            </div>
            <h4 className="text-base font-bold text-cyan mb-2">2. Contextual Recall</h4>
            <p className="text-xs text-secondary leading-relaxed mb-3">
              When a new security alert is ingested, CyberHinsight executes parallel semantic recall across past incidents. It identifies repeat adversary infrastructure, identical PowerShell scripts, or targeted departmental assets.
            </p>
            <div className="p-2.5 rounded bg-input text-[0.7rem] font-mono text-primary border border-cyan-800">
              Query ➔ TEMPR Semantic Search ➔ Top Relevant Precedents
            </div>
          </div>

          {/* Pillar 3: REFLECT */}
          <div className="card border-subtle hover:border-cyan">
            <div className="flex items-center justify-between mb-3">
              <span className="badge badge-memory">OPERATION 03</span>
              <span className="text-xs font-mono text-muted">client.areflect()</span>
            </div>
            <h4 className="text-base font-bold text-primary mb-2">3. Strategic Reflection</h4>
            <p className="text-xs text-secondary leading-relaxed mb-3">
              Beyond individual incident recall, Hindsight synthesizes high-level organizational insights. Analysts can query the memory bank to discover recurring attack trends, systemic vulnerabilities, and historical containment effectiveness.
            </p>
            <div className="p-2.5 rounded bg-input text-[0.7rem] font-mono text-accent border border-subtle">
              Analytical Inquiry ➔ Pattern Synthesis Across Memory Bank
            </div>
          </div>
        </div>
      </div>

      {/* Technical Specifications Table */}
      <div className="card p-6">
        <h4 className="text-sm font-bold text-primary uppercase font-mono mb-4 flex items-center gap-2">
          <Terminal size={15} className="text-cyan" />
          Technical Stack Specifications
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className="border-b border-gray-800 text-muted uppercase text-[0.68rem]">
                <th className="pb-3">Component</th>
                <th className="pb-3">Technology</th>
                <th className="pb-3">Role in CyberHinsight</th>
                <th className="pb-3">Protocol / Integration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-secondary">
              <tr>
                <td className="py-3 text-primary font-bold">Frontend UI</td>
                <td className="py-3 text-cyan">React 18 + Vite</td>
                <td className="py-3">Tactical SOC Dashboard & Investigation Workflow</td>
                <td className="py-3">Vite Proxy ➔ http://localhost:8000</td>
              </tr>
              <tr>
                <td className="py-3 text-primary font-bold">Backend API</td>
                <td className="py-3 text-cyan">Python 3.13 + FastAPI</td>
                <td className="py-3">Asynchronous agent orchestrator and schema validation</td>
                <td className="py-3">RESTful JSON endpoints</td>
              </tr>
              <tr>
                <td className="py-3 text-primary font-bold">Vector Memory</td>
                <td className="py-3 text-cyan">Hindsight Cloud API</td>
                <td className="py-3">Persistent organizational memory (Retain, Recall, Reflect)</td>
                <td className="py-3">hindsight-client v0.10.1 (asyncio)</td>
              </tr>
              <tr>
                <td className="py-3 text-primary font-bold">LLM Inference</td>
                <td className="py-3 text-cyan">Groq Cloud</td>
                <td className="py-3">Sub-second threat analysis and recommendation generation</td>
                <td className="py-3">Groq Python SDK</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Architecture;
