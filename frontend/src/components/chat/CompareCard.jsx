import React from 'react';
import ReactMarkdown from 'react-markdown';
import { X, Split } from 'lucide-react';

export default function CompareCard({ originalAnswer, baselineAnswer, onClose }) {
  if (!baselineAnswer) return null;

  return (
    <div className="compare-card">
      <div className="compare-header">
        <span className="flex items-center gap-2">
          <Split size={14} style={{ color: 'var(--accent-teal)' }} />
          <span>Before & After Hindsight Memory Comparison</span>
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
        >
          <X size={15} />
        </button>
      </div>

      <div className="compare-columns">
        {/* Without Memory (Baseline) */}
        <div className="compare-col" style={{ background: 'var(--bg-card)' }}>
          <div className="compare-col-header" style={{ color: 'var(--text-muted)' }}>
            Without memory (Standard Playbook)
          </div>
          <div className="assistant-text" style={{ fontSize: '13px' }}>
            <ReactMarkdown>{baselineAnswer}</ReactMarkdown>
          </div>
        </div>

        {/* With Memory */}
        <div className="compare-col" style={{ background: 'var(--bg-accent-soft)' }}>
          <div className="compare-col-header" style={{ color: 'var(--accent-teal)' }}>
            With Hindsight memory (Organization-Aware)
          </div>
          <div className="assistant-text" style={{ fontSize: '13px' }}>
            <ReactMarkdown>{originalAnswer}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
