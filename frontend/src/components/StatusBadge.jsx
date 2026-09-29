import React from 'react';

export const StatusBadge = ({ severity, className = '' }) => {
  const norm = severity?.toLowerCase() || 'low';
  
  const dotColors = {
    critical: '#ff3366',
    high: '#f97316',
    medium: '#eab308',
    low: '#10b981'
  };

  return (
    <span className={`badge badge-${norm} ${className}`}>
      <span 
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: dotColors[norm] || dotColors.low,
          boxShadow: norm === 'critical' ? '0 0 6px #ff3366' : 'none'
        }}
      />
      <span>{severity ? severity.toUpperCase() : 'UNKNOWN'}</span>
    </span>
  );
};

export const StatusDot = ({ severity, className = '' }) => {
  const norm = severity?.toLowerCase() || 'low';
  const colors = {
    critical: 'var(--critical-color)',
    high: 'var(--high-color)',
    medium: 'var(--medium-color)',
    low: 'var(--low-color)'
  };
  
  return (
    <span 
      className={`inline-block rounded-full ${className}`}
      style={{ 
        width: '8px', 
        height: '8px', 
        backgroundColor: colors[norm] || colors.low,
        boxShadow: norm === 'critical' ? '0 0 8px rgba(255, 51, 102, 0.8)' : 'none'
      }}
    />
  );
};
