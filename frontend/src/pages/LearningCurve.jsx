import React, { useState, useEffect } from 'react';
import { runLearningSequence, getSequenceResults, startNewDemoSession, seedDemoIncidents } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  TrendingUp, 
  Brain, 
  Shield, 
  Zap, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Layers,
  Sparkles,
  Info
} from 'lucide-react';

const LearningCurve = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [sessionId, setSessionId] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [selectedPoint, setSelectedPoint] = useState(null);

  // Fetch initial results if available
  useEffect(() => {
    const fetchExisting = async () => {
      try {
        const res = await getSequenceResults();
        if (res.data?.results?.length > 0) {
          setResults(res.data.results);
          setSelectedPoint(res.data.results[res.data.results.length - 1]);
        }
      } catch (err) {
        // No results yet
      }
    };
    fetchExisting();
  }, []);

  const handleRunSequence = async () => {
    setLoading(true);
    setStatusMessage('Executing automated sequence: 6 incidents evaluated with & without Hindsight memory...');
    try {
      const res = await runLearningSequence(6);
      setResults(res.data.results || []);
      setSessionId(res.data.session_id || '');
      setSelectedPoint(res.data.results?.[res.data.results.length - 1] || null);
      setStatusMessage('Sequence complete! Learning curve computed from transparent specificity scoring.');
    } catch (err) {
      setStatusMessage('Error executing evaluation sequence: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleResetSession = async () => {
    setLoading(true);
    setStatusMessage('Creating isolated demo memory bank (cold start)...');
    try {
      const res = await startNewDemoSession();
      setResults([]);
      setSelectedPoint(null);
      setStatusMessage(`Fresh session initialized! Bank: ${res.data.bank_id}. Memory is empty.`);
    } catch (err) {
      setStatusMessage('Error resetting session: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // SVG Chart Dimensions
  const chartWidth = 700;
  const chartHeight = 280;
  const padding = { top: 30, right: 40, bottom: 45, left: 55 };
  const graphWidth = chartWidth - padding.left - padding.right;
  const graphHeight = chartHeight - padding.top - padding.bottom;

  const maxScore = 10;
  const numSteps = results.length || 6;

  const getX = (index) => padding.left + (index / Math.max(1, numSteps - 1)) * graphWidth;
  const getY = (score) => padding.top + graphHeight - (score / maxScore) * graphHeight;

  // Generate path data
  const generatePath = (key) => {
    if (!results || results.length === 0) return '';
    return results.map((r, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(r[key])}`).join(' ');
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge badge-memory">EMPIRICAL AGENT EVALUATION</span>
            <span className="text-xs text-muted font-mono">OBJECTIVE METRIC: SPECIFICITY SCORE (0–10)</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="text-cyan" />
            Agent Learning Curve
          </h2>
          <p className="text-secondary text-sm max-w-2xl">
            Watch the defensive agent measurably improve as it investigates sequential incidents, recalls past outcomes, and learns which remediations actually worked in this organization.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleResetSession}
            disabled={loading}
            title="Create an isolated demo bank to start from scratch"
          >
            <RefreshCw size={14} />
            <span>Fresh Cold Start</span>
          </button>

          <button
            type="button"
            className="btn btn-cyber btn-sm"
            onClick={handleRunSequence}
            disabled={loading}
          >
            {loading ? <RefreshCw className="animate-spin" size={14} /> : <Zap size={14} />}
            <span>{loading ? 'Evaluating...' : 'Run 6-Incident Sequence'}</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="card p-3 border-l-4 border-l-cyan-400 bg-cyan-950/20 text-cyan-300 text-xs font-mono flex items-center gap-2">
          <Sparkles size={14} className="flex-shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Main Chart Card */}
      <div className="card p-6 border-cyan">
        <div className="flex items-center justify-between mb-4 pb-3 border-b flex-wrap gap-2" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-sm" style={{ boxShadow: '0 0 8px #00f0ff' }}></span>
              <span className="text-xs font-bold text-cyan font-mono">WITH HINDSIGHT MEMORY</span>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <span className="w-3 h-3 rounded-full bg-red-400/60"></span>
              <span className="text-xs font-bold text-muted font-mono">WITHOUT MEMORY (CONTROL)</span>
            </div>
          </div>

          <span className="text-xs text-muted font-mono">
            {results.length > 0 ? `${results.length} Incidents Evaluated` : 'Click "Run 6-Incident Sequence" to generate live data'}
          </span>
        </div>

        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <LoadingSpinner message="Running dual-mode evaluations against Groq LLM & Hindsight Vector Bank..." />
            <p className="text-xs font-mono text-cyan mt-3 animate-pulse">
              Measuring organizational specificity, IOC citations, campaign links, and ineffective action avoidance
            </p>
          </div>
        ) : results.length > 0 ? (
          <div>
            {/* SVG Line Chart */}
            <div className="overflow-x-auto flex justify-center">
              <svg width={chartWidth} height={chartHeight} className="overflow-visible">
                {/* Background Grid Lines */}
                {[0, 2.5, 5, 7.5, 10].map((val) => (
                  <g key={val}>
                    <line
                      x1={padding.left}
                      y1={getY(val)}
                      x2={chartWidth - padding.right}
                      y2={getY(val)}
                      stroke="rgba(255, 255, 255, 0.07)"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={padding.left - 12}
                      y={getY(val) + 4}
                      fill="var(--text-muted)"
                      fontSize="10"
                      fontFamily="var(--font-mono)"
                      textAnchor="end"
                    >
                      {val.toFixed(1)}
                    </text>
                  </g>
                ))}

                {/* X Axis Labels */}
                {results.map((r, i) => (
                  <g key={i}>
                    <line
                      x1={getX(i)}
                      y1={padding.top}
                      x2={getX(i)}
                      y2={padding.top + graphHeight}
                      stroke="rgba(255, 255, 255, 0.04)"
                    />
                    <text
                      x={getX(i)}
                      y={padding.top + graphHeight + 20}
                      fill={selectedPoint?.step === r.step ? 'var(--accent-cyan)' : 'var(--text-secondary)'}
                      fontSize="11"
                      fontFamily="var(--font-mono)"
                      fontWeight={selectedPoint?.step === r.step ? 'bold' : 'normal'}
                      textAnchor="middle"
                    >
                      #{r.step}
                    </text>
                  </g>
                ))}

                {/* Control Line (Without Memory) */}
                <path
                  d={generatePath('score_without_memory')}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2.5"
                  strokeDasharray="5 3"
                  opacity="0.75"
                />

                {/* Memory Line (With Memory) */}
                <path
                  d={generatePath('score_with_memory')}
                  fill="none"
                  stroke="var(--accent-cyan)"
                  strokeWidth="3.5"
                  style={{ filter: 'drop-shadow(0 0 6px rgba(0, 240, 255, 0.6))' }}
                />

                {/* Data Points */}
                {results.map((r, i) => (
                  <g key={i} className="cursor-pointer" onClick={() => setSelectedPoint(r)}>
                    {/* Without Memory Point */}
                    <circle
                      cx={getX(i)}
                      cy={getY(r.score_without_memory)}
                      r="4.5"
                      fill="#ef4444"
                      stroke="#0e1526"
                      strokeWidth="2"
                    />

                    {/* With Memory Point */}
                    <circle
                      cx={getX(i)}
                      cy={getY(r.score_with_memory)}
                      r={selectedPoint?.step === r.step ? '7' : '5'}
                      fill="var(--accent-cyan)"
                      stroke="#ffffff"
                      strokeWidth={selectedPoint?.step === r.step ? '3' : '2'}
                      style={{ filter: 'drop-shadow(0 0 8px #00f0ff)' }}
                    />
                  </g>
                ))}
              </svg>
            </div>

            {/* Selected Incident Telemetry Drawer */}
            {selectedPoint && (
              <div className="mt-6 p-4 rounded-lg bg-input border border-cyan-500/30 flex flex-col gap-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="badge badge-memory">INCIDENT #{selectedPoint.step}</span>
                    <span className="text-sm font-bold text-primary">{selectedPoint.title}</span>
                  </div>
                  {selectedPoint.campaign_id && (
                    <span className="tag text-cyan font-mono text-xs">
                      CAMPAIGN: {selectedPoint.campaign_id}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="p-2.5 rounded bg-bg-card border border-subtle">
                    <span className="text-muted block text-[0.68rem] uppercase">Without Memory</span>
                    <span className="text-red-400 font-bold text-lg">{selectedPoint.score_without_memory} / 10</span>
                    <span className="text-muted block text-[0.65rem] mt-0.5">Generic playbook</span>
                  </div>

                  <div className="p-2.5 rounded bg-bg-card border border-cyan-800">
                    <span className="text-cyan block text-[0.68rem] uppercase font-bold">With Hindsight</span>
                    <span className="text-cyan font-bold text-lg">{selectedPoint.score_with_memory} / 10</span>
                    <span className="text-emerald-400 block text-[0.65rem] mt-0.5">
                      +{(selectedPoint.score_with_memory - selectedPoint.score_without_memory).toFixed(1)} lift
                    </span>
                  </div>

                  <div className="p-2.5 rounded bg-bg-card border border-subtle">
                    <span className="text-muted block text-[0.68rem] uppercase">Recalled Matches</span>
                    <span className="text-primary font-bold text-lg">{selectedPoint.memory_matches_count}</span>
                    <span className="text-muted block text-[0.65rem] mt-0.5">Historical precedents</span>
                  </div>

                  <div className="p-2.5 rounded bg-bg-card border border-subtle">
                    <span className="text-muted block text-[0.68rem] uppercase">Ineffective Actions</span>
                    <span className="text-emerald-400 font-bold text-lg">
                      {selectedPoint.components_with?.avoided_ineffective ? '✓ Avoided' : 'N/A'}
                    </span>
                    <span className="text-muted block text-[0.65rem] mt-0.5">Learned from feedback</span>
                  </div>
                </div>

                {/* Score Components Breakdown */}
                <div className="text-xs text-secondary mt-1 pt-2 border-t border-gray-800 flex items-center justify-between flex-wrap gap-2">
                  <span className="font-mono text-muted text-[0.7rem]">SCORE BREAKDOWN:</span>
                  <span className="tag text-[0.68rem]">Org References: {selectedPoint.components_with?.org_references || 0}</span>
                  <span className="tag text-[0.68rem]">IOC Matches: {selectedPoint.components_with?.ioc_references || 0}</span>
                  <span className="tag text-[0.68rem]">Campaign Aware: {selectedPoint.components_with?.campaign_aware ? 'Yes (+2.0)' : 'No'}</span>
                  <span className="tag text-[0.68rem]">Avoided Failed: {selectedPoint.components_with?.avoided_ineffective ? 'Yes (+1.5)' : 'No'}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-12 text-center text-secondary">
            <TrendingUp size={44} className="mx-auto mb-3 text-cyan opacity-40" />
            <h4 className="text-base font-bold text-primary mb-1">No Evaluation Sequence Run Yet</h4>
            <p className="text-xs max-w-md mx-auto mb-4">
              Click "Run 6-Incident Sequence" to execute an automated, end-to-end benchmark demonstrating how Hindsight memory progressively adapts the agent's defense actions.
            </p>
            <button type="button" className="btn btn-cyber btn-sm" onClick={handleRunSequence}>
              <Zap size={14} /> Run Benchmark Sequence
            </button>
          </div>
        )}
      </div>

      {/* Methodology Documentation Card */}
      <div className="card p-5">
        <h4 className="text-xs font-bold uppercase font-mono text-cyan mb-2 flex items-center gap-1.5">
          <Info size={14} /> Transparent Scoring Methodology
        </h4>
        <p className="text-xs text-secondary leading-relaxed mb-3">
          The <strong>Specificity Score (0–10)</strong> measures how tailored the agent's containment actions are to THIS organization. Unlike generic benchmarks that evaluate zero-shot responses, CyberHinsight quantifies learning from historical outcomes:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-2.5 rounded bg-input border border-subtle">
            <span className="text-primary font-bold block mb-1">1. Org References (1.5x)</span>
            <span className="text-muted text-[0.7rem]">Counts specific hostnames, prior incident IDs, and departmental assets cited in containment reasoning.</span>
          </div>
          <div className="p-2.5 rounded bg-input border border-subtle">
            <span className="text-primary font-bold block mb-1">2. IOC Grounding (1.0x)</span>
            <span className="text-muted text-[0.7rem]">Counts exact attacker IPs, hashes, and domains from memory incorporated into perimeter blocks.</span>
          </div>
          <div className="p-2.5 rounded bg-input border border-subtle">
            <span className="text-primary font-bold block mb-1">3. Campaign Awareness (+2.0)</span>
            <span className="text-muted text-[0.7rem]">Rewards recognizing recurring attacker infrastructure across departments and multiple weeks.</span>
          </div>
          <div className="p-2.5 rounded bg-input border border-subtle">
            <span className="text-primary font-bold block mb-1">4. Feedback Avoidance (+1.5)</span>
            <span className="text-muted text-[0.7rem]">Rewards explicitly avoiding remediation steps that analyst feedback marked as ineffective in past tickets.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearningCurve;
