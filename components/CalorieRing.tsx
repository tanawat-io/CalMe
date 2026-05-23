'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n/context';

interface CalorieRingProps {
  consumed: number;
  target: number;
}

export const CalorieRing: React.FC<CalorieRingProps> = ({ consumed, target }) => {
  const { t } = useTranslation();
  const [offset, setOffset] = useState<number>(502.6); // Start empty for animation

  const radius = 80;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius; // ~502.65
  const percentage = target > 0 ? Math.min(100, Math.round((consumed / target) * 100)) : 0;
  const remaining = Math.max(0, target - consumed);

  useEffect(() => {
    // Animating the offset when percentage changes
    const progressOffset = circumference - (percentage / 100) * circumference;
    // Tiny delay to trigger CSS transition smoothly
    const timer = setTimeout(() => {
      setOffset(progressOffset);
    }, 100);
    return () => clearTimeout(timer);
  }, [percentage, circumference]);

  return (
    <div className="progress-ring-container pulse-glow">
      <svg width="200" height="200" viewBox="0 0 200 200">
        <defs>
          {/* Main gradient for progress ring */}
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7c4dff" />
            <stop offset="100%" stopColor="#00e676" />
          </linearGradient>
          {/* Overbudget gradient */}
          <linearGradient id="overbudgetGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff4081" />
            <stop offset="100%" stopColor="#ff9100" />
          </linearGradient>
          {/* Glow filter for premium aesthetic */}
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Background track circle */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="transparent"
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth={strokeWidth}
        />

        {/* Animated active progress circle */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="transparent"
          stroke={`url(${percentage >= 100 ? '#overbudgetGradient' : '#ringGradient'})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 100 100)"
          style={{
            transition: 'stroke-dashoffset 0.85s cubic-bezier(0.4, 0, 0.2, 1)',
            filter: percentage >= 100 ? 'drop-shadow(0 0 4px #ff4081)' : 'drop-shadow(0 0 4px #00e676)',
          }}
        />
      </svg>

      {/* Centered Values */}
      <div className="progress-ring-value">
        <span className="progress-ring-number">{consumed}</span>
        <span className="progress-ring-unit">/ {target} {t('unitCalories')}</span>
        <span style={{ fontSize: '10px', color: '#607090', marginTop: '6px' }}>
          {percentage >= 100 
            ? `${t('target')} 100%` 
            : `${t('remaining')} ${remaining} ${t('unitCalories')}`}
        </span>
      </div>
    </div>
  );
};
