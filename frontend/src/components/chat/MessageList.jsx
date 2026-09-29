import React, { useEffect, useRef } from 'react';
import UserMessage from './UserMessage';
import AssistantMessage from './AssistantMessage';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function MessageList({
  messages = [],
  streamingStatus = null,
  streamingText = '',
  error = null,
  onRetry = null,
  onSuggestionClick = null,
}) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingStatus, streamingText, error]);

  // Pair assistant messages with the preceding user message to support the "Compare" feature
  const renderMessages = () => {
    const rendered = [];
    let lastUserPrompt = '';

    messages.forEach((msg, idx) => {
      if (msg.role === 'user') {
        lastUserPrompt = msg.content;
        rendered.push(
          <UserMessage key={`user-${idx}`} content={msg.content} />
        );
      } else {
        rendered.push(
          <AssistantMessage
            key={`asst-${idx}`}
            message={msg}
            userPrompt={lastUserPrompt}
            onSuggestionClick={onSuggestionClick}
          />
        );
      }
    });

    return rendered;
  };

  return (
    <div className="message-list" aria-live="polite">
      {renderMessages()}

      {/* Streaming status / partial tokens */}
      {(streamingStatus || streamingText) && (
        <div className="assistant-message-row">
          {streamingStatus && (
            <div className="streaming-status">
              <div className="status-spinner" />
              <span>{streamingStatus}</span>
            </div>
          )}
          {streamingText && (
            <div className="assistant-text" style={{ opacity: 0.9 }}>
              {streamingText}
            </div>
          )}
        </div>
      )}

      {/* Error state with retry */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--sev-critical-bg)',
            border: '1px solid var(--sev-critical-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--sev-critical)',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              style={{
                background: 'none',
                border: '1px solid var(--sev-critical)',
                color: 'var(--sev-critical)',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
              }}
            >
              <RefreshCw size={12} />
              <span>Retry</span>
            </button>
          )}
        </div>
      )}

      <div ref={bottomRef} style={{ height: '1px' }} />
    </div>
  );
}
