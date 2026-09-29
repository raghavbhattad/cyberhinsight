import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Split, Loader2, Check } from 'lucide-react';
import SourcesChip from './SourcesChip';
import FeedbackBar from './FeedbackBar';
import ReportCard from './ReportCard';
import CompareCard from './CompareCard';
import { sendChat, getMemoryIndexingStatus } from '../../services/api';

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
    checked_count,
  } = message;

  const [isIndexed, setIsIndexed] = useState(message.memory_indexed ?? false);

  useEffect(() => {
    if (!report?.id || isIndexed) return;
    let timer;
    let attempts = 0;
    const maxAttempts = 8; // poll every 2s for up to 16s

    const checkIndex = async () => {
      attempts++;
      try {
        const res = await getMemoryIndexingStatus(report.id);
        if (res.data?.indexed) {
          setIsIndexed(true);
          return;
        }
      } catch (e) {
        // ignore
      }
      if (attempts < maxAttempts) {
        timer = setTimeout(checkIndex, 2000);
      }
    };

    timer = setTimeout(checkIndex, 2000);
    return () => clearTimeout(timer);
  }, [report?.id, isIndexed]);

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
        <SourcesChip sources={sources} checkedCount={checked_count} />

        {/* Indexing status badge for stored investigations */}
        {report?.memory_stored && (
          <span
            className="flex items-center gap-1"
            style={{
              fontSize: '11px',
              color: isIndexed ? 'var(--accent-teal)' : 'var(--text-muted)',
              backgroundColor: isIndexed ? 'var(--bg-accent-soft)' : 'var(--bg-surface)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              border: `1px solid ${isIndexed ? 'rgba(15, 118, 110, 0.2)' : 'var(--border-color)'}`,
            }}
          >
            {isIndexed ? (
              <>
                <Check size={11} />
                <span>Memory indexed ✓</span>
              </>
            ) : (
              <>
                <Loader2 size={11} className="spin" />
                <span>Indexing memory…</span>
              </>
            )}
          </span>
        )}

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
