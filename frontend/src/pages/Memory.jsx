import React, { useState, useEffect } from 'react';
import { getMemoryStats, searchMemory, reflectMemory } from '../services/api';
import MemoryCard from '../components/MemoryCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  Brain, 
  Search, 
  Database, 
  MessageSquare, 
  Sparkles, 
  Filter, 
  Layers, 
  Radio, 
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const QUICK_FILTERS = [
  'All Telemetry',
  'Phishing & PowerShell',
  'Credential Access',
  'Finance Endpoints',
  'C2 Beaconing (203.0.113.x)',
  'Containment Outcomes'
];

const SUGGESTED_REFLECTIONS = [
  "What are our primary recurring initial access vectors?",
  "Analyze repeat C2 infrastructure and IP ranges targeting Finance.",
  "Which containment actions were most effective against macro droppers?"
];

const Memory = () => {
  const [stats, setStats] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [totalMemories, setTotalMemories] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All Telemetry');
  
  const [reflectQuery, setReflectQuery] = useState('');
  const [reflection, setReflection] = useState('');
  const [isReflecting, setIsReflecting] = useState(false);

  // Initial load: Fetch stats and auto-load baseline memories
  useEffect(() => {
    const initMemory = async () => {
      try {
        const statsRes = await getMemoryStats();
        setStats(statsRes.data);
      } catch (err) {
        console.error(err);
      }

      // Initial search to populate recent memories
      executeSearch('security incident');
    };
    initMemory();
  }, []);

  const executeSearch = async (query) => {
    setIsSearching(true);
    try {
      const res = await searchMemory(query);
      const results = res.data.results || [];
      setSearchResults(results);
      setTotalMemories(res.data.total || results.length);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    executeSearch(searchQuery);
  };

  const handleFilterClick = (filter) => {
    setActiveFilter(filter);
    if (filter === 'All Telemetry') {
      executeSearch('incident');
    } else {
      executeSearch(filter);
    }
  };

  const handleReflect = async (queryText) => {
    const query = queryText || reflectQuery;
    if (!query.trim()) return;
    
    setReflectQuery(query);
    setIsReflecting(true);
    setReflection('');
    try {
      const res = await reflectMemory(query);
      setReflection(res.data.text || res.data.reflection || 'No synthesis generated.');
    } catch (err) {
      console.error(err);
      setReflection('Error connecting to Hindsight reflection engine. Ensure API key is configured.');
    } finally {
      setIsReflecting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge badge-memory">PERSISTENT VECTOR KNOWLEDGE BASE</span>
            <span className="text-xs text-muted font-mono">RETRIEVAL ENGINE: HINDSIGHT CLOUD</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="text-cyan" />
            Hindsight Threat Memory Bank
          </h2>
          <p className="text-secondary text-sm">
            Autonomous vector storage and semantic retrieval for organizational incident knowledge.
          </p>
        </div>
        
        {/* Memory Bank Telemetry Card */}
        <div className="card p-3 flex items-center gap-4 text-xs font-mono border-cyan">
          <div className="flex items-center gap-2">
            <Database size={15} className="text-cyan" />
            <span className="text-muted">BANK:</span>
            <span className="font-bold text-primary">{stats?.bank_id || 'cyberhinsight'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Radio size={13} className="text-emerald-400 animate-pulse" />
            <span className="text-muted">STATUS:</span>
            <span className="text-emerald-400 font-bold">{stats?.status?.toUpperCase() || 'ONLINE'}</span>
          </div>
          <div className="flex items-center gap-2 pl-2 border-l border-subtle">
            <Layers size={13} className="text-cyan" />
            <span className="text-muted">INGESTED:</span>
            <span className="text-cyan font-bold">{totalMemories > 0 ? totalMemories : 6}+ NODES</span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Split: Intelligence Explorer & AI Reflection */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (7 cols): Memory Explorer & Search */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="card">
            <div className="section-title text-cyan" style={{ color: 'var(--accent-cyan)' }}>
              <Search size={15} /> Semantic Memory Search
            </div>

            {/* Search Input Bar */}
            <form onSubmit={handleSearch} className="flex gap-2 mb-3">
              <input 
                type="text" 
                className="input flex-grow text-xs font-mono" 
                placeholder="Query semantic memory (e.g. 'phishing on FIN-WS-042', 'PowerShell C2')" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button 
                type="submit" 
                className="btn btn-primary btn-sm flex items-center gap-1.5" 
                disabled={isSearching || !searchQuery.trim()}
              >
                {isSearching ? <RefreshCw className="animate-spin" size={13} /> : <Search size={13} />}
                <span>Search</span>
              </button>
            </form>

            {/* Quick Filters */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[0.68rem] uppercase font-mono text-muted flex items-center gap-1">
                <Filter size={11} /> Filters:
              </span>
              {QUICK_FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => handleFilterClick(f)}
                  className={`tag cursor-pointer transition-all text-[0.68rem] ${activeFilter === f ? 'border-cyan bg-cyan-950/60 text-cyan' : 'hover:border-gray-500'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Results List */}
          <div className="flex flex-col gap-3 min-h-[350px]">
            {isSearching ? (
              <div className="card p-12 flex flex-col items-center justify-center">
                <LoadingSpinner message="Searching vector embeddings in Hindsight..." />
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((result, idx) => (
                <MemoryCard key={idx} memory={result} />
              ))
            ) : (
              <div className="empty-state p-8">
                <Brain size={36} className="text-cyan mb-2 opacity-50" />
                <p className="font-semibold text-primary text-sm mb-1">No Memories Matched</p>
                <p className="text-xs text-muted">Try a broader query such as "phishing", "PowerShell", or "Finance".</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): AI Reflection & Synthesis Engine */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="card border-cyan" style={{ background: 'linear-gradient(145deg, rgba(0, 240, 255, 0.04) 0%, rgba(14, 21, 38, 0.95) 100%)' }}>
            <div className="section-title text-cyan" style={{ color: 'var(--accent-cyan)' }}>
              <Sparkles size={15} /> Hindsight Reflection Engine
            </div>

            <p className="text-xs text-secondary mb-3 leading-relaxed">
              Ask Hindsight to synthesize insights, identify recurring attack vectors, or summarize resolution playbooks across organizational memories.
            </p>

            {/* Quick Prompts */}
            <div className="flex flex-col gap-1.5 mb-3">
              <span className="text-[0.68rem] font-mono text-muted uppercase">Suggested Queries:</span>
              {SUGGESTED_REFLECTIONS.map((sq, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleReflect(sq)}
                  className="text-left text-xs p-2 rounded bg-input border border-subtle hover:border-cyan text-secondary hover:text-cyan transition-all font-mono"
                >
                  ▸ {sq}
                </button>
              ))}
            </div>

            {/* Custom Input */}
            <form onSubmit={(e) => { e.preventDefault(); handleReflect(); }} className="flex gap-2 mb-4">
              <input 
                type="text" 
                className="input flex-grow text-xs font-mono" 
                placeholder="Ask Hindsight to synthesize..." 
                value={reflectQuery}
                onChange={(e) => setReflectQuery(e.target.value)}
              />
              <button 
                type="submit" 
                className="btn btn-cyber btn-sm" 
                disabled={isReflecting || !reflectQuery.trim()}
              >
                {isReflecting ? 'Synthesizing...' : 'Reflect'}
              </button>
            </form>

            {/* Reflection Synthesis Output Card */}
            <div className="bg-input border border-subtle rounded-md p-4 min-h-[220px]">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-subtle">
                <span className="text-[0.68rem] font-mono uppercase font-semibold text-cyan">
                  Autonomous Synthesis
                </span>
                <span className="text-[0.65rem] font-mono text-muted">BUDGET: MID</span>
              </div>

              {isReflecting ? (
                <div className="p-8 flex flex-col items-center justify-center">
                  <LoadingSpinner message="Reflecting across memory bank..." />
                </div>
              ) : reflection ? (
                <div className="prose prose-invert max-w-none text-xs text-primary leading-relaxed">
                  <ReactMarkdown>{reflection}</ReactMarkdown>
                </div>
              ) : (
                <div className="text-center py-10 text-muted text-xs">
                  <Brain size={28} className="mx-auto mb-2 text-cyan opacity-30" />
                  Select a suggested query above or type a custom question to extract organizational patterns.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Memory;
