'use client';

import React from 'react';

interface ProgramCardProps {
  title: string;
  description: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}

export const ProgramCard: React.FC<ProgramCardProps> = ({ title, description, icon, active, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`card card-interactive program-card ${active ? 'program-card-active' : ''}`}
      style={{ padding: '16px', margin: 0 }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
        <span style={{ fontSize: '32px' }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: 0, fontSize: '16px', color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            {title}
          </h4>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            {description}
          </p>
        </div>
      </div>
    </div>
  );
};
export default ProgramCard;
