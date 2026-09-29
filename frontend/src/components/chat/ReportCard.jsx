import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

export default function ReportCard({ report }) {
  const [expanded, setExpanded] = useState(false);
  const [copiedIoc, setCopiedIoc] = useState(null);

  if (!report) return null;

  const { incident = {}, analysis = {}, recommendations = {}, campaign_link, predicted_escalation } = report;
  const severity = (incident.severity || 'medium').toLowerCase();
  const confidencePct = Math.round((incident.confidence || 0.85) * 100);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedIoc(text);
    setTimeout(() => setCopiedIoc(null), 1800);
  };

  return (
    <div className="report-card">
      <div
        className="report-card-summary"
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpanded(!expanded); }}
      >
        <div className="report-summary-left">
          <span className={`severity-dot ${severity}`} />
          <span className="report-title">{incident.category || 'Security Incident'}</span>
          <span className="report-asset">{incident.affected_asset || 'Asset'}</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>• {confidencePct}% confidence</span>
        </div>
        <div className="flex items-center gap-1 text-muted" style={{ fontSize: '12px' }}>
          <span>{expanded ? 'Hide details' : 'View report details'}</span>
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </div>
      </div>

      {expanded && (
        <div className="report-card-body">
          {/* What happened */}
          <div className="report-section">
            <span className="report-section-title">What happened</span>
            <p>{analysis.investigation_findings || incident.summary || 'Alert analyzed.'}</p>
          </div>

          {/* Likely cause */}
          <div className="report-section">
            <span className="report-section-title">Likely cause</span>
            <p>{analysis.root_cause || 'Under investigation.'}</p>
          </div>

          {/* Do now */}
          {recommendations.immediate_actions && recommendations.immediate_actions.length > 0 && (
            <div className="report-section">
              <span className="report-section-title">Do now</span>
              <ol style={{ margin: '4px 0 0 18px', padding: 0 }}>
                {recommendations.immediate_actions.map((act, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>{act}</li>
                ))}
              </ol>
            </div>
          )}

          {/* Do later */}
          {recommendations.long_term_actions && recommendations.long_term_actions.length > 0 && (
            <div className="report-section">
              <span className="report-section-title">Do later</span>
              <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
                {recommendations.long_term_actions.map((act, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>{act}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Indicators */}
          {incident.indicators && incident.indicators.length > 0 && (
            <div className="report-section">
              <span className="report-section-title">Indicators</span>
              <div className="indicator-chips">
                {incident.indicators.map((ioc, i) => (
                  <button
                    key={i}
                    type="button"
                    className="indicator-chip"
                    onClick={() => copyToClipboard(ioc)}
                    title="Click to copy indicator"
                    style={{ cursor: 'pointer', background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
                  >
                    <span>{ioc}</span>
                    {copiedIoc === ioc ? (
                      <Check size={11} style={{ marginLeft: '4px', color: 'var(--sev-low)' }} />
                    ) : (
                      <Copy size={11} style={{ marginLeft: '4px', opacity: 0.5 }} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Related incidents (plain sentence, only if link is real) */}
          {campaign_link && campaign_link.link_strength && campaign_link.link_strength !== 'weak' && (
            <div className="report-section" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
              <span className="report-section-title">Related incidents</span>
              <p style={{ color: 'var(--text-secondary)' }}>
                Connected to {campaign_link.incident_count - 1} earlier {campaign_link.incident_count - 1 === 1 ? 'incident' : 'incidents'}
                {campaign_link.departments_touched?.length > 0 && ` (${campaign_link.departments_touched.join(', ')})`}
                {campaign_link.shared_iocs?.length > 0 && ` via shared infrastructure: ${campaign_link.shared_iocs.slice(0, 3).join(', ')}`}.
              </p>
            </div>
          )}

          {/* What could happen next (grounded escalation forecast) */}
          {predicted_escalation && (
            <div className="report-section" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
              <span className="report-section-title">What could happen next</span>
              <p style={{ color: 'var(--text-secondary)' }}>
                {predicted_escalation.predicted_next_stage}.
              </p>
              {predicted_escalation.preventive_action && (
                <p style={{ marginTop: '4px', fontSize: '13px', color: 'var(--text-muted)' }}>
                  <strong>Preventive step:</strong> {predicted_escalation.preventive_action}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
