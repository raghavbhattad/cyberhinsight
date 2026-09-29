import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Check } from 'lucide-react';
import { submitFeedback } from '../../services/api';

export default function FeedbackBar({ incidentId }) {
  const [showChoices, setShowChoices] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!incidentId) return null;

  const handleSelectOutcome = async (outcome) => {
    setLoading(true);
    try {
      await submitFeedback(incidentId, {
        outcome,
        actions_taken: [`Analyst rated resolution: ${outcome}`],
        what_worked: outcome === 'effective' ? 'Remediation completed as recommended' : '',
        what_failed: outcome === 'ineffective' ? 'Recommended steps did not contain threat' : '',
        analyst_notes: `Outcome marked via chat feedback bar: ${outcome}`,
      });
      setSubmitted(true);
      setShowChoices(false);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <span className="flex items-center gap-1 text-muted" style={{ fontSize: '12px', color: 'var(--accent-teal)' }}>
        <Check size={13} />
        <span>Saved to memory ✓</span>
      </span>
    );
  }

  return (
    <div className="feedback-actions">
      {!showChoices ? (
        <>
          <button
            type="button"
            className="feedback-btn"
            title="Remediation worked"
            onClick={() => setShowChoices(true)}
          >
            <ThumbsUp size={13} />
          </button>
          <button
            type="button"
            className="feedback-btn"
            title="Remediation didn't work"
            onClick={() => setShowChoices(true)}
          >
            <ThumbsDown size={13} />
          </button>
        </>
      ) : (
        <div className="feedback-popover">
          <button
            type="button"
            disabled={loading}
            className="feedback-choice-btn"
            onClick={() => handleSelectOutcome('effective')}
          >
            Worked
          </button>
          <button
            type="button"
            disabled={loading}
            className="feedback-choice-btn"
            onClick={() => handleSelectOutcome('partially_effective')}
          >
            Partly
          </button>
          <button
            type="button"
            disabled={loading}
            className="feedback-choice-btn"
            onClick={() => handleSelectOutcome('ineffective')}
          >
            Didn't work
          </button>
          <button
            type="button"
            disabled={loading}
            className="feedback-choice-btn"
            onClick={() => handleSelectOutcome('false_positive')}
          >
            False alarm
          </button>
        </div>
      )}
    </div>
  );
}
