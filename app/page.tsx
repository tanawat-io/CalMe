'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/context';
import { useAuth } from '@/lib/auth/context';
import { LanguageToggle } from '@/components/LanguageToggle';

export default function LandingPage() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (user && !loading) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--background)' }}>
        <div style={{ border: '4px solid rgba(255,255,255,0.05)', borderTop: '4px solid var(--accent-purple)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }} />
        <style jsx global>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--background)', position: 'relative', overflow: 'hidden' }}>
      
      {/* Decorative Blur Spots */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '50%', height: '50%', background: 'radial-gradient(circle, rgba(124, 77, 255, 0.15) 0%, transparent 60%)', filter: 'blur(40px)', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '50%', height: '50%', background: 'radial-gradient(circle, rgba(0, 230, 118, 0.1) 0%, transparent 60%)', filter: 'blur(40px)', zIndex: 0 }} />

      {/* Floating Emojis Background */}
      <div style={{ position: 'absolute', top: '15%', left: '8%', fontSize: '32px', opacity: 0.15, transform: 'rotate(-15deg)', zIndex: 0 }}>🥑</div>
      <div style={{ position: 'absolute', top: '25%', right: '12%', fontSize: '28px', opacity: 0.12, transform: 'rotate(20deg)', zIndex: 0 }}>🍎</div>
      <div style={{ position: 'absolute', bottom: '20%', left: '15%', fontSize: '36px', opacity: 0.15, transform: 'rotate(10deg)', zIndex: 0 }}>🥩</div>
      <div style={{ position: 'absolute', bottom: '35%', right: '8%', fontSize: '30px', opacity: 0.1, transform: 'rotate(-25deg)', zIndex: 0 }}>🍱</div>
      <div style={{ position: 'absolute', top: '55%', left: '5%', fontSize: '24px', opacity: 0.08, transform: 'rotate(45deg)', zIndex: 0 }}>🍳</div>

      {/* Header / Language selection */}
      <header style={{ width: '100%', maxWidth: '1000px', margin: '0 auto', padding: '24px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '28px' }}>🥑</span>
          <span className="text-gradient" style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '24px', letterSpacing: '-0.5px' }}>
            {t('appName')}
          </span>
        </div>
        <LanguageToggle />
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: '480px', margin: '0 auto', padding: '0 20px 60px 20px', zIndex: 10, position: 'relative' }}>
        
        {/* Hero Card */}
        <div className="card animate-slide-in" style={{ width: '100%', textAlign: 'center', padding: '40px 24px', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '24px' }}>
          <div className="pulse-glow" style={{ fontSize: '64px', marginBottom: '20px' }}>🥑</div>
          
          <h1 style={{ fontSize: '42px', lineHeight: 1.1, marginBottom: '12px' }}>
            <span className="text-gradient">{t('appName')}</span>
          </h1>
          
          <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '32px' }}>
            {t('appTagline')}
          </p>

          {/* LINE Login Button */}
          <a
            href="/api/auth/line/login"
            className="btn btn-primary btn-full"
            style={{ 
              background: 'linear-gradient(135deg, #00c853 0%, #00e676 100%)',
              boxShadow: '0 4px 15px rgba(0, 230, 118, 0.3)',
              color: '#ffffff',
              fontSize: '18px',
              padding: '14px 28px',
              borderRadius: '14px',
              gap: '12px'
            }}
          >
            {/* LINE Icon SVG */}
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M22 10.366c0-4.577-4.488-8.302-10-8.302S2 5.789 2 10.366c0 4.1 3.56 7.542 8.362 8.194.325.07.767.214.88.55.1.3-.066.77-.14 1.074l-.426 1.834c-.053.22-.254.862.11.862.33 0 1.547-1.077 2.148-1.74l1.24-1.424c.058-.067.12-.132.176-.197h.004c4.32-.23 7.646-3.603 7.646-7.973zM7.222 13.064c-.002.328-.27.593-.598.591H4.257c-.33 0-.598-.268-.598-.598V7.598c0-.33.268-.598.598-.598h.43c.33 0 .598.268.598.598V12h1.34c.33 0 .598.268.598.598v.468zm2.632-.598c0 .33-.268.598-.598.598H8.826c-.33 0-.598-.268-.598-.598V7.598c0-.33.268-.598.598-.598h.43c.33 0 .598.268.598.598v4.87h-.002zm3.326.598c.002.328-.266.595-.595.597h-.433c-.225.002-.435-.125-.536-.328L10.97 9.878v2.588c0 .33-.268.598-.598.598h-.43c-.33 0-.598-.268-.598-.598V7.598c0-.33.268-.598.598-.598h.43c.224 0 .43.125.532.324l1.657 3.447V7.598c0-.33.268-.598.598-.598h.43c.33 0 .598.268.598.598v5.468zm3.626-3.79a.596.596 0 0 1-.596.597h-1.34v1.076h1.34c.33 0 .598.268.598.598v.468c0 .33-.268.598-.598.598h-2.368a.598.598 0 0 1-.598-.598V7.598c0-.33.268-.598.598-.598h2.368c.33 0 .598.268.598.598v.468c0 .33-.268.598-.598.598h-1.34V9.28h1.34c.328.002.593.27.591.598v.398z" />
            </svg>
            <span>{t('loginWithLine')}</span>
          </a>
        </div>

        {/* QR Code and LINE Bot details */}
        <div className="card animate-slide-in" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', animationDelay: '0.1s', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '16px', color: 'var(--text-primary)' }}>
            {t('lineBotQr')}
          </h3>
          
          {/* Real LINE QR Code */}
          <a 
            href="https://line.me/R/ti/p/@258bafon" 
            target="_blank" 
            rel="noopener noreferrer"
            className="card-interactive"
            style={{ 
              background: '#ffffff', 
              padding: '16px', 
              borderRadius: '16px', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              position: 'relative',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
              transition: 'transform 0.2s ease'
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="https://qr-official.line.me/sid/L/258bafon.png" 
              alt="LINE Bot QR Code" 
              style={{ width: '150px', height: '150px', objectFit: 'contain' }} 
            />
          </a>
          
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '12px' }}>
            LINE ID: @258bafon
          </span>
        </div>

        {/* Product features list */}
        <div style={{ width: '100%', marginTop: '20px' }}>
          <h2 style={{ fontSize: '20px', textAlign: 'center', marginBottom: '24px' }}>
            {t('featuresTitle')}
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="card" style={{ display: 'flex', gap: '16px', padding: '16px' }}>
              <div style={{ fontSize: '28px' }}>📸</div>
              <div>
                <h4 style={{ margin: 0, fontSize: '16px' }}>{t('feature1Title')}</h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  {t('feature1Desc')}
                </p>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', gap: '16px', padding: '16px' }}>
              <div style={{ fontSize: '28px' }}>🎯</div>
              <div>
                <h4 style={{ margin: 0, fontSize: '16px' }}>{t('feature2Title')}</h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  {t('feature2Desc')}
                </p>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', gap: '16px', padding: '16px' }}>
              <div style={{ fontSize: '28px' }}>📈</div>
              <div>
                <h4 style={{ margin: 0, fontSize: '16px' }}>{t('feature3Title')}</h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  {t('feature3Desc')}
                </p>
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '24px 20px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', zIndex: 10, position: 'relative' }}>
        &copy; {new Date().getFullYear()} CalMe App. All rights reserved.
      </footer>

    </div>
  );
}
