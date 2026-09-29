import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Shield, 
  LayoutDashboard, 
  Crosshair, 
  Archive, 
  Brain, 
  Network,
  Activity
} from 'lucide-react';

const Sidebar = () => {
  const navItems = [
    { path: '/', label: 'Overview & Metrics', index: '01', icon: LayoutDashboard },
    { path: '/investigate', label: 'Live Investigation', index: '02', icon: Crosshair },
    { path: '/history', label: 'Incident Archive', index: '03', icon: Archive },
    { path: '/memory', label: 'Hindsight Memory Bank', index: '04', icon: Brain },
    { path: '/architecture', label: 'Defense Architecture', index: '05', icon: Network },
  ];

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-icon-wrapper">
          <Shield size={24} style={{ color: 'var(--accent-cyan)' }} />
        </div>
        <div>
          <h1 className="brand-title">CYBERHINSIGHT</h1>
          <p className="brand-subtitle">Autonomous SOC Intelligence</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <item.icon size={18} />
            <span style={{ flexGrow: 1 }}>{item.label}</span>
            <span className="nav-index">{item.index}</span>
          </NavLink>
        ))}
      </nav>

      {/* Persistent Intelligence Widget */}
      <div className="sidebar-footer">
        <div className="memory-engine-badge">
          <div className="engine-header">
            <span>Memory Architecture</span>
            <span className="pulse-dot cyan"></span>
          </div>
          <div className="engine-status">
            <Brain size={14} />
            <span>Hindsight Cloud</span>
          </div>
          <div className="text-xs text-muted font-mono" style={{ fontSize: '0.68rem' }}>
            BANK: <span className="text-primary font-semibold">cyberhinsight</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
