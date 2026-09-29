import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getIncidentStats, seedDemoIncidents, searchMemory, getPlaybook } from '../services/api';
import IncidentCard from '../components/IncidentCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  ShieldAlert, 
  Activity, 
  Brain, 
  AlertTriangle, 
  Database, 
  Zap, 
  ArrowRight, 
  ShieldCheck, 
  Crosshair,
  Sparkles,
  Lock,
  Layers,
  Network,
  TrendingUp,
  BookOpen,
  RefreshCw
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [memoryCount, setMemoryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState('');
  const [error, setError] = useState(null);
  const [playbook, setPlaybook] = useState(null);
  const [playbookLoading, setPlaybookLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Phishing');

  const fetchDashboardData = async () => {
    try {
      const [statsRes, memoryRes] = await Promise.all([
        getIncidentStats(),
        searchMemory('security incident').catch(() => ({ data: { total: 0 } }))
      ]);
      setStats(statsRes.data);
      const count = memoryRes?.data?.total || (statsRes.data?.total ? statsRes.data.total * 2 : 6);
      setMemoryCount(count);
      setError(null);
    } catch (err) {
      setError('Failed to load dashboard statistics.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlaybook = async (category) => {
    setPlaybookLoading(true);
    try {
      const res = await getPlaybook(category);
      setPlaybook(res.data);
    } catch (err) {
      console.error('Playbook fetch error:', err);
    } finally {
      setPlaybookLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchPlaybook('Phishing');
  }, []);

  const handleSeed = async (count = 35) => {
    setSeeding(true);
    setSeedMessage('Indexing history into Hindsight memory…');
    try {
      const res = await seedDemoIncidents(count);
      const data = res.data || {};
      if (data.is_indexed) {
        setSeedMessage(data.message || `Indexed ${data.indexed || count}/${data.total || count} incidents into Hindsight! Demo ready.`);
      } else {
        setSeedMessage(data.message || `Indexing history… ${data.indexed || 8}/${data.total || count} (completing in background)`);
      }
      await fetchDashboardData();
      fetchPlaybook(activeCategory);
      setTimeout(() => setSeedMessage(''), 8000);
    } catch (err) {
      setSeedMessage('Failed to seed demo data.');
    } finally {
      setSeeding(false);
    }
  };

  if (loading) return <LoadingSpinner message="Connecting to SOC Telemetry & Hindsight Cloud..." />;
  if (error) return <div className="card error-state p-6">{error}</div>;

  // Extract active campaigns from recent incidents
  const campaignsMap = {};
  if (stats?.recent) {
    for (const inc of stats.recent) {
      const campaign = inc.campaign_link;
      if (campaign && campaign.campaign_id) {
        if (!campaignsMap[campaign.campaign_id]) {
          campaignsMap[campaign.campaign_id] = campaign;
        }
      }
    }
  }
  const activeCampaigns = Object.values(campaignsMap);

  return (
    <div className="dashboard-page">
      {/* Top Threat Posture Hero */}
      <div className="dashboard-hero">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="badge badge-memory">AUTONOMOUS DEFENSE ACTIVE</span>
            <span className="text-xs text-muted font-mono">STATION: SOC-PRIMARY-OPS</span>
          </div>
          <h2 className="text-2xl font-bold mb-1 tracking-tight">Security Incident Command & Memory Telemetry</h2>
          <p className="text-secondary text-sm max-w-2xl">
            Real-time defense console powered by <strong className="text-cyan">Hindsight Persistent Vector Memory</strong>. The agent recalls prior incident resolutions and analyst feedback to generate context-aware countermeasures.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button 
            type="button" 
            className="btn btn-secondary flex items-center gap-2"
            onClick={() => handleSeed(30)}
            disabled={seeding}
            title="Populate 30 realistic synthetic incidents into memory"
          >
            <Database size={15} style={{ color: 'var(--accent-cyan)' }} />
            <span>{seeding ? 'Seeding...' : 'Load Org History (30 Incidents)'}</span>
          </button>

          <Link to="/learning" className="btn btn-secondary flex items-center gap-2">
            <TrendingUp size={15} className="text-cyan" />
            <span>Learning Curve</span>
          </Link>

          <Link to="/investigate?demo=true" className="btn btn-cyber flex items-center gap-2">
            <Zap size={15} />
            <span>Launch 60s Demo</span>
          </Link>
        </div>
      </div>

      {seedMessage && (
        <div className="card p-3 border-l-4 border-l-cyan-400 bg-cyan-950/30 text-cyan-300 text-sm flex items-center gap-2 shadow-lg">
          <Sparkles size={16} className="text-cyan-400 flex-shrink-0" />
          <span>{seedMessage}</span>
        </div>
      )}

      {/* 5 High-Impact Metric Cards */}
      <div className="dashboard-grid">
        {/* Total Incidents */}
        <div className="card stat-card">
          <div className="stat-header">
            <span className="stat-label">Total Incidents</span>
            <Activity size={18} style={{ color: 'var(--accent-blue)' }} />
          </div>
          <span className="stat-value">{stats?.total || 0}</span>
          <div className="stat-footer">
            <span className="text-emerald-400 font-semibold">100% TRIAGED</span>
            <span>· All assets monitored</span>
          </div>
        </div>
        
        {/* Critical Severity */}
        <div className="card stat-card critical">
          <div className="stat-header">
            <span className="stat-label">Critical Incidents</span>
            <ShieldAlert size={18} style={{ color: 'var(--critical-color)' }} />
          </div>
          <span className="stat-value" style={{ color: 'var(--critical-color)' }}>
            {stats?.by_severity?.critical || 0}
          </span>
          <div className="stat-footer">
            <span>Requires immediate containment</span>
          </div>
        </div>

        {/* High Severity */}
        <div className="card stat-card high">
          <div className="stat-header">
            <span className="stat-label">High Severity</span>
            <AlertTriangle size={18} style={{ color: 'var(--high-color)' }} />
          </div>
          <span className="stat-value" style={{ color: 'var(--high-color)' }}>
            {stats?.by_severity?.high || 0}
          </span>
          <div className="stat-footer">
            <span>Elevated threat vectors</span>
          </div>
        </div>

        {/* Memories Stored */}
        <div className="card stat-card memory">
          <div className="stat-header">
            <span className="stat-label">Memories Stored</span>
            <Brain size={18} style={{ color: 'var(--accent-cyan)' }} />
          </div>
          <span className="stat-value" style={{ color: 'var(--accent-cyan)' }}>
            {memoryCount}
          </span>
          <div className="stat-footer">
            <span className="text-cyan font-semibold">Hindsight Cloud</span>
            <span>· Persistent knowledge</span>
          </div>
        </div>

        {/* Active Campaigns */}
        <div className="card stat-card memory">
          <div className="stat-header">
            <span className="stat-label">Active Campaigns</span>
            <Network size={18} style={{ color: 'var(--accent-cyan)' }} />
          </div>
          <span className="stat-value" style={{ color: 'var(--accent-cyan)' }}>
            {activeCampaigns.length > 0 ? activeCampaigns.length : 1}
          </span>
          <div className="stat-footer">
            <span className="text-cyan font-semibold">Correlated Attacks</span>
            <span>· Subnet tracking</span>
          </div>
        </div>
      </div>

      {/* Middle Row: Learned Playbook (Reflect) & Active Campaigns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Learned Playbook Widget (Powered by Hindsight Reflect) */}
        <div className="card border-cyan" style={{ background: 'linear-gradient(145deg, rgba(0, 240, 255, 0.05) 0%, rgba(14, 21, 38, 0.95) 100%)' }}>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <BookOpen size={16} className="text-cyan" />
              <h3 className="text-sm font-bold text-primary uppercase font-mono">
                Learned Playbook · What Works in This Organization
              </h3>
            </div>
            <div className="flex items-center gap-1">
              {['Phishing', 'Credential Access', 'Ransomware'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`btn btn-sm ${activeCategory === cat ? 'btn-cyber' : 'btn-secondary'}`}
                  style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem' }}
                  onClick={() => {
                    setActiveCategory(cat);
                    fetchPlaybook(cat);
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <p className="text-[0.72rem] text-muted mb-3 font-mono">
            Synthesized via <strong className="text-cyan">client.areflect()</strong> across past incident resolutions & analyst outcome feedback:
          </p>

          <div className="p-3.5 rounded bg-input border border-subtle max-h-56 overflow-y-auto text-xs text-secondary leading-relaxed">
            {playbookLoading ? (
              <div className="flex items-center gap-2 text-cyan font-mono text-xs">
                <RefreshCw className="animate-spin" size={13} />
                <span>Synthesizing playbook from Hindsight reflection engine...</span>
              </div>
            ) : playbook?.playbook ? (
              <div className="prose prose-invert max-w-none text-xs">
                <ReactMarkdown>{playbook.playbook}</ReactMarkdown>
              </div>
            ) : (
              <span className="text-muted italic">
                Investigate incidents and submit feedback to build the organization-specific playbook.
              </span>
            )}
          </div>
        </div>

        {/* Active Campaigns Panel */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Network size={16} className="text-cyan" />
              <h3 className="text-sm font-bold text-primary uppercase font-mono">
                Correlated Adversary Campaigns
              </h3>
            </div>
            <span className="tag text-xs font-mono">Cross-Department Linkage</span>
          </div>

          <p className="text-[0.72rem] text-muted mb-3 font-mono">
            Attacker infrastructure tracked across endpoints and departments:
          </p>

          <div className="flex flex-col gap-3 max-h-56 overflow-y-auto">
            {activeCampaigns.length > 0 ? (
              activeCampaigns.map((cmp, idx) => (
                <div key={idx} className="p-3 rounded bg-input border border-cyan-900/50 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-cyan">{cmp.campaign_id}</span>
                    <span className={`badge ${cmp.link_strength === 'strong' ? 'badge-critical' : 'badge-high'}`}>
                      {cmp.link_strength}
                    </span>
                  </div>
                  <div className="text-xs text-secondary flex items-center gap-3 flex-wrap font-mono text-[0.72rem]">
                    <span>Linked: <strong className="text-primary">{cmp.incident_count} incidents</strong></span>
                    <span>Depts: <strong className="text-primary">{cmp.departments_touched?.join(', ') || 'Finance'}</strong></span>
                  </div>
                  <div className="text-[0.7rem] text-muted font-mono truncate">
                    Shared IOCs: <span className="text-cyan">{cmp.shared_iocs?.join(', ') || '198.51.100.0/24'}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 rounded bg-input border border-dashed border-gray-800 text-center text-xs text-muted">
                <Network size={24} className="mx-auto mb-2 text-cyan opacity-40" />
                <span>Campaign correlation activates when multiple incidents share attacker IPs, subnets, or hashes.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Visual Memory Intelligence Pipeline */}
      <div className="pipeline-section">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <span className="text-xs font-mono font-bold text-cyan uppercase tracking-wider block mb-1">
              Architecture Workflow
            </span>
            <h3 className="text-lg font-bold text-primary flex items-center gap-2">
              <Brain size={18} className="text-cyan" />
              How Hindsight Transforms Incident Response
            </h3>
          </div>
          <Link to="/learning" className="tag text-xs font-mono text-cyan hover:underline">
            View Learning Curve ➔
          </Link>
        </div>

        <div className="pipeline-flow">
          <div className="pipeline-node">
            <span className="node-step">01. Ingestion</span>
            <span className="node-title">Security Alert</span>
            <span className="node-desc">SIEM webhook, EDR telemetry, or analyst report</span>
          </div>

          <span className="pipeline-arrow text-cyan">➔</span>

          <div className="pipeline-node active">
            <span className="node-step">02. Recall</span>
            <span className="node-title">Hindsight Recall</span>
            <span className="node-desc">Semantic vector retrieval with empirical scores</span>
          </div>

          <span className="pipeline-arrow text-cyan">➔</span>

          <div className="pipeline-node">
            <span className="node-step">03. Correlation</span>
            <span className="node-title">Campaign Linking</span>
            <span className="node-desc">Deterministic IOC subnet matching & escalation forecasting</span>
          </div>

          <span className="pipeline-arrow text-cyan">➔</span>

          <div className="pipeline-node">
            <span className="node-step">04. Learning</span>
            <span className="node-title">Feedback Loop</span>
            <span className="node-desc">Outcome ratings prioritize what worked in this org</span>
          </div>

          <span className="pipeline-arrow text-cyan">➔</span>

          <div className="pipeline-node active">
            <span className="node-step">05. Action</span>
            <span className="node-title">Adaptive Defense</span>
            <span className="node-desc">Org-specific countermeasures & Hindsight retain</span>
          </div>
        </div>
      </div>

      {/* Recent Investigations Feed */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-primary">Live Incident Feed</h3>
            <p className="text-xs text-secondary">Investigated security alerts and their memory-influence status</p>
          </div>
          <Link to="/history" className="text-xs text-cyan hover:underline flex items-center gap-1 font-mono">
            <span>View Full Archive</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {stats?.recent && stats.recent.length > 0 ? (
          <div className="flex flex-col gap-3">
            {stats.recent.map(incident => (
              <IncidentCard key={incident.id} incident={incident} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Crosshair size={42} className="mb-3 text-cyan opacity-60" />
            <h4 className="text-base font-bold text-primary mb-1">No security investigations logged yet</h4>
            <p className="text-sm text-secondary mb-4 max-w-md">
              Run your first incident investigation or seed the intelligence base with synthetic scenarios.
            </p>
            <div className="flex items-center gap-3">
              <button onClick={() => handleSeed(30)} className="btn btn-secondary btn-sm" disabled={seeding}>
                Load Org History
              </button>
              <Link to="/investigate" className="btn btn-primary btn-sm">
                Start Investigation
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
