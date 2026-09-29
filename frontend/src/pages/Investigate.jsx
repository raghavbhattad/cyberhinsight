import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { investigateIncident } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import MemoryCard from '../components/MemoryCard';
import { StatusBadge } from '../components/StatusBadge';
import { 
  Brain, 
  Search, 
  ShieldAlert, 
  AlertCircle, 
  CheckCircle2, 
  Zap, 
  FileText, 
  Server, 
  GitMerge,
  Terminal,
  Layers,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Cpu,
  Crosshair
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const DEMO_ACTS = [
  {
    act: 'ACT 1',
    badge: 'FIRST INCIDENT · BASELINE',
    title: 'Phishing + PowerShell (FIN-WS-042)',
    desc: 'Employee clicks invoice.docm. PowerShell beacons to external IP 203.0.113.45. No prior memory exists in Hindsight.',
    text: "Finance department employee received a suspicious email with an attachment. Upon opening, PowerShell was observed executing on the endpoint FIN-WS-042. The process spawned cmd.exe and attempted to download files from an external IP 203.0.113.45. Credentials for the user account may have been compromised."
  },
  {
    act: 'ACT 2',
    badge: 'SECOND INCIDENT · HINDSIGHT RECALL',
    title: 'Secondary Subnet Attack (FIN-WS-067)',
    desc: 'Another Finance workstation encounters the same campaign. Hindsight recalls FIN-WS-042 and generates an adapted subnet block.',
    text: "Another Finance employee on endpoint FIN-WS-067 reported a suspicious email. Similar PowerShell activity detected. Connection attempts to IP range 203.0.113.0/24 observed. Employee had access to financial reporting systems."
  },
  {
    act: 'ACT 3',
    badge: 'ACT 3 · ESCALATED THREAT',
    title: 'Ransomware Mutation (HR-WS-015)',
    desc: 'Mutated macro campaign attempting volume shadow copy deletion and .encrypted extension changes.',
    text: "IT detected unusual file encryption activity on endpoint HR-WS-015 in the Human Resources department. Multiple files being renamed with .encrypted extension. Process tree shows origin from a macro-enabled document received via email."
  }
];

const Investigate = () => {
  const [searchParams] = useSearchParams();
  const [description, setDescription] = useState('');
  const [useMemory, setUseMemory] = useState(true);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [loadingPhase, setLoadingPhase] = useState('');
  const [result, setResult] = useState(null);
  const [baselineResult, setBaselineResult] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [viewMode, setViewMode] = useState('standard'); // 'standard' | 'comparison'
  const [error, setError] = useState(null);
  const [activeDemoAct, setActiveDemoAct] = useState(null);

  // Auto-load Act 1 if ?demo=true in URL
  useEffect(() => {
    if (searchParams.get('demo') === 'true' && !description) {
      loadScenario(DEMO_ACTS[0]);
    }
  }, [searchParams]);

  const loadScenario = (scenario) => {
    setDescription(scenario.text);
    setActiveDemoAct(scenario.act);
    setResult(null);
    setBaselineResult(null);
    setViewMode('standard');
    setCurrentStep(1);
  };

  const handleInvestigate = async (e) => {
    e?.preventDefault();
    if (!description.trim()) return;

    setLoading(true);
    setResult(null);
    setBaselineResult(null);
    setViewMode('standard');
    setError(null);
    setCurrentStep(2);
    
    try {
      setLoadingPhase('Step 2/6: Extracting threat entities & MITRE ATT&CK techniques with Groq LLM...');
      
      const stepTimer1 = setTimeout(() => {
        if (useMemory) {
          setCurrentStep(3);
          setLoadingPhase('Step 3/6: Querying Hindsight Cloud Vector Memory for historical incidents...');
        }
      }, 1200);

      const stepTimer2 = setTimeout(() => {
        if (useMemory) {
          setCurrentStep(4);
          setLoadingPhase('Step 4/6: Synthesizing historical resolutions & organizational precedents...');
        }
      }, 2400);

      const res = await investigateIncident(description, useMemory);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      setCurrentStep(5);
      setLoadingPhase('Step 5/6: Generating memory-informed containment actions...');
      
      setResult(res.data);
      setCurrentStep(6);
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred during incident investigation.');
      setCurrentStep(1);
    } finally {
      setLoading(false);
      setLoadingPhase('');
    }
  };

  const handleCompareWithBaseline = async () => {
    if (!description.trim() || !result) return;
    if (baselineResult) {
      setViewMode(viewMode === 'comparison' ? 'standard' : 'comparison');
      return;
    }
    setComparing(true);
    try {
      const res = await investigateIncident(description, false);
      setBaselineResult(res.data);
      setViewMode('comparison');
    } catch (err) {
      console.error('Comparison error:', err);
    } finally {
      setComparing(false);
    }
  };

  const MarkdownText = ({ text }) => (
    <div className="prose prose-invert max-w-none text-sm text-primary">
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );

  return (
    <div className="investigate-page">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge badge-memory">AUTONOMOUS INVESTIGATION CONSOLE</span>
            <span className="text-xs text-muted font-mono">SOC TIER 3 WORKFLOW</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Investigate Security Incident</h2>
          <p className="text-secondary text-sm">
            Analyze raw telemetry, EDR execution traces, or email alerts using Groq and persistent Hindsight memory.
          </p>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2 font-mono text-xs text-secondary bg-input px-3 py-1.5 rounded-md border border-subtle">
          <Brain size={14} className="text-cyan" />
          <span>Hindsight Recall: <strong className="text-cyan">{useMemory ? 'ACTIVE' : 'DISABLED'}</strong></span>
        </div>
      </div>

      {/* 6-Step Visual Timeline / Progress Stepper (Requirement #3) */}
      <div className="stepper-container">
        <div className={`step-item ${currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : ''}`}>
          <div className="step-number">{currentStep > 1 ? '✓' : '1'}</div>
          <span>Alert Ingestion</span>
        </div>
        <span className="step-arrow">➔</span>

        <div className={`step-item ${currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : ''}`}>
          <div className="step-number">{currentStep > 2 ? '✓' : '2'}</div>
          <span>AI Extraction</span>
        </div>
        <span className="step-arrow">➔</span>

        <div className={`step-item ${currentStep === 3 ? 'active' : currentStep > 3 ? 'completed' : ''}`}>
          <div className="step-number">{currentStep > 3 ? '✓' : '3'}</div>
          <span>Hindsight Recall</span>
        </div>
        <span className="step-arrow">➔</span>

        <div className={`step-item ${currentStep === 4 ? 'active' : currentStep > 4 ? 'completed' : ''}`}>
          <div className="step-number">{currentStep > 4 ? '✓' : '4'}</div>
          <span>Precedents Found</span>
        </div>
        <span className="step-arrow">➔</span>

        <div className={`step-item ${currentStep === 5 ? 'active' : currentStep > 5 ? 'completed' : ''}`}>
          <div className="step-number">{currentStep > 5 ? '✓' : '5'}</div>
          <span>Adaptive Defense</span>
        </div>
        <span className="step-arrow">➔</span>

        <div className={`step-item ${currentStep === 6 ? 'completed' : ''}`}>
          <div className="step-number">{currentStep === 6 ? '✓' : '6'}</div>
          <span>Memory Retained</span>
        </div>
      </div>

      {/* Interactive Hackathon Demo Bar (Requirement #9) */}
      <div className="card p-4 border-cyan" style={{ background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.05) 0%, rgba(14, 21, 38, 0.9) 100%)' }}>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-cyan" />
            <span className="text-xs font-bold uppercase tracking-wider text-cyan">
              Deterministic Hackathon Demo Sequence (1-Minute Story)
            </span>
          </div>
          <span className="text-xs text-muted font-mono">
            Click Act 1 ➔ Investigate ➔ Then click Act 2 to prove Hindsight recall!
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {DEMO_ACTS.map((demo) => (
            <div 
              key={demo.act}
              className={`p-3 rounded-md border cursor-pointer transition-all ${activeDemoAct === demo.act ? 'border-cyan bg-cyan-950/40 shadow-lg' : 'border-subtle bg-input hover:border-gray-600'}`}
              onClick={() => loadScenario(demo)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono font-bold text-cyan">{demo.act}</span>
                <span className="text-[0.65rem] font-mono text-muted uppercase">{demo.badge}</span>
              </div>
              <h4 className="text-xs font-bold text-primary mb-1">{demo.title}</h4>
              <p className="text-[0.72rem] text-secondary leading-snug">{demo.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Incident Input Card */}
      <div className="card">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-2">
            <Terminal size={14} className="text-cyan" />
            Security Incident Narrative / Raw EDR Telemetry
          </label>
          <span className="text-xs text-muted font-mono">RFC 5737 Synthetic Defensive Data</span>
        </div>
        
        <textarea
          className="textarea"
          placeholder="Paste raw EDR telemetry, SIEM alert narrative, PowerShell command strings, or suspicious email reports here..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
        />

        <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
          <label className="toggle-container">
            <input 
              type="checkbox" 
              checked={useMemory} 
              onChange={(e) => setUseMemory(e.target.checked)} 
            />
            <div className="toggle-switch"></div>
            <div className="flex items-center gap-2">
              <Brain size={16} className={useMemory ? "text-cyan" : "text-muted"} />
              <span className={`text-xs font-semibold uppercase tracking-wider ${useMemory ? 'text-cyan' : 'text-muted'}`}>
                Query & Retain with Hindsight
              </span>
            </div>
          </label>

          <button 
            type="button"
            className="btn btn-primary" 
            onClick={handleInvestigate}
            disabled={loading || !description.trim()}
          >
            {loading ? <RefreshCw className="animate-spin" size={16} /> : <Crosshair size={16} />}
            <span>{loading ? 'Investigating...' : 'Investigate Incident'}</span>
          </button>
        </div>
      </div>

      {/* Loading State with Phase Description */}
      {loading && (
        <div className="card p-10 flex flex-col items-center justify-center text-center">
          <LoadingSpinner message={loadingPhase} />
          <p className="text-xs font-mono text-cyan mt-3 animate-pulse">
            Neural pipeline active · Connecting Groq Inference + Hindsight Vector Bank
          </p>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="card error-state p-4 flex items-start gap-3">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm mb-1">Investigation Execution Error</h4>
            <p className="text-xs font-mono">{error}</p>
          </div>
        </div>
      )}

      {/* Results Section */}
      {result && !loading && (
        <div className="results-section">
          {/* Memory Retain Success Banner */}
          {result.memory_stored && (
            <div className="success-banner">
              <CheckCircle2 size={18} className="flex-shrink-0" />
              <span>
                <strong>Persistent Intelligence Logged:</strong> This incident investigation and containment outcome have been securely stored in Hindsight memory bank <code className="font-mono text-xs bg-black/30 px-1 py-0.5 rounded">cyberhinsight</code>.
              </span>
            </div>
          )}

          {/* Mode Switcher: Comprehensive vs Live Before/After Comparison */}
          <div className="flex items-center justify-between flex-wrap gap-3 p-3 bg-secondary border border-color rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-secondary uppercase tracking-wider">Analysis Mode:</span>
              <button 
                type="button" 
                className={`btn btn-sm ${viewMode === 'standard' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setViewMode('standard')}
              >
                Comprehensive SOC View
              </button>
              <button 
                type="button" 
                className={`btn btn-sm ${viewMode === 'comparison' ? 'btn-primary' : 'btn-secondary'} flex items-center gap-1.5`}
                onClick={handleCompareWithBaseline}
                disabled={comparing}
                style={viewMode === 'comparison' ? { backgroundColor: 'var(--accent-cyan)', color: '#000' } : {}}
              >
                <Zap size={14} />
                {comparing ? 'Synthesizing Baseline...' : '⚡ Before / After Memory Comparison'}
              </button>
            </div>
            
            {result.recommendations.adapted_from_memory && (
              <span className="badge badge-memory" style={{ gap: '0.4rem' }}>
                <Brain size={14} />
                <span>Hindsight Intelligence Active ({result.memory_matches?.length || 0} Matches)</span>
              </span>
            )}
          </div>

          {/* Comparison Mode: Live Side-by-Side (Requirement #7) */}
          {viewMode === 'comparison' && baselineResult ? (
            <div className="card p-6 border-cyan">
              <div className="flex items-center justify-between mb-4 pb-3 border-b flex-wrap gap-2" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex items-center gap-2">
                  <Zap size={20} className="text-amber-400" />
                  <h3 className="text-lg font-bold text-primary">Live Before vs. After Memory Comparison</h3>
                </div>
                <span className="text-xs text-secondary font-mono bg-input px-3 py-1 rounded border border-subtle">
                  Same Security Alert Evaluated With & Without Hindsight
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Baseline Column (Without Memory) */}
                <div className="card bg-bg-input border-red-500/30 p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                    <span className="font-bold text-red-400 flex items-center gap-2 text-sm">
                      <span className="pulse-dot critical"></span>
                      WITHOUT MEMORY (Generic Playbook)
                    </span>
                    <span className="badge badge-critical" style={{ fontSize: '0.65rem' }}>Standard Baseline</span>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-muted block mb-1 uppercase tracking-wider font-mono">
                      Hindsight Recall Context:
                    </span>
                    <div className="text-xs text-muted italic bg-bg-card p-3 rounded border border-dashed border-gray-700">
                      Zero historical context available. The agent analyzes the incident in complete isolation without knowledge of previous attacks on this subnet.
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-muted block mb-1 uppercase tracking-wider font-mono">
                      Standard Playbook Immediate Actions:
                    </span>
                    <ul className="action-list text-xs text-secondary">
                      {baselineResult.recommendations.immediate_actions.map((act, i) => (
                        <li key={i}><MarkdownText text={act} /></li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-auto pt-3 border-t border-gray-800">
                    <span className="text-[0.68rem] font-semibold text-muted block mb-1 uppercase font-mono">Decision Basis:</span>
                    <p className="text-xs text-muted italic">
                      Standard generic playbook for {baselineResult.incident.category}. Missing recurring attacker IP range awareness.
                    </p>
                  </div>
                </div>

                {/* Memory-Enhanced Column (With Memory) */}
                <div className="card bg-bg-input p-5 flex flex-col gap-4 shadow-xl border-cyan" style={{ borderColor: 'var(--accent-cyan)' }}>
                  <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                    <span className="font-bold text-cyan flex items-center gap-2 text-sm">
                      <Brain size={16} />
                      WITH HINDSIGHT MEMORY (Adaptive Defense)
                    </span>
                    <span className="badge badge-memory" style={{ fontSize: '0.65rem' }}>✨ Context Aware</span>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-cyan block mb-1 uppercase tracking-wider font-mono">
                      Recalled Precedents ({result.memory_matches?.length || 0} Matches):
                    </span>
                    <div className="text-xs text-primary bg-bg-card p-3 rounded border border-cyan-900/50 max-h-36 overflow-y-auto">
                      {result.memory_matches && result.memory_matches.length > 0 ? (
                        result.memory_matches.map((m, i) => (
                          <div key={i} className="mb-2 last:mb-0 pb-2 border-b border-gray-800 last:border-b-0">
                            <span className="font-semibold text-cyan font-mono text-[0.7rem]">Memory #{i+1}: </span>
                            <span className="text-secondary text-xs">{m.text}</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-muted italic">No prior matches found.</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-cyan block mb-1 uppercase tracking-wider font-mono">
                      Tailored Countermeasures:
                    </span>
                    <ul className="action-list text-xs text-secondary">
                      {result.recommendations.immediate_actions.map((act, i) => (
                        <li key={i} className="text-primary font-medium"><MarkdownText text={act} /></li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-auto pt-3 border-t border-gray-800 bg-cyan-950/20 -mx-5 -mb-5 p-4 rounded-b-md">
                    <span className="text-[0.68rem] font-semibold text-cyan block mb-1 uppercase font-mono">
                      Why Memory Changed This:
                    </span>
                    <p className="text-xs text-cyan-100 italic leading-relaxed">
                      {result.recommendations.why_these_recommendations || "Adapted based on organizational patterns and historical resolution outcomes."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Comprehensive SOC Results Grid */
            <div className="results-grid">
              {/* Left Column: Summary + Hindsight Memories */}
              <div className="flex flex-col gap-6">
                
                {/* Incident Summary Card */}
                <div className="card">
                  <div className="section-title">
                    <FileText size={15} /> Security Incident Telemetry
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <StatusBadge severity={result.incident.severity} />
                      <span className="font-bold text-base text-primary">{result.incident.category}</span>
                      <span className="text-xs font-mono text-muted ml-auto">
                        Confidence: {(result.incident.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-sm text-secondary leading-relaxed">{result.incident.summary}</p>
                  </div>

                  <div className="divider"></div>

                  <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                    <div>
                      <span className="text-muted block text-[0.68rem] uppercase mb-1">Target Endpoint / Asset</span>
                      <div className="flex items-center gap-2 text-primary bg-input p-2 rounded border border-subtle">
                        <Server size={13} className="text-cyan" />
                        <span>{result.incident.affected_asset || 'FIN-WS-ENDPOINT'}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-muted block text-[0.68rem] uppercase mb-1">MITRE ATT&CK Matrix</span>
                      <div className="flex items-center gap-2 text-primary bg-input p-2 rounded border border-subtle">
                        <Terminal size={13} className="text-accent" />
                        <span>{result.incident.mitre_technique || 'T1566.001'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {result.incident.indicators && result.incident.indicators.length > 0 && (
                    <div className="mt-4">
                      <span className="text-muted block text-[0.68rem] uppercase font-mono mb-2">Indicators of Compromise (IoCs)</span>
                      <div className="flex flex-wrap gap-2">
                        {result.incident.indicators.map((ioc, i) => (
                          <span key={i} className="tag">{ioc}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Hindsight Memory Card (Visual Centerpiece) */}
                <div className="card border-cyan" style={{ background: 'linear-gradient(145deg, rgba(0, 240, 255, 0.05) 0%, rgba(14, 21, 38, 0.95) 100%)' }}>
                  <div className="section-title text-cyan" style={{ color: 'var(--accent-cyan)' }}>
                    <Brain size={16} /> 
                    <span>Hindsight Persistent Memory</span>
                    {result.memory_matches && result.memory_matches.length > 0 && 
                      <span className="badge badge-memory ml-auto">
                        {result.memory_matches.length} Historical Precedents
                      </span>
                    }
                  </div>

                  {!useMemory ? (
                    <div className="text-xs text-muted italic p-4 text-center bg-input rounded border border-dashed border-gray-700">
                      Hindsight memory search was toggled off for this analysis.
                    </div>
                  ) : result.memory_matches && result.memory_matches.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      <p className="text-xs text-cyan font-mono mb-1">
                        ✓ Semantic vector search matched previous investigations in this memory bank:
                      </p>
                      {result.memory_matches.map((match, i) => (
                        <MemoryCard key={i} memory={match} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted p-5 text-center bg-input rounded border border-dashed border-gray-700">
                      <Brain size={28} className="mx-auto mb-2 text-cyan opacity-40" />
                      <p className="font-semibold text-primary mb-1">First Incident of this Pattern</p>
                      <span>No prior memory matches found. This incident has now been retained as the baseline memory for future similar alerts.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: AI Analysis & Recommendations */}
              <div className="flex flex-col gap-6">
                
                {/* AI Root Cause & Findings */}
                <div className="card">
                  <div className="section-title">
                    <Search size={15} /> Threat Diagnostics & Investigation
                  </div>
                  
                  <div className="mb-4">
                    <h4 className="text-xs font-bold text-primary uppercase font-mono mb-1.5 flex items-center gap-1.5">
                      <GitMerge size={14} className="text-purple-400" /> Root Cause Analysis
                    </h4>
                    <div className="bg-input p-3 rounded text-xs text-secondary border border-subtle">
                      <MarkdownText text={result.analysis.root_cause} />
                    </div>
                  </div>

                  <div className="mb-4">
                    <h4 className="text-xs font-bold text-primary uppercase font-mono mb-1.5">
                      Detailed Findings
                    </h4>
                    <div className="text-xs text-secondary leading-relaxed">
                      <MarkdownText text={result.analysis.investigation_findings} />
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-primary uppercase font-mono mb-1.5">
                      Risk Evaluation
                    </h4>
                    <div className="text-xs text-secondary leading-relaxed">
                      <MarkdownText text={result.analysis.risk_assessment} />
                    </div>
                  </div>
                </div>

                {/* Recommended Actions (Requirement #5) */}
                <div className="card border-cyan">
                  <div className="section-title text-cyan" style={{ color: 'var(--accent-cyan)' }}>
                    <Zap size={15} /> Autonomous Action Playbook
                  </div>

                  {result.recommendations.adapted_from_memory && (
                    <div className="memory-banner mb-4">
                      <Brain size={18} className="flex-shrink-0" />
                      <div>
                        <span className="block font-bold text-xs uppercase tracking-wider">
                          Context-Aware Countermeasures Active
                        </span>
                        <span className="text-xs opacity-90 font-normal">
                          Recommendations adapted using historical containment outcomes recalled from Hindsight.
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="mb-4">
                    <h4 className="text-xs font-bold uppercase font-mono mb-2.5 text-red-400">
                      Immediate Tactical Containment
                    </h4>
                    <ul className="action-list text-xs text-secondary">
                      {result.recommendations.immediate_actions.map((action, i) => (
                        <li key={i}><MarkdownText text={action} /></li>
                      ))}
                    </ul>
                  </div>

                  <div className="mb-4">
                    <h4 className="text-xs font-bold uppercase font-mono mb-2.5 text-blue-400">
                      Strategic Hardening & Post-Incident
                    </h4>
                    <ul className="action-list text-xs text-secondary">
                      {result.recommendations.long_term_actions.map((action, i) => (
                        <li key={i}><MarkdownText text={action} /></li>
                      ))}
                    </ul>
                  </div>

                  <div className="divider"></div>
                  
                  <div className="bg-input p-3.5 rounded border border-subtle">
                    <h4 className="text-xs font-bold text-cyan uppercase font-mono mb-1 flex items-center gap-1.5">
                      <Sparkles size={13} />
                      Why these recommendations were chosen
                    </h4>
                    <div className="text-xs text-secondary italic leading-relaxed">
                      <MarkdownText text={result.recommendations.why_these_recommendations} />
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Investigate;
