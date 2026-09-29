import React, { useState, useEffect } from 'react';
import { getIncidentHistory } from '../services/api';
import IncidentCard from '../components/IncidentCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { Archive, Search, Filter } from 'lucide-react';

export default function History() {
  const [incidents, setIncidents] = useState([]);
  const [filteredIncidents, setFilteredIncidents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await getIncidentHistory();
        const list = Array.isArray(res.data) ? res.data : (res.data.incidents || []);
        const sorted = [...list].reverse();
        setIncidents(sorted);
        setFilteredIncidents(sorted);
      } catch (err) {
        setError('Failed to load incident history.');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  useEffect(() => {
    let result = [...incidents];

    if (selectedSeverity !== 'ALL') {
      result = result.filter((inc) => {
        const sev = (inc.severity || inc.incident?.severity || '').toUpperCase();
        return sev === selectedSeverity;
      });
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((inc) => {
        const summary = (inc.summary || inc.incident?.summary || '').toLowerCase();
        const desc = (inc.description || inc.incident?.description || '').toLowerCase();
        const asset = (inc.affected_asset || inc.incident?.affected_asset || '').toLowerCase();
        const category = (inc.category || inc.incident?.category || '').toLowerCase();
        return (
          summary.includes(term) ||
          desc.includes(term) ||
          asset.includes(term) ||
          category.includes(term)
        );
      });
    }

    setFilteredIncidents(result);
  }, [searchTerm, selectedSeverity, incidents]);

  if (loading) return <LoadingSpinner message="Loading incident history..." />;
  if (error) return <div style={{ padding: '24px', color: 'var(--sev-critical)' }}>{error}</div>;

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto', padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)' }}>Incident History</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
          Historical record of investigated security alerts, AI findings, and remediations stored in memory.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ position: 'relative', width: '280px' }}>
          <input
            type="text"
            placeholder="Search by keyword or host…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              height: '38px',
              padding: '0 12px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none',
            }}
          />
        </div>

        {/* Severity Filters */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
            <button
              key={sev}
              type="button"
              onClick={() => setSelectedSeverity(sev)}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 500,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid',
                borderColor: selectedSeverity === sev ? 'var(--accent-teal)' : 'var(--border-color)',
                backgroundColor: selectedSeverity === sev ? 'var(--bg-accent-soft)' : 'var(--bg-surface)',
                color: selectedSeverity === sev ? 'var(--accent-teal)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Incidents List */}
      {filteredIncidents.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
          No incidents found matching your criteria.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredIncidents.map((incident, idx) => (
            <IncidentCard key={incident.id || idx} incident={incident} />
          ))}
        </div>
      )}
    </div>
  );
}
