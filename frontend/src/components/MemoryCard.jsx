import React from 'react';
import { Brain, Shield, Server, CheckCircle2, AlertCircle, Hash, Clock, Cpu } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

const MemoryCard = ({ memory }) => {
  if (!memory) return null;

  const rawText = memory.text || '';
  
  // Extract structured values if present in text lines
  const parseField = (pattern) => {
    const match = rawText.match(pattern);
    return match ? match[1].trim() : null;
  };

  const parsedSeverity = parseField(/(?:Severity|Sev):\s*([^\n]+)/i);
  const parsedCategory = parseField(/(?:Category|Cat):\s*([^\n]+)/i);
  const parsedEndpoint = parseField(/(?:Endpoint|Asset|Host):\s*([^\n]+)/i) || (rawText.match(/\b([A-Z]{2,4}-[A-Z]{2,4}-\d{3,4})\b/) ? rawText.match(/\b([A-Z]{2,4}-[A-Z]{2,4}-\d{3,4})\b/)[1] : null);
  const parsedDepartment = parseField(/(?:Department|Dept):\s*([^\n]+)/i) || (rawText.match(/\b(Finance|Human Resources|HR|Engineering|Executive|Legal|IT)\b/i) ? rawText.match(/\b(Finance|Human Resources|HR|Engineering|Executive|Legal|IT)\b/i)[1] : null);
  const parsedResolution = parseField(/(?:Resolution|Remediation|Previous successful action|Action):\s*([^\n]+)/i);
  const parsedRootCause = parseField(/(?:Root Cause|Cause):\s*([^\n]+)/i);
  const parsedDate = parseField(/(?:When|Date|Timestamp):\s*([^\n|]+)/i);

  // Clean text by stripping structured prefixes if they exist
  const cleanSummary = rawText
    .replace(/(?:Incident|Description):\s*/i, '')
    .split('\n')[0]
    .trim();

  return (
    <div className="card memory-card">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Brain size={14} />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
            Hindsight Historical Recall {memory.rank ? `· Rank #${memory.rank}` : ''}
          </span>
          {memory.score !== null && memory.score !== undefined ? (
            <span className="badge badge-memory" style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem' }}>
              Score: {typeof memory.score === 'number' ? memory.score.toFixed(2) : memory.score}
            </span>
          ) : (
            <span className="badge badge-memory" style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem' }}>
              {memory.relevance ? memory.relevance.toUpperCase() : 'RECALLED'}
            </span>
          )}
        </div>

        {memory.document_id && (
          <span className="tag font-mono text-[0.65rem] text-muted">
            DOC: {memory.document_id.substring(0, 10)}
          </span>
        )}

        {parsedSeverity && (
          <StatusBadge severity={parsedSeverity} />
        )}
      </div>

      {/* Main Narrative / Memory Text */}
      <p className="text-sm text-primary mb-3 leading-relaxed" style={{ fontWeight: 500 }}>
        {cleanSummary || rawText}
      </p>

      {/* Extracted Metadata Pills */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        {parsedCategory && (
          <span className="tag">
            <Shield size={11} className="text-cyan-400" />
            <span>{parsedCategory}</span>
          </span>
        )}
        {parsedEndpoint && (
          <span className="tag">
            <Server size={11} className="text-blue-400" />
            <span>Asset: {parsedEndpoint}</span>
          </span>
        )}
        {parsedDepartment && (
          <span className="tag">
            <span>Dept: {parsedDepartment}</span>
          </span>
        )}
        {parsedDate && (
          <span className="tag text-muted">
            <Clock size={11} />
            <span>{parsedDate}</span>
          </span>
        )}
      </div>

      {/* Root Cause (if detected) */}
      {parsedRootCause && (
        <div className="text-xs text-secondary mb-2 p-2 rounded bg-input border border-subtle">
          <span className="text-muted uppercase font-mono font-semibold block text-[0.65rem] mb-0.5">Prior Root Cause:</span>
          <span>{parsedRootCause}</span>
        </div>
      )}

      {/* Previous Successful Resolution Highlight */}
      {parsedResolution ? (
        <div className="mt-2 p-2.5 rounded bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
          <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0 text-emerald-400" />
          <div>
            <span className="font-semibold block text-emerald-400 font-mono text-[0.68rem] uppercase">
              Proven Containment Action:
            </span>
            <span>{parsedResolution}</span>
          </div>
        </div>
      ) : (
        <div className="mt-2 p-2 rounded bg-cyan-950/20 border border-cyan-500/20 text-cyan-200 text-xs flex items-center gap-2 font-mono">
          <CheckCircle2 size={13} className="text-cyan-400 flex-shrink-0" />
          <span>Historical context retained in Hindsight knowledge base</span>
        </div>
      )}
    </div>
  );
};

export default MemoryCard;
