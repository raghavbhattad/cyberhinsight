import React from 'react';
import { Clock, Shield, Brain, ChevronRight, Server, Terminal, CheckCircle2 } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

const IncidentCard = ({ incident, onClick, isExpanded = false }) => {
  if (!incident) return null;
  
  const id = incident.id ? (incident.id.startsWith('DEMO-') ? incident.id : `#INC-${incident.id.substring(0, 6)}`) : '#ALERT';
  const summary = incident.summary || incident.incident?.summary || 'Security Incident Detected';
  const severity = incident.severity || incident.incident?.severity || 'medium';
  const category = incident.category || incident.incident?.category || 'Security Alert';
  const mitre = incident.mitre_technique || incident.incident?.mitre_technique;
  const affected_asset = incident.affected_asset || incident.incident?.affected_asset || 'FIN-WS-ENDPOINT';
  const rawTime = incident.timestamp || incident.created_at || new Date().toISOString();
  const date = new Date(rawTime).toLocaleDateString() + ' ' + new Date(rawTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  const memory_matches_count = incident.memory_matches_count ?? (incident.memory_matches ? incident.memory_matches.length : 0);
  const memoryStored = incident.memory_stored ?? true;

  return (
    <div 
      className={`card ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
      style={{
        borderLeft: severity.toLowerCase() === 'critical' 
          ? '4px solid #ff3366' 
          : severity.toLowerCase() === 'high' 
            ? '4px solid #f97316' 
            : '4px solid var(--accent-cyan)',
        padding: '1.25rem 1.5rem'
      }}
    >
      {/* Top Header: ID, Severity, Category, Time */}
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-input border border-subtle text-cyan-400">
            {id}
          </span>
          <StatusBadge severity={severity} />
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
            {category}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted font-mono">
          <Clock size={12} />
          <span>{date}</span>
        </div>
      </div>
      
      {/* Incident Title / Summary */}
      <h3 className="text-primary text-base font-semibold mb-3 leading-snug">
        {summary}
      </h3>
      
      {/* Bottom Technical Telemetry */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t flex-wrap gap-3" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="tag">
            <Server size={12} className="text-muted" />
            <span className="text-secondary font-mono">Asset: <strong className="text-primary">{affected_asset}</strong></span>
          </span>

          {mitre && mitre !== 'N/A' && (
            <span className="tag font-mono text-accent">
              <Terminal size={12} />
              <span>{mitre}</span>
            </span>
          )}
        </div>
        
        {/* Right Badges: Memory Match & Retained */}
        <div className="flex items-center gap-3">
          {memory_matches_count > 0 ? (
            <div className="flex items-center gap-1.5 text-xs font-mono font-semibold px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-400">
              <Brain size={13} />
              <span>{memory_matches_count} Hindsight {memory_matches_count === 1 ? 'Match' : 'Matches'}</span>
            </div>
          ) : (
            <div className="text-xs text-muted font-mono">
              Initial Baseline
            </div>
          )}

          {memoryStored && (
            <span className="flex items-center gap-1 text-[0.7rem] text-emerald-400 font-mono" title="Ingested into persistent vector memory">
              <CheckCircle2 size={12} />
              <span>RETAINED</span>
            </span>
          )}

          {onClick && (
            <ChevronRight size={16} className={`text-muted transition-transform ${isExpanded ? 'rotate-90 text-cyan-400' : ''}`} />
          )}
        </div>
      </div>
    </div>
  );
};

export default IncidentCard;
