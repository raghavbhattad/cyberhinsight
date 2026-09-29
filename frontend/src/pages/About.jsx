import React, { useState } from 'react';
import { 
  Shield, 
  Brain, 
  Server, 
  Cpu, 
  Network, 
  TrendingUp, 
  CheckCircle2, 
  Split,
  MessageSquare
} from 'lucide-react';
import LearningCurve from './LearningCurve';

export default function About() {
  const [activeTab, setActiveTab] = useState('architecture');

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto', padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)' }}>About CyberHinsight</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
          Defensive AI security incident-response agent powered by Groq LLM inference and Hindsight persistent memory.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '2px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('architecture')}
          style={{
            padding: '8px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'architecture' ? '2px solid var(--accent-teal)' : '2px solid transparent',
            color: activeTab === 'architecture' ? 'var(--accent-teal)' : 'var(--text-muted)',
            fontWeight: 500,
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Network size={15} />
          <span>System Architecture</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('learning')}
          style={{
            padding: '8px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'learning' ? '2px solid var(--accent-teal)' : '2px solid transparent',
            color: activeTab === 'learning' ? 'var(--accent-teal)' : 'var(--text-muted)',
            fontWeight: 500,
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <TrendingUp size={15} />
          <span>Learning Curve & Evaluation</span>
        </button>
      </div>

      {/* Architecture Tab Content */}
      {activeTab === 'architecture' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Overview Card */}
          <div style={{ padding: '20px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>Chat-First Defensive Pipeline</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              CyberHinsight operates as an interactive conversational security assistant. Every incoming message is routed
              deterministically or through LLM intent classification into one of four distinct operational workflows:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '16px' }}>
              <div style={{ padding: '12px', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--accent-teal)', marginBottom: '4px' }}>1. Investigate</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Extracts IOCs, recalls past cases from Hindsight, validates structured findings, links campaigns, and retains facts.</div>
              </div>
              <div style={{ padding: '12px', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--accent-teal)', marginBottom: '4px' }}>2. Ask History</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Answers historical queries strictly from recalled memories. Never invents incidents or infrastructure.</div>
              </div>
              <div style={{ padding: '12px', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--accent-teal)', marginBottom: '4px' }}>3. Teach</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Retains outcome feedback or analyst notes into Hindsight so subsequent recommendations adapt.</div>
              </div>
              <div style={{ padding: '12px', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--accent-teal)', marginBottom: '4px' }}>4. General</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>General cybersecurity advice and procedure queries, optionally enriched with relevant org context.</div>
              </div>
            </div>
          </div>

          {/* Diagram Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ padding: '18px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
              <div className="flex items-center gap-2" style={{ marginBottom: '8px' }}>
                <Cpu size={18} style={{ color: 'var(--accent-teal)' }} />
                <h4 style={{ fontSize: '15px', fontWeight: 600 }}>Groq LLM Engine</h4>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                High-throughput inference delivering structured incident triage, IOC extraction parsing, and real-time token streaming.
              </p>
            </div>

            <div style={{ padding: '18px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
              <div className="flex items-center gap-2" style={{ marginBottom: '8px' }}>
                <Brain size={18} style={{ color: 'var(--accent-teal)' }} />
                <h4 style={{ fontSize: '15px', fontWeight: 600 }}>Hindsight Persistent Memory</h4>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Semantic vector recall, pattern reflection, and structured retention with tags (outcome, category, severity, campaign).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Learning Curve Tab Content */}
      {activeTab === 'learning' && (
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          <LearningCurve />
        </div>
      )}
    </div>
  );
}
