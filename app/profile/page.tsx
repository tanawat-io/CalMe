'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { useTranslation } from '@/lib/i18n/context';
import { Navbar } from '@/components/Navbar';
import { LanguageToggle } from '@/components/LanguageToggle';
import { WeightChart } from '@/components/WeightChart';
import { ProgramCard } from '@/components/ProgramCard';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const { t, locale } = useTranslation();
  const router = useRouter();

  // Profile Form State
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [activityLevel, setActivityLevel] = useState<
    'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
  >('moderate');
  const [program, setProgram] = useState<'lose_weight' | 'gain_weight' | 'build_muscle'>('build_muscle');

  // Page UX States
  const [profile, setProfile] = useState<any>(null);
  const [weightLogs, setWeightLogs] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Firebase auth redirection
  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Fetch initial profile & weight logs
  const fetchData = async () => {
    if (!user) return;
    setFetching(true);
    setError('');
    try {
      const token = await user.getIdToken();

      // Fetch user profile
      const userRes = await fetch('/api/user', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (userRes.ok) {
        const data = await userRes.json();
        setProfile(data);
        // Pre-fill form values
        setWeight(data.weight?.toString() || '');
        setHeight(data.height?.toString() || '');
        setAge(data.age?.toString() || '');
        setGender(data.gender || 'male');
        setActivityLevel(data.activityLevel || 'moderate');
        setProgram(data.program || 'build_muscle');
      } else if (userRes.status === 404) {
        // Fallback defaults for new users
        setWeight('70');
        setHeight('170');
        setAge('25');
        setGender('male');
        setActivityLevel('moderate');
        setProgram('build_muscle');
      } else {
        throw new Error('Failed to load user profile');
      }

      // Fetch weight logs
      const weightLogsRes = await fetch('/api/weight-log', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (weightLogsRes.ok) {
        const logsData = await weightLogsRes.json();
        setWeightLogs(logsData);
      }
    } catch (err: any) {
      console.error(err);
      setError(locale === 'th' ? 'เกิดข้อผิดพลาดในการดึงข้อมูล' : 'Error loading data');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (user && !loading) {
      fetchData();
    }
  }, [user, loading]);

  // Handle Profile Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setMessage('');
    setError('');

    // Form validation
    if (!weight || !height || !age) {
      setError(locale === 'th' ? 'กรุณากรอกข้อมูลให้ครบถ้วน' : 'Please fill in all fields');
      setSaving(false);
      return;
    }

    try {
      const token = await user.getIdToken();
      const payload = {
        weight: parseFloat(weight),
        height: parseFloat(height),
        age: parseInt(age),
        gender,
        activityLevel,
        program,
        language: locale,
        displayName: user.displayName || 'User',
        pictureUrl: user.photoURL || '',
      };

      const res = await fetch('/api/user', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Failed to update profile');
      }

      const updatedProfile = await res.json();
      setProfile(updatedProfile);
      setMessage(t('profileSaved'));

      // Re-fetch weight logs as updating weight inserts a new log
      const weightLogsRes = await fetch('/api/weight-log', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (weightLogsRes.ok) {
        const logsData = await weightLogsRes.json();
        setWeightLogs(logsData);
      }
    } catch (err: any) {
      console.error(err);
      setError(locale === 'th' ? 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' : 'Error saving profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading || fetching || !user) {
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
    <div className="app-container">
      <Navbar />

      {/* Decorative Blur Spots */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '50%', height: '50%', background: 'radial-gradient(circle, rgba(124, 77, 255, 0.08) 0%, transparent 60%)', filter: 'blur(40px)', zIndex: -1 }} />
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '50%', height: '50%', background: 'radial-gradient(circle, rgba(0, 230, 118, 0.05) 0%, transparent 60%)', filter: 'blur(40px)', zIndex: -1 }} />

      <header className="page-header">
        <h1 className="page-title text-gradient">{t('profile')}</h1>
        <LanguageToggle />
      </header>

      {error && (
        <div className="card" style={{ borderLeft: '4px solid var(--accent-pink)', color: 'var(--accent-pink)', padding: '12px 16px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {message && (
        <div className="card" style={{ borderLeft: '4px solid var(--accent-green)', padding: '16px 20px', marginBottom: '20px' }}>
          <h4 style={{ color: 'var(--accent-green)', margin: '0 0 8px 0', fontSize: '15px', fontWeight: 'bold' }}>{message}</h4>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
            {locale === 'th' 
              ? '🎯 คำนวณเป้าหมายและแคลอรี่สำเร็จแล้ว! ขั้นตอนถัดไป: คุณสามารถคลิกเมนู แดชบอร์ด เพื่อดูความคืบหน้า หรือเริ่มถ่ายรูปอาหารส่งในแชต LINE Bot เพื่อบันทึกโภชนาการได้ทันทีครับ'
              : '🎯 Goal and target calories configured successfully! Next steps: You can click the Dashboard menu to track progress, or start sending food photos to the LINE Bot to log nutrition instantly.'
            }
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', width: '100%' }}>
        {/* Desktop Responsive Columns Grid */}
        <style jsx global>{`
          @media (min-width: 769px) {
            .profile-grid-layout {
              display: grid;
              grid-template-columns: 1.2fr 1fr;
              gap: 24px;
              align-items: start;
            }
          }
        `}</style>

        <div className="profile-grid-layout" style={{ width: '100%' }}>
          {/* Column 1: Config Form */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '20px' }}>{locale === 'th' ? 'การตั้งค่าเป้าหมายและร่างกาย' : 'Body & Goal Settings'}</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">{t('weightLabel')} ({t('unitKg')})</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-input"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="e.g. 70"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('heightLabel')} ({t('unitCm')})</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-input"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="e.g. 175"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">{t('ageLabel')} ({t('unitYears')})</label>
                  <input
                    type="number"
                    step="1"
                    className="form-input"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="e.g. 25"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('genderLabel')}</label>
                  <select
                    className="form-select"
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                  >
                    <option value="male">{t('genderMale')}</option>
                    <option value="female">{t('genderFemale')}</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t('activityLabel')}</label>
                <select
                  className="form-select"
                  value={activityLevel}
                  onChange={(e) => setActivityLevel(e.target.value as any)}
                >
                  <option value="sedentary">{t('activitySedentary')}</option>
                  <option value="light">{t('activityLight')}</option>
                  <option value="moderate">{t('activityModerate')}</option>
                  <option value="active">{t('activityActive')}</option>
                  <option value="very_active">{t('activityVeryActive')}</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">{t('programLabel')}</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <ProgramCard
                    title={t('programLose')}
                    description={locale === 'th' ? 'ลดน้ำหนักอย่างมีสุขภาพดี รักษาและสร้างความชัดเจนของกล้ามเนื้อ' : 'Healthy weight loss, preservation & definition of muscle'}
                    icon="🔥"
                    active={program === 'lose_weight'}
                    onClick={() => setProgram('lose_weight')}
                  />
                  <ProgramCard
                    title={t('programMuscle')}
                    description={locale === 'th' ? 'สร้างกล้ามเนื้อแบบลีน พัฒนาความแข็งแรงและโครงสร้างร่างกาย' : 'Lean muscle building, strength development & core progression'}
                    icon="💪"
                    active={program === 'build_muscle'}
                    onClick={() => setProgram('build_muscle')}
                  />
                  <ProgramCard
                    title={t('programGain')}
                    description={locale === 'th' ? 'เพิ่มมวลกล้ามเนื้อและน้ำหนักตัว เหมาะสำหรับผู้ต้องการเพิ่มขนาดตัว' : 'Bulk mass and body weight increase, ideal for sizing up'}
                    icon="📈"
                    active={program === 'gain_weight'}
                    onClick={() => setProgram('gain_weight')}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={saving}
                style={{ gap: '10px' }}
              >
                {saving ? (
                  <>
                    <div style={{ border: '2px solid rgba(255,255,255,0.2)', borderTop: '2px solid white', borderRadius: '50%', width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                    <span>{t('recalculatingTdee')}</span>
                  </>
                ) : (
                  <span>{t('saveProfile')}</span>
                )}
              </button>
            </form>
          </div>

          {/* Column 2: Targets and Weight logs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Target Display Card */}
            {profile && (
              <div className="card" style={{ padding: '24px', border: '1px solid rgba(124, 77, 255, 0.2)' }}>
                <h3 style={{ marginBottom: '16px' }}>{locale === 'th' ? 'เป้าหมายโภชนาการประจำวัน' : 'Your Daily Target Nutrition'}</h3>
                
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {t('calories')}
                  </div>
                  <div className="text-gradient" style={{ fontSize: '48px', fontWeight: 800, fontFamily: 'var(--font-heading)', margin: '4px 0' }}>
                    {profile.targetCalories || 0}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                    kcal / {locale === 'th' ? 'วัน' : 'day'}
                  </div>
                </div>

                <div className="macro-container" style={{ marginTop: '0' }}>
                  <div className="macro-box">
                    <span className="macro-title" style={{ color: '#7c4dff' }}>{t('protein')}</span>
                    <span className="macro-value">{profile.targetProtein || 0}<span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}> {t('unitGrams')}</span></span>
                  </div>
                  <div className="macro-box">
                    <span className="macro-title" style={{ color: '#00e676' }}>{t('carbs')}</span>
                    <span className="macro-value">{profile.targetCarbs || 0}<span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}> {t('unitGrams')}</span></span>
                  </div>
                  <div className="macro-box">
                    <span className="macro-title" style={{ color: '#ff9100' }}>{t('fat')}</span>
                    <span className="macro-value">{profile.targetFat || 0}<span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}> {t('unitGrams')}</span></span>
                  </div>
                </div>
              </div>
            )}

            {/* Weight Tracker Card */}
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ marginBottom: '16px' }}>{t('weightTitle')}</h3>
              
              {/* Weight Trend Chart */}
              <div style={{ marginBottom: '20px', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', padding: '10px' }}>
                <WeightChart data={weightLogs} />
              </div>

              {/* Weight logs history table */}
              <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                {locale === 'th' ? 'ประวัติการบันทึกน้ำหนักล่าสุด' : 'Recent Weight History'}
              </h4>
              
              {weightLogs.length === 0 ? (
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>
                  {locale === 'th' ? 'ยังไม่มีข้อมูลน้ำหนัก บันทึกข้อมูลส่วนตัวเพื่อเริ่มประวัติ' : 'No logs recorded. Update your profile weight to start history.'}
                </p>
              ) : (
                <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  {weightLogs.slice().reverse().map((log) => (
                    <div
                      key={log.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 14px',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        fontSize: '13px',
                      }}
                    >
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {new Date(log.date).toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <span style={{ fontWeight: 600, color: 'var(--accent-green)' }}>
                        {log.weight} {t('unitKg')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
