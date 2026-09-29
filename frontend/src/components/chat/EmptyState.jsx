import React from 'react';
import { Play, Sparkles } from 'lucide-react';

const SUGGESTIONS = [
  "Finance user opened invoice_7482.docm and PowerShell called 198.51.100.45",
  "Have we seen 198.51.100.45 before in past incidents?",
  "What worked last time for phishing in Finance?",
  "Which hosts were affected by the ransomware campaign?",
];

export default function EmptyState({ onSelectPrompt, onStartDemo }) {
  return (
    <div className="empty-state-container">
      <div className="flex items-center justify-center gap-2 text-accent" style={{ color: 'var(--accent-teal)' }}>
        <Sparkles size={20} />
        <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          Defensive SOC Assistant
        </span>
      </div>

      <h1 className="empty-state-title">What are you investigating?</h1>
      <p className="empty-state-subtitle">
        Investigate security alerts, query organizational memory across past incidents,
        or teach the agent new remediation feedback.
      </p>

      {/* Demo Action Button */}
      <div className="empty-actions-row">
        <button
          type="button"
          className="btn-demo-start"
          onClick={onStartDemo}
          title="Run a 3-step interactive incident demonstration"
        >
          <Play size={15} fill="currentColor" />
          <span>Try the 3-step memory demo</span>
        </button>
      </div>

      {/* 4 suggestion chips */}
      <div className="chips-grid">
        {SUGGESTIONS.map((text, idx) => (
          <button
            key={idx}
            type="button"
            className="starter-chip"
            onClick={() => onSelectPrompt(text)}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
