import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Brain, Check, ShieldAlert } from 'lucide-react';

export default function Composer({
  onSend,
  disabled,
  lastMemorySaved = null,
  externalPrompt = '',
}) {
  const [text, setText] = useState('');
  const [useMemory, setUseMemory] = useState(true);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (externalPrompt) {
      setText(externalPrompt);
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
      }
    }
  }, [externalPrompt]);

  const handleInput = (e) => {
    setText(e.target.value);
    // Auto-grow textarea up to 160px
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!text.trim() || disabled) return;
    onSend(text.trim(), useMemory);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  return (
    <div className="composer-outer">
      <div className="composer-box">
        <textarea
          ref={textareaRef}
          className="composer-textarea"
          rows={1}
          placeholder="Describe an incident, ask about past alerts, or note remediation feedback…"
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />

        <div className="composer-toolbar">
          <div className="composer-controls">
            {/* Memory On/Off Toggle */}
            <label className="memory-toggle" title="Toggle Hindsight memory recall & retention">
              <span
                className={`toggle-switch ${useMemory ? 'active' : ''}`}
                onClick={() => setUseMemory(!useMemory)}
              >
                <span className="toggle-knob" />
              </span>
              <span className="flex items-center gap-1">
                <Brain size={13} style={{ color: useMemory ? 'var(--accent-teal)' : 'var(--text-muted)' }} />
                <span>Memory: {useMemory ? 'On' : 'Off'}</span>
              </span>
            </label>

            {/* Memory saved indicator after turns */}
            {lastMemorySaved === true && (
              <span className="flex items-center gap-1 text-muted" style={{ fontSize: '11px', color: 'var(--accent-teal)' }}>
                <Check size={12} />
                <span>Memory saved ✓</span>
              </span>
            )}
            {lastMemorySaved === false && (
              <span className="flex items-center gap-1 text-muted" style={{ fontSize: '11px' }}>
                <span>Not saved</span>
              </span>
            )}
          </div>

          <button
            type="button"
            className="btn-send"
            onClick={handleSubmit}
            disabled={!text.trim() || disabled}
            aria-label="Send message"
          >
            <span>Send</span>
            <ArrowUp size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
