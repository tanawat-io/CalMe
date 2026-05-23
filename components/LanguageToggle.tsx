'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n/context';

export const LanguageToggle: React.FC = () => {
  const { locale, setLocale } = useTranslation();

  return (
    <div className="language-selector">
      <button
        onClick={() => setLocale('th')}
        className={`language-btn ${locale === 'th' ? 'language-btn-active' : ''}`}
      >
        TH
      </button>
      <button
        onClick={() => setLocale('en')}
        className={`language-btn ${locale === 'en' ? 'language-btn-active' : ''}`}
      >
        EN
      </button>
    </div>
  );
};
