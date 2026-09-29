import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { healthCheck } from '../services/api';
import { Menu, AlertTriangle } from 'lucide-react';

export default function Layout({
  activeConversationId,
  setActiveConversationId,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [health, setHealth] = useState({ status: 'ok', hindsight: true, groq: true });
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const check = async () => {
      try {
        const res = await healthCheck();
        setHealth({
          status: res.data.status,
          hindsight: res.data.hindsight,
          groq: res.data.groq,
        });
      } catch (e) {
        setHealth({ status: 'error', hindsight: false, groq: false });
      }
    };
    check();
  }, []);

  const handleNewChat = () => {
    setActiveConversationId(null);
    setMobileMenuOpen(false);
    navigate('/');
  };

  const handleSelectConversation = (id) => {
    setActiveConversationId(id);
    setMobileMenuOpen(false);
    navigate('/');
  };

  const handleRefreshSidebar = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="app-layout">
      {/* Mobile top header */}
      <header className="mobile-header">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}
        >
          <Menu size={20} />
        </button>
        <span style={{ fontWeight: 600, fontSize: '15px' }}>CyberHinsight</span>
        <div style={{ width: 20 }} />
      </header>

      {/* Sidebar */}
      <div className={mobileMenuOpen ? 'sidebar open' : 'sidebar'}>
        <Sidebar
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          refreshKey={refreshKey}
        />
      </div>

      {/* Main Content Area */}
      <div className="main-wrapper">
        {/* Unobtrusive notification if memory is down */}
        {!health.hindsight && (
          <div
            style={{
              padding: '6px 16px',
              backgroundColor: 'var(--sev-medium-bg)',
              borderBottom: '1px solid var(--sev-medium-border)',
              color: 'var(--sev-medium)',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertTriangle size={14} />
            <span>Hindsight memory service is currently offline. Answering using baseline mode.</span>
          </div>
        )}

        <Outlet context={{
          conversationId: activeConversationId,
          setConversationId: setActiveConversationId,
          onRefreshSidebar: handleRefreshSidebar,
        }} />
      </div>
    </div>
  );
}
