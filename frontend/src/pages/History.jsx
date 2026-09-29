import React, { useState, useEffect } from 'react';
import { getIncidentHistory } from '../services/api';
import IncidentCard from '../components/IncidentCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { Archive, Search, Filter, ShieldAlert, Brain, Server, Terminal, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const History = () => {
  const [incidents, setIncidents] = useState([]);
  const [filteredIncidents, setFilteredIncidents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await getIncidentHistory();
        const list = Array.isArray(res.data) ? res.data : (res.data.incidents || []);
        // Sort reverse chronological
        const sorted = [...list].reverse();
        setIncidents(sorted);
        setFilteredIncidents(sorted);
      } catch (err) {
        setError('Failed to load incident history archive.');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  // Filter effect
  useEffect(() => {
    let result = [...incidents];
    
    if (selectedSeverity !== 'ALL') {
      result = result.filter(inc => {
        const sev = (inc.severity || inc.incident?.severity || '').toUpperCase();
        return sev === selectedSeverity;
      });
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(inc => {
        const summary = (inc.summary || inc.incident?.summary || '').toLowerCase();
        const desc = (inc.description || inc.incident?.description || '').toLowerCase();
        const asset = (inc.affected_asset || inc.incident?.affected_asset || '').toLowerCase();
        const category = (inc.category || inc.incident?.category || '').toLowerCase();
        return summary.includes(term) || desc.includes(term) || asset.includes(term) || category.includes(term);
      });
    }

    setFilteredIncidents(result);
  }, [searchTerm, selectedSeverity, incidents]);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (loading) return <LoadingSpinner message="Accessing Incident Telemetry Archive..." />;
  if (error) return <div className="card error-state p-6">{error}</div>;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge badge-memory">TRIAGED ALERT ARCHIVE</span>
            <span className="text-xs text-muted font-mono">{incidents.length} TOTAL INVESTIGATIONS</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Incident Investigation History</h2>
          <p className="text-secondary text-sm">
            Auditable log of all security investigations, AI diagnostics, and Hindsight memory linkages.
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <input 
              type="text" 
              className="input text-xs font-mono py-1.5 px-3 w-56" 
              placeholder="Filter by keyword or asset..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Severity Filter Buttons */}
          <div className="flex items-center gap-1 bg-input p-1 rounded-md border border-subtle">
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((sev) => (
              <button
                key={sev}
                type="button"
                onClick={() => setSelectedSeverity(sev)}
                className={`text-[0.68rem] font-mono px-2.5 py-1 rounded transition-all font-semibold ${selectedSeverity === sev ? 'bg-cyan text-black font-bold' : 'text-secondary hover:text-white'}`}
                style={selectedSeverity === sev ? { backgroundColor: 'var(--accent-cyan)' } : {}}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main List */}
      {filteredIncidents.length === 0 ? (
        <div className="empty-state p-12">
          <Archive size={40} className="mb-2 text-cyan opacity-40" />
          <h4 className="text-base font-bold text-primary mb-1">No Archived Incidents Found</h4>
          <p className="text-xs text-muted">
            {searchTerm || selectedSeverity !== 'ALL' 
              ? 'No incidents match your current search or severity filter.' 
              : 'Investigate your first incident to begin accumulating security intelligence.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredIncidents.map(incident => (
            <div key={incident.id} className="flex flex-col gap-2">
              <IncidentCard 
                incident={incident} 
                onClick={() => toggleExpand(incident.id)}
                isExpanded={expandedId === incident.id}
              />
              
              {/* Detailed Telemetry Drawer */}
              {expandedId === incident.id && (
                <div className="card bg-bg-secondary p-5 border-cyan" style={{ borderLeft: '3px solid var(--accent-cyan)' }}>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Details */}
                    <div>
                      <h4 className="text-xs font-bold uppercase font-mono text-cyan mb-2 flex items-center gap-1.5">
                        <Terminal size={13} /> Raw Incident Telemetry
                      </h4>
                      <div className="bg-input p-3 rounded text-xs text-secondary font-mono whitespace-pre-wrap border border-subtle leading-relaxed mb-4">
                        {incident.description || incident.incident?.description || 'No raw telemetry logged.'}
                      </div>
                      
                      <h4 className="text-xs font-bold uppercase font-mono text-secondary mb-1.5">
                        Investigation Findings
                      </h4>
                      <div className="text-xs text-secondary prose prose-invert leading-relaxed">
                        <ReactMarkdown>{incident.analysis?.investigation_findings || incident.analysis?.root_cause || 'Investigation concluded.'}</ReactMarkdown>
                      </div>
                    </div>
                    
                    {/* Right Details: Actions & Memory */}
                    <div>
                      <h4 className="text-xs font-bold uppercase font-mono text-cyan mb-2 flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-emerald-400" /> Containment Actions Executed
                      </h4>
                      <div className="bg-input p-3 rounded text-xs text-secondary border border-subtle mb-4">
                        <ul className="action-list text-xs">
                          {(incident.recommendations?.immediate_actions || []).map((action, i) => (
                            <li key={i}><ReactMarkdown>{action}</ReactMarkdown></li>
                          ))}
                        </ul>
                      </div>

                      {/* Memory Link Rationale */}
                      {incident.recommendations?.why_these_recommendations && (
                        <div className="p-3 rounded bg-cyan-950/20 border border-cyan-500/20 text-xs">
                          <span className="text-[0.68rem] font-mono text-cyan uppercase font-bold block mb-1">
                            🧠 Memory Adaptive Context
                          </span>
                          <p className="text-secondary italic">
                            {incident.recommendations.why_these_recommendations}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
