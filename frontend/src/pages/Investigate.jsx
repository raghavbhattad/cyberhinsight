import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  investigateIncident, 
  submitFeedback, 
  startNewDemoSession 
} from '../services/api';
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
  Crosshair,
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Network,
  Radio
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const DEMO_ACTS = [
  {
    act: 'ACT 1',
    badge: 'FIRST INCIDENT · BASELINE',
    title: 'Phishing + PowerShell (FIN-WS-042)',
    desc: 'Employee clicks invoice_7482.docm. PowerShell beacons to external IP 198.51.100.45. No prior memory exists in Hindsight.',
    text: "At 14:30Z, a user in Finance reported a suspicious email masquerading as a vendor invoice. The user downloaded and opened the attached 'invoice_7482.docm' file, which executed a PowerShell script upon enabling macros. The script attempted to harvest credentials and beaconed out to a suspicious IP (198.51.100.45) on endpoint FIN-WS-042."
  },
  {
    act: 'ACT 2',
    badge: 'SECOND INCIDENT · HINDSIGHT RECALL',
    title: 'Secondary Subnet Attack (FIN-WS-088)',
    desc: 'Another Finance workstation encounters the same campaign. Hindsight recalls FIN-WS-042, links campaign, and generates an adapted subnet block.',
    text: "Another Finance endpoint FIN-WS-088 exhibited suspicious behavior shortly after the initial incident. A PowerShell process (powershell.exe -ep bypass -w hidden) was spawned by Microsoft Word, indicating another successful phishing payload execution. The process established a connection to external IP 198.51.100.48 (same /24 subnet). Employee had access to financial reporting systems."
  },
  {
    act: 'ACT 3',
    badge: 'ACT 3 · ESCALATED THREAT',
    title: 'Ransomware Mutation (FIN-WS-012)',
    desc: 'Escalated variant of the phishing payload modifying file extensions to .crypt and deleting shadow copies. Grounded in campaign memory.',
    text: "An escalated variant of the previous phishing payload was executed on a third Finance machine FIN-WS-012. After initial execution, the malware began modifying file extensions to '.crypt' and attempting to delete volume shadow copies via vssadmin.exe. Connections to command and control server at 198.51.100.50 were observed."
  }
];

const Investigate = () => {
  const [searchParams] = useSearchParams();
  const [description, setDescription] = useState('');
  const [useMemory, setUseMemory] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [baselineResult, setBaselineResult] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [viewMode, setViewMode] = useState('standard'); // 'standard' | 'comparison'
  const [error, setError] = useState(null);
  const [activeDemoAct, setActiveDemoAct] = useState(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [sessionMessage, setSessionMessage] = useState('');

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
    setFeedbackSubmitted(null);
  };

  const handleInvestigate = async (e) => {
    e?.preventDefault();
    if (!description.trim()) return;

    setLoading(true);
    setResult(null);
    setBaselineResult(null);
    setViewMode('standard');
    setError(null);
    setFeedbackSubmitted(null);

    try {
      const res = await investigateIncident(description, useMemory);
      setResult(res.data);
    } catch (err) {
      setError(
        err.response?.data?.detail || 
        'An error occurred during incident investigation. Check backend connection.'
      );
    } finally {
      setLoading(false);
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
      setError('Comparison failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setComparing(false);
    }
  };

  const handleFeedback = async (outcome) => {
    if (!result?.id) return;
    setFeedbackLoading(true);
    try {
      const payload = {
        outcome,
        actions_taken: result.recommendations?.immediate_actions || [],
        what_worked: outcome === 'effective' ? 'Recommendations were successful' : '',
        what_failed: outcome === 'ineffective' ? 'Recommended action failed to contain threat' : '',
        analyst_notes: `Analyst feedback submitted via SOC Console for incident ${result.id}`,
      };
      await submitFeedback(result.id, payload);
      setFeedbackSubmitted(outcome);
    } catch (err) {
      console.error('Feedback submission error:', err);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleStartFreshSession = async () => {
    setLoading(true);
    try {
      const res = await startNewDemoSession();
      setSessionMessage(`Cold start initialized: ${res.data.bank_id}. Memory is clean.`);
      setResult(null);
      setBaselineResult(null);
      setActiveDemoAct(null);
      setDescription('');
      setTimeout(() => setSessionMessage(''), 5000);
    } catch (err) {
      setError('Could not start fresh session: ' + err.message);
    } finally {
      setLoading(false);
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

        {/* Top Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleStartFreshSession}
            disabled={loading}
            title="Create a fresh isolated memory bank for a clean demo"
          >
            <RefreshCw size={13} />
            <span>Fresh Cold Start</span>
          </button>

          <div className="flex items-center gap-2 font-mono text-xs text-secondary bg-input px-3 py-1.5 rounded-md border border-subtle">
            <Brain size={14} className="text-cyan" />
            <span>Hindsight Recall: <strong className="text-cyan">{useMemory ? 'ACTIVE' : 'DISABLED'}</strong></span>
          </div>
        </div>
      </div>

      {sessionMessage && (
        <div className="card p-3 border-l-4 border-l-cyan-400 bg-cyan-950/20 text-cyan-300 text-xs font-mono flex items-center gap-2">
          <Sparkles size={14} className="flex-shrink-0" />
          <span>{sessionMessage}</span>
        </div>
      )}

      {/* Interactive Demo Story Bar */}
      <div className="card p-4 border-cyan" style={{ background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.05) 0%, rgba(14, 21, 38, 0.9) 100%)' }}>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-cyan" />
            <span className="text-xs font-bold uppercase tracking-wider text-cyan">
              Deterministic 60-Second Demo Sequence
            </span>
          </div>
          <span className="text-xs text-muted font-mono">
            Click Act 1 ➔ Investigate ➔ Then Act 2 to prove Hindsight recall & campaign correlation!
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
            <span>{loading ? 'Investigating with Groq & Hindsight...' : 'Investigate Incident'}</span>
          </button>
        </div>
      </div>

      {/* Honest Loading State */}
      {loading && (
        <div className="card p-10 flex flex-col items-center justify-center text-center">
          <LoadingSpinner message="Querying Groq LLM & Hindsight Vector Memory Bank..." />
          <p className="text-xs font-mono text-cyan mt-3 animate-pulse">
            Neural pipeline active · Extracting IOCs, recalling historical precedents, and correlating campaigns
          </p>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="card error-state p-4 flex items-start gap-3 border-red-500/50 bg-red-950/20">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5 text-red-400" />
          <div>
            <h4 className="font-bold text-sm mb-1 text-red-400">Investigation Error</h4>
            <p className="text-xs font-mono text-secondary">{error}</p>
          </div>
        </div>
      )}

      {/* Results Section */}
      {result && !loading && (
        <div className="results-section flex flex-col gap-6">
          {/* Top Status & Retain Banner */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            {result.memory_stored ? (
              <div className="success-banner flex-grow">
                <CheckCircle2 size={16} className="flex-shrink-0" />
                <span>
                  <strong>Memory Indexed ✓</strong> Retained into Hindsight bank as <code className="font-mono text-xs bg-black/40 px-1 py-0.5 rounded">{result.id.substring(0, 8)}...</code> with structured tags and IOCs.
                </span>
              </div>
            ) : (
              <div className="tag text-xs text-muted font-mono">
                Memory retention disabled for this investigation
              </div>
            )}

            {/* Mode Switcher */}
            <div className="flex items-center gap-2">
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
                {comparing ? 'Generating Baseline...' : '⚡ Before / After Memory Comparison'}
              </button>
            </div>
          </div>

          {/* Campaign Correlation Panel (Phase 3 Innovation) */}
          {result.campaign_link && (
            <div className="card p-4 border-cyan" style={{ background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.08) 0%, rgba(14, 21, 38, 0.95) 100%)' }}>
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Network size={16} className="text-cyan" />
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan">
                    Adversary Campaign Correlated
                  </span>
                  <span className={`badge ${result.campaign_link.link_strength === 'strong' ? 'badge-critical' : 'badge-high'}`}>
                    {result.campaign_link.link_strength.toUpperCase()} LINK
                  </span>
                </div>
                <span className="font-mono text-xs text-cyan font-bold">
                  CAMPAIGN ID: {result.campaign_link.campaign_id}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono mt-3">
                <div className="p-2 rounded bg-input border border-subtle">
                  <span className="text-muted block text-[0.65rem] uppercase">Linked Incidents</span>
                  <span className="text-primary font-bold">{result.campaign_link.incident_count} incidents</span>
                </div>
                <div className="p-2 rounded bg-input border border-subtle">
                  <span className="text-muted block text-[0.65rem] uppercase">Departments</span>
                  <span className="text-primary font-bold">
                    {result.campaign_link.departments_touched?.join(', ') || 'Finance'}
                  </span>
                </div>
                <div className="p-2 rounded bg-input border border-subtle col-span-2">
                  <span className="text-muted block text-[0.65rem] uppercase">Shared Infrastructure (IOCs)</span>
                  <span className="text-cyan font-bold">
                    {result.campaign_link.shared_iocs?.join(', ') || '198.51.100.0/24'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Escalation Prediction Warning (Phase 3 Innovation) */}
          {result.predicted_escalation && (
            <div className="card p-4 border-amber-500/50 bg-amber-950/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Escalation Forecast · Grounded in Memory
                  </span>
                </div>
                <span className="tag text-[0.65rem] font-mono text-amber-300">
                  Confidence: {result.predicted_escalation.confidence}
                </span>
              </div>
              <p className="text-xs text-primary mb-2 font-medium">
                <strong>Predicted Next Stage:</strong> {result.predicted_escalation.predicted_next_stage}
              </p>
              <div className="p-2.5 rounded bg-input text-xs text-amber-200 border border-amber-500/30">
                <span className="font-bold block text-[0.68rem] uppercase mb-0.5 text-amber-400">
                  Preventive Containment Action:
                </span>
                {result.predicted_escalation.preventive_action}
              </div>
            </div>
          )}

          {/* Outcome Learning Feedback Bar (Phase 2 Star Feature) */}
          <div className="card p-4 border-subtle flex items-center justify-between flex-wrap gap-3 bg-bg-card">
            <div className="flex items-center gap-2">
              <Brain size={16} className="text-cyan" />
              <div>
                <span className="text-xs font-bold text-primary block">
                  Analyst Outcome Feedback (Learning Signal)
                </span>
                <span className="text-[0.7rem] text-secondary">
                  Rate this containment outcome to train Hindsight on what works in this organization:
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {feedbackSubmitted ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono font-bold bg-emerald-950/40 px-3 py-1.5 rounded border border-emerald-500/40">
                  <CheckCircle2 size={14} />
                  <span>Feedback Recorded ({feedbackSubmitted.toUpperCase()}) → Hindsight Updated</span>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: '#10b981', color: '#10b981' }}
                    onClick={() => handleFeedback('effective')}
                    disabled={feedbackLoading}
                  >
                    <ThumbsUp size={12} />
                    <span>Effective</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ background: 'rgba(234, 179, 8, 0.15)', borderColor: '#eab308', color: '#eab308' }}
                    onClick={() => handleFeedback('partially_effective')}
                    disabled={feedbackLoading}
                  >
                    <span>Partially Effective</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ background: 'rgba(239, 68, 68, 0.15)', borderColor: '#ef4444', color: '#ef4444' }}
                    onClick={() => handleFeedback('ineffective')}
                    disabled={feedbackLoading}
                  >
                    <ThumbsDown size={12} />
                    <span>Ineffective</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ background: 'rgba(56, 189, 248, 0.15)', borderColor: '#38bdf8', color: '#38bdf8' }}
                    onClick={() => handleFeedback('false_positive')}
                    disabled={feedbackLoading}
                  >
                    <span>False Positive</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Comparison Mode: Side-by-Side (Phase 5 Hero) */}
          {viewMode === 'comparison' && baselineResult ? (
            <div className="card p-6 border-cyan">
              <div className="flex items-center justify-between mb-4 pb-3 border-b flex-wrap gap-2" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex items-center gap-2">
                  <Zap size={20} className="text-amber-400" />
                  <h3 className="text-lg font-bold text-primary">Live Before vs. After Memory Comparison</h3>
                </div>
                <span className="text-xs text-secondary font-mono bg-input px-3 py-1 rounded border border-subtle">
                  Same Incident Evaluated With & Without Hindsight
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
                    <span className="badge badge-critical" style={{ fontSize: '0.65rem' }}>Control Baseline</span>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-muted block mb-1 uppercase tracking-wider font-mono">
                      Hindsight Recall Context:
                    </span>
                    <div className="text-xs text-muted italic bg-bg-card p-3 rounded border border-dashed border-gray-700">
                      Zero historical context. The agent analyzes this incident in complete isolation without knowledge of previous attacks on this subnet.
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-muted block mb-1 uppercase tracking-wider font-mono">
                      Generic Immediate Actions:
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
                      Standard generic playbook for {baselineResult.incident.category}. Missing campaign awareness and organizational history.
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
                            <span className="font-semibold text-cyan font-mono text-[0.7rem]">
                              #{m.rank || i+1} {m.score ? `(Score: ${m.score.toFixed(2)})` : ''}: 
                            </span>
                            <span className="text-secondary text-xs ml-1">{m.text}</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-muted italic">First incident of this pattern (baseline memory).</span>
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
              {/* Left Column: Telemetry + Hindsight Memory */}
              <div className="flex flex-col gap-6">
                {/* Incident Telemetry Card */}
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
                      <span className="text-muted block text-[0.68rem] uppercase font-mono mb-2">
                        Indicators of Compromise (IoCs) — {result.incident.indicators.length} Extracted
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {result.incident.indicators.map((ioc, i) => (
                          <span key={i} className="tag font-mono text-[0.7rem]">{ioc}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Hindsight Persistent Memory Card (Centerpiece) */}
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
                        ✓ Semantic vector recall retrieved historical precedents with empirical scores:
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

              {/* Right Column: AI Analysis & Recommended Actions */}
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

                {/* Recommended Actions */}
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
