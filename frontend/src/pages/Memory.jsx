import React, { useState, useEffect } from 'react';
import { getMemoryStats, searchMemory, getPlaybook } from '../services/api';
import MemoryCard from '../components/MemoryCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { Brain, Search, Sparkles, BookOpen, Layers, CheckCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const CATEGORIES = ['Phishing', 'Credential Theft', 'Ransomware', 'Lateral Movement'];

export default function Memory() {
  const [stats, setStats] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Phishing');
  const [playbook, setPlaybook] = useState('');
  const [loadingPlaybook, setLoadingPlaybook] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const statsRes = await getMemoryStats();
        setStats(statsRes.data);
      } catch (e) {
        console.error('Failed to fetch memory stats:', e);
      }
      executeSearch('incident');
    };
    init();
  }, []);

  useEffect(() => {
    fetchPlaybook(selectedCategory);
  }, [selectedCategory]);

  const fetchPlaybook = async (cat) => {
    setLoadingPlaybook(true);
    try {
      const res = await getPlaybook(cat);
      setPlaybook(res.data?.playbook || 'No playbook data recorded for this category yet.');
    } catch (e) {
      setPlaybook('Playbook synthesis unavailable. Investigate incidents and submit feedback to build historical playbooks.');
    } finally {
      setLoadingPlaybook(false);
    }
  };

  const executeSearch = async (query) => {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const res = await searchMemory(query);
      setSearchResults(res.data?.results || []);
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    executeSearch(searchQuery);
  };

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto', padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)' }}>Hindsight Memory Bank</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
          Persistent organizational intelligence: incidents, remediation outcomes, analyst feedback, and campaign linkages.
        </p>
      </div>

      {/* "What I've Learned" (Playbook Panel) - Phase 3 Star Feature */}
      <div style={{ padding: '20px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
        <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: '14px' }}>
          <div className="flex items-center gap-2">
            <BookOpen size={18} style={{ color: 'var(--accent-teal)' }} />
            <h2 style={{ fontSize: '16px', fontWeight: 600 }}>What CyberHinsight Has Learned</h2>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--accent-teal)', backgroundColor: 'var(--bg-accent-soft)', padding: '2px 8px', borderRadius: '12px' }}>
            Hindsight Reflect Synthesis
          </span>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
          Synthesized remediation patterns and effective responses ranked from actual incident outcomes in this organization:
        </p>

        {/* Category Selector */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid',
                borderColor: selectedCategory === cat ? 'var(--accent-teal)' : 'var(--border-color)',
                backgroundColor: selectedCategory === cat ? 'var(--bg-accent-soft)' : 'var(--bg-surface)',
                color: selectedCategory === cat ? 'var(--accent-teal)' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Playbook Content */}
        <div style={{ padding: '14px 16px', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', minHeight: '80px' }}>
          {loadingPlaybook ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>
              <div className="status-spinner" />
              <span>Synthesizing playbook from Hindsight memory…</span>
            </div>
          ) : (
            <div className="assistant-text" style={{ fontSize: '13px', lineHeight: 1.6 }}>
              <ReactMarkdown>{playbook}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>

      {/* Memory Search Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="flex items-center justify-between">
          <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Search Organizational Memory</h2>
          {stats && (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Bank ID: <code style={{ color: 'var(--accent-teal)' }}>{stats.bank_id}</code>
            </span>
          )}
        </div>

        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              placeholder="Search by IOC, host, malware type, or remediation action…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                height: '40px',
                padding: '0 14px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>
          <button
            type="submit"
            className="btn-send"
            disabled={isSearching}
            style={{ height: '40px' }}
          >
            <Search size={15} />
            <span>Search</span>
          </button>
        </form>

        {/* Search Results */}
        {isSearching ? (
          <LoadingSpinner message="Searching Hindsight memory..." />
        ) : searchResults.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            No matching memories found for your query.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {searchResults.map((item, idx) => (
              <MemoryCard key={idx} memory={item} index={idx} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
