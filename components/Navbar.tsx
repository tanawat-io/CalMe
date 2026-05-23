'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/context';
import { useAuth } from '@/lib/auth/context';
import { LanguageToggle } from './LanguageToggle';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  if (!user) return null; // Only show navbar when user is authenticated

  const navItems = [
    {
      href: '/dashboard',
      label: t('dashboard'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="7" height="9" rx="1.5" />
          <rect x="14" y="3" width="7" height="5" rx="1.5" />
          <rect x="14" y="12" width="7" height="9" rx="1.5" />
          <rect x="3" y="16" width="7" height="5" rx="1.5" />
        </svg>
      ),
    },
    {
      href: '/history',
      label: t('history'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M16 2V6" strokeLinecap="round" />
          <path d="M8 2V6" strokeLinecap="round" />
          <path d="M3 10H21" />
        </svg>
      ),
    },
    {
      href: '/profile',
      label: t('profile'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 21C20 16.5817 16.4183 13 12 13C7.58172 13 4 16.5817 4 21" strokeLinecap="round" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <nav className="navbar-mobile">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`navbar-item ${isActive ? 'navbar-item-active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Desktop Sidebar Navigation */}
      <nav className="navbar-desktop">
        <div className="navbar-desktop-brand">
          <span style={{ fontSize: '28px' }}>🥑</span>
          <span className="text-gradient">{t('appName')}</span>
        </div>

        <div className="navbar-desktop-menu">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`navbar-desktop-item ${isActive ? 'navbar-desktop-item-active' : ''}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <LanguageToggle />
          </div>
          
          <button onClick={logout} className="btn btn-secondary btn-full" style={{ gap: '10px' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px' }}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>{t('logout')}</span>
          </button>
        </div>
      </nav>
    </>
  );
};
