import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Split, Loader2 } from 'lucide-react';
import SourcesChip from './SourcesChip';
import FeedbackBar from './FeedbackBar';
import ReportCard from './ReportCard';
import CompareCard from './CompareCard';
import { sendChat } from '../../services/api';

export default function AssistantMessage({
  message,
  onSuggestionClick,
  userPrompt,
}) {
  const [comparing, setComparing] = useState(false);
  const [baselineAnswer, setBaselineAnswer] = useState(null);
  const [loadingCompare, setLoadingCompare] = useState(false);

  const {
    content,
    sources = [],
    report,
    suggestions = [],
    intent,
  } = message;

  const handleCompareWithoutMemory = async () => {
    if (baselineAnswer) {
      setComparing(true);
      return;
    }
    if (!userPrompt) return;

    setLoadingCompare(true);
    try {
      const res = await sendChat(userPrompt, null, false);
      if (res.data) {
        setBaselineAnswer(res.data.answer);
        setComparing(true);
      }
    } catch (err) {
      console.error('Comparison call failed:', err);
    } finally {
      setLoadingCompare(false);
    }
  };

  return (
    <div className="assistant-message-row">
      <div className="assistant-text">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>

      {/* Expandable report card for investigations */}
      {report && <ReportCard report={report} />}

      {/* Side-by-side comparison card */}
      {comparing && baselineAnswer && (
        <CompareCard
          originalAnswer={content}
          baselineAnswer={baselineAnswer}
          onClose={() => setComparing(false)}
        />
      )}

      {/* Quiet action row */}
      <div className="meta-row">
        {/* Recalled Memory Chip */}
        <SourcesChip sources={sources} />

        {/* Feedback (only on investigations) */}
        {report?.id && <FeedbackBar incidentId={report.id} />}

        {/* Compare without memory button (investigations or turns with recalled memory) */}
        {(report || sources.length > 0) && userPrompt && !comparing && (
          <button
            type="button"
            className="btn-compare"
            onClick={handleCompareWithoutMemory}
            disabled={loadingCompare}
            title="Re-run without Hindsight memory to compare playbooks"
          >
            {loadingCompare ? (
              <Loader2 size={12} className="spin" />
            ) : (
              <Split size={12} />
            )}
            <span>Compare without memory</span>
          </button>
        )}
      </div>

      {/* Dynamic follow-up suggestion chips */}
      {suggestions && suggestions.length > 0 && (
        <div className="suggestions-row">
          {suggestions.map((sug, i) => (
            <button
              key={i}
              type="button"
              className="suggestion-chip"
              onClick={() => onSuggestionClick && onSuggestionClick(sug)}
            >
              {sug}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
