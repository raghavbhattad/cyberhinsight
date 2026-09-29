import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Plus, 
  Trash2, 
  Archive, 
  Brain, 
  Info,
  Sun,
  Moon,
  MessageSquare,
} from 'lucide-react';
import { listConversations, deleteConversation } from '../services/api';

export default function Sidebar({
  activeConversationId,
  onSelectConversation,
  onNewChat,
  refreshKey,
}) {
  const [conversations, setConversations] = useState([]);
  const [theme, setTheme] = useState(
    () => localStorage.getItem('ch_theme') || 'light'
  );
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ch_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const fetchConversations = async () => {
    try {
      const res = await listConversations();
      if (res.data) {
        setConversations(res.data);
      }
    } catch (err) {
      console.debug('Failed to load conversations list:', err);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [refreshKey]);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        onNewChat();
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="brand-icon">
            <Shield size={22} />
          </div>
          <div>
            <h1 className="brand-title">CyberHinsight</h1>
            <p className="brand-subtitle">Defensive AI Security</p>
          </div>
        </div>

        {/* New Chat Button */}
        <button
          type="button"
          className="btn-new-chat"
          onClick={() => {
            onNewChat();
            navigate('/');
          }}
        >
          <Plus size={16} />
          <span>New conversation</span>
        </button>
      </div>

      {/* Conversations List */}
      <nav className="conversations-nav" aria-label="Conversation history">
        <div className="conversations-header">Recent Chats</div>
        {conversations.length === 0 ? (
          <div style={{ padding: '12px 10px', fontSize: '12px', color: 'var(--text-muted)' }}>
            No recent conversations
          </div>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.id}
              type="button"
              className={`conv-item ${activeConversationId === conv.id ? 'active' : ''}`}
              onClick={() => {
                onSelectConversation(conv.id);
                navigate('/');
              }}
            >
              <div className="flex items-center gap-2" style={{ minWidth: 0, flex: 1 }}>
                <MessageSquare size={13} style={{ flexShrink: 0, opacity: 0.6 }} />
                <span className="conv-title">{conv.title}</span>
              </div>
              <button
                type="button"
                className="conv-delete-btn"
                title="Delete conversation"
                onClick={(e) => handleDelete(e, conv.id)}
              >
                <Trash2 size={12} />
              </button>
            </button>
          ))
        )}
      </nav>

      {/* Secondary Links Footer */}
      <div className="sidebar-footer">
        <NavLink
          to="/history"
          className={({ isActive }) => `footer-nav-link ${isActive ? 'active' : ''}`}
        >
          <Archive size={15} />
          <span>History</span>
        </NavLink>

        <NavLink
          to="/memory"
          className={({ isActive }) => `footer-nav-link ${isActive ? 'active' : ''}`}
        >
          <Brain size={15} />
          <span>Memory</span>
        </NavLink>

        <NavLink
          to="/about"
          className={({ isActive }) => `footer-nav-link ${isActive ? 'active' : ''}`}
        >
          <Info size={15} />
          <span>About</span>
        </NavLink>

        {/* Theme Toggle */}
        <div className="theme-toggle-row">
          <span>Theme</span>
          <button
            type="button"
            className="btn-theme-toggle"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
            <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
