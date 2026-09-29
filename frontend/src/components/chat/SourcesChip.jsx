import React, { useState } from 'react';
import { Brain, ChevronDown, ChevronUp } from 'lucide-react';

export default function SourcesChip({ sources = [], checkedCount = 0 }) {
  const [expanded, setExpanded] = useState(false);

  if (!sources || sources.length === 0) {
    if (checkedCount && checkedCount > 0) {
      return (
        <span className="memory-chip-neutral" title="Searched Hindsight memory bank but none passed relevance/entity gates">
          <Brain size={13} />
          <span>Checked {checkedCount}, none relevant</span>
        </span>
      );
    }
    return (
      <span className="memory-chip-empty" title="No past memories matched this turn">
        <Brain size={13} />
        <span>No matching past incidents</span>
      </span>
    );
  }

  const formatRelevance = (score) => {
    if (score === null || score === undefined) return { label: 'recalled', cls: 'medium' };
    if (score >= 0.7) return { label: 'strong match', cls: 'high' };
    if (score >= 0.4) return { label: 'medium match', cls: 'medium' };
    return { label: 'weak match', cls: 'low' };
  };

  return (
    <div style={{ display: 'inline-block' }}>
      <button
        type="button"
        className="memory-chip"
        onClick={() => setExpanded(!expanded)}
        title="View memories recalled from Hindsight"
      >
        <Brain size={13} />
        <span>Used {sources.length} {sources.length === 1 ? 'memory' : 'memories'}</span>
        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {expanded && (
        <div className="sources-panel" role="region" aria-label="Recalled memory sources">
          {sources.map((src, idx) => {
            const rel = formatRelevance(src.score);
            return (
              <div key={src.id || idx} className="source-item">
                <div className="source-header">
                  <span className="source-id">{src.label || src.id || `Memory #${idx + 1}`}</span>
                  <span className={`source-relevance ${rel.cls}`}>{rel.label}</span>
                </div>
                <div className="source-snippet">{src.snippet}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
