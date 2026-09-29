import React, { useEffect, useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import { healthCheck } from '../services/api';
import { 
  ShieldAlert, 
  Cpu, 
  Brain, 
  Server, 
  Clock, 
  Zap,
  Radio
} from 'lucide-react';

const Layout = () => {
  const [health, setHealth] = useState({ status: 'checking', hindsight: false, groq: false });
  const [currentTime, setCurrentTime] = useState('');

  // Live UTC Clock for SOC
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toUTCString().replace('GMT', 'UTC'));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Live Health Polling
  useEffect(() => {
    const check = async () => {
      try {
        const res = await healthCheck();
        setHealth({
          status: res.data.status,
          hindsight: res.data.hindsight,
          groq: res.data.groq
        });
      } catch (err) {
        setHealth({ status: 'error', hindsight: false, groq: false });
      }
    };
    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        {/* Enterprise SOC Top Telemetry Bar */}
        <header className="soc-topbar">
          <div className="telemetry-group">
            {/* Threat Level */}
            <div className="threat-defcon-badge">
              <Radio size={14} className="animate-pulse" />
              <span>DEFCON 3 // ELEVATED POSTURE</span>
            </div>

            {/* Real-time UTC */}
            <div className="telemetry-pill">
              <Clock size={13} style={{ color: 'var(--text-muted)' }} />
              <span className="telemetry-value font-mono" style={{ fontSize: '0.72rem' }}>
                {currentTime || 'SYNCHRONIZING UTC...'}
              </span>
            </div>
          </div>

          {/* Right Telemetry: Real Health Status */}
          <div className="telemetry-group">
            {/* Backend API */}
            <div className="telemetry-pill" title="FastAPI Core Engine">
              <Server size={13} style={{ color: 'var(--text-muted)' }} />
              <span className="telemetry-label">API</span>
              <span className={`pulse-dot ${health.status === 'ok' ? 'online' : 'critical'}`}></span>
              <span className={`telemetry-value ${health.status === 'ok' ? 'online' : 'offline'}`}>
                {health.status === 'ok' ? 'ONLINE' : 'CONNECTING'}
              </span>
            </div>

            {/* Groq LLM */}
            <div className="telemetry-pill" title="Groq Inference Engine">
              <Cpu size={13} style={{ color: 'var(--text-muted)' }} />
              <span className="telemetry-label">LLM</span>
              <span className={`pulse-dot ${health.groq ? 'online' : 'critical'}`}></span>
              <span className={`telemetry-value ${health.groq ? 'online' : 'offline'}`}>
                {health.groq ? 'GROQ' : 'DEGRADED'}
              </span>
            </div>

            {/* Hindsight Memory */}
            <div className="telemetry-pill" title="Hindsight Cloud Vector Memory Bank">
              <Brain size={13} style={{ color: 'var(--accent-cyan)' }} />
              <span className="telemetry-label">MEMORY</span>
              <span className={`pulse-dot ${health.hindsight ? 'cyan' : 'critical'}`}></span>
              <span className={`telemetry-value ${health.hindsight ? 'online' : 'offline'}`} style={health.hindsight ? { color: 'var(--accent-cyan)' } : {}}>
                {health.hindsight ? 'HINDSIGHT' : 'OFFLINE'}
              </span>
            </div>

            {/* Prominent Quick Demo Button */}
            <Link to="/investigate?demo=true" className="btn btn-cyber btn-sm" style={{ gap: '0.4rem', textDecoration: 'none' }}>
              <Zap size={13} />
              <span>RUN MEMORY DEMO</span>
            </Link>
          </div>
        </header>

        {/* Main Routed Content */}
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
