'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n/context';

interface MacroBarProps {
  label: string;
  consumed: number;
  target: number;
  type: 'protein' | 'carbs' | 'fat';
}

export const MacroBar: React.FC<MacroBarProps> = ({ label, consumed, target, type }) => {
  const { t } = useTranslation();
  
  // Calculate percentage, capped at 100%
  const percentage = target > 0 ? Math.min(100, Math.round((consumed / target) * 100)) : 0;
  
  // Map types to CSS classes
  const progressClass = {
    protein: 'macro-progress-protein',
    carbs: 'macro-progress-carbs',
    fat: 'macro-progress-fat'
  }[type];

  const colorStyle = {
    protein: '#7c4dff',
    carbs: '#00e676',
    fat: '#ff9100'
  }[type];

  return (
    <div className="macro-box">
      <span className="macro-title">{label}</span>
      <span className="macro-value" style={{ color: colorStyle }}>
        {consumed} <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>/ {target}{t('unitGrams')}</span>
      </span>
      
      <div className="macro-progress-bg">
        <div 
          className={`macro-progress-bar ${progressClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
