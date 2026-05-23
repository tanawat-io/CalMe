'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import { useTranslation } from '@/lib/i18n/context';
import { Navbar } from '@/components/Navbar';
import { FoodCard, FoodLogItem } from '@/components/FoodCard';
import { WeeklyChart } from '@/components/WeeklyChart';
import { WeightChart } from '@/components/WeightChart';

interface FoodFormState {
  foodNameTh: string;
  foodName: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  portionSize: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

const initialFormState: FoodFormState = {
  foodNameTh: '',
  foodName: '',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  portionSize: '1 portion',
  mealType: 'snack',
};

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { t, locale } = useTranslation();
  const router = useRouter();

  // Dashboard Data State
  const [profile, setProfile] = useState<any>(null);
  const [profileError, setProfileError] = useState<boolean>(false);
  const [profileLoading, setProfileLoading] = useState<boolean>(true);

  const [foodLogs, setFoodLogs] = useState<FoodLogItem[]>([]);
  const [foodLogsLoading, setFoodLogsLoading] = useState<boolean>(true);

  const [weightLogs, setWeightLogs] = useState<any[]>([]);
  const [weightLogsLoading, setWeightLogsLoading] = useState<boolean>(true);

  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);

  // Forms & Modal State
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<FoodLogItem | null>(null);
  const [foodForm, setFoodForm] = useState<FoodFormState>(initialFormState);
  const [isFoodSubmitting, setIsFoodSubmitting] = useState<boolean>(false);

  const [weightInput, setWeightInput] = useState<string>('');
  const [isWeightSubmitting, setIsWeightSubmitting] = useState<boolean>(false);

  // Fetch all dashboard data
  const fetchAllData = async () => {
    if (!user) return;

    try {
      const token = await user.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Fetch Profile
      const profileRes = await fetch('/api/user', { headers });
      if (profileRes.status === 404) {
        setProfileError(true);
        setProfile(null);
        setProfileLoading(false);
      } else if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData);
        setProfileError(false);
        setProfileLoading(false);
      } else {
        console.error('Error fetching user profile:', profileRes.statusText);
        setProfileLoading(false);
      }

      // 2. Fetch Today's Food Logs (Bangkok time UTC+7)
      const todayStr = new Date(Date.now() + 7 * 3600000).toISOString().split('T')[0];
      const foodLogsRes = await fetch(`/api/food-log?date=${todayStr}`, { headers });
      if (foodLogsRes.ok) {
        const foodLogsData = await foodLogsRes.json();
        setFoodLogs(foodLogsData);
      }
      setFoodLogsLoading(false);

      // 3. Fetch Weight Logs
      const weightRes = await fetch('/api/weight-log', { headers });
      if (weightRes.ok) {
        const weightData = await weightRes.json();
        setWeightLogs(weightData);
      }
      setWeightLogsLoading(false);

      // 4. Fetch Stats
      const statsRes = await fetch('/api/stats', { headers });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      setStatsLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setProfileLoading(false);
      setFoodLogsLoading(false);
      setWeightLogsLoading(false);
      setStatsLoading(false);
    }
  };

  // Redirect to landing if not logged in
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/');
      } else {
        fetchAllData();
      }
    }
  }, [user, authLoading]);

  // Calculations for today's food logs
  let consumedCalories = 0;
  let consumedProtein = 0;
  let consumedCarbs = 0;
  let consumedFat = 0;

  foodLogs.forEach((log) => {
    // Only sum confirmed entries
    if (log.confirmed) {
      consumedCalories += log.calories || 0;
      consumedProtein += log.protein || 0;
      consumedCarbs += log.carbs || 0;
      consumedFat += log.fat || 0;
    }
  });

  const targetCalories = profile?.targetCalories || 2000;
  const targetProtein = profile?.targetProtein || 150;
  const targetCarbs = profile?.targetCarbs || 200;
  const targetFat = profile?.targetFat || 65;

  // Handle food confirm (PUT /api/food-log)
  const handleConfirmFood = async (id: string) => {
    try {
      const token = await user!.getIdToken();
      const response = await fetch('/api/food-log', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, confirmed: true }),
      });
      if (response.ok) {
        await fetchAllData();
      }
    } catch (error) {
      console.error('Error confirming food:', error);
    }
  };

  // Handle food delete (DELETE /api/food-log?id=...)
  const handleDeleteFood = async (id: string) => {
    const confirmMessage =
      locale === 'th'
        ? 'คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?'
        : 'Are you sure you want to delete this item?';
    if (!window.confirm(confirmMessage)) return;

    try {
      const token = await user!.getIdToken();
      const response = await fetch(`/api/food-log?id=${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        await fetchAllData();
      }
    } catch (error) {
      console.error('Error deleting food:', error);
    }
  };

  // Open modal in edit mode
  const handleEditFood = (item: FoodLogItem) => {
    setEditingItem(item);
    setFoodForm({
      foodNameTh: item.foodNameTh || '',
      foodName: item.foodName || '',
      calories: item.calories?.toString() || '',
      protein: item.protein?.toString() || '0',
      carbs: item.carbs?.toString() || '0',
      fat: item.fat?.toString() || '0',
      portionSize: item.portionSize || '1 portion',
      mealType: item.mealType || 'snack',
    });
    setModalOpen(true);
  };

  // Open modal in add mode
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFoodForm(initialFormState);
    setModalOpen(true);
  };

  // Submit manual food add or edit
  const handleFoodFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodForm.foodNameTh || !foodForm.calories) {
      alert(
        locale === 'th' ? 'กรุณากรอกชื่ออาหารและแคลอรี่' : 'Please enter food name and calories'
      );
      return;
    }

    setIsFoodSubmitting(true);
    try {
      const token = await user!.getIdToken();
      const isEdit = !!editingItem;
      const url = '/api/food-log';
      const method = isEdit ? 'PUT' : 'POST';

      const payload = isEdit
        ? {
            id: editingItem.id,
            foodNameTh: foodForm.foodNameTh,
            foodName: foodForm.foodName || foodForm.foodNameTh,
            calories: parseInt(foodForm.calories),
            protein: parseInt(foodForm.protein) || 0,
            carbs: parseInt(foodForm.carbs) || 0,
            fat: parseInt(foodForm.fat) || 0,
            portionSize: foodForm.portionSize,
            mealType: foodForm.mealType,
          }
        : {
            foodNameTh: foodForm.foodNameTh,
            foodName: foodForm.foodName || foodForm.foodNameTh,
            calories: parseInt(foodForm.calories),
            protein: parseInt(foodForm.protein) || 0,
            carbs: parseInt(foodForm.carbs) || 0,
            fat: parseInt(foodForm.fat) || 0,
            portionSize: foodForm.portionSize,
            mealType: foodForm.mealType,
            date: new Date(Date.now() + 7 * 3600000).toISOString().split('T')[0],
          };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setModalOpen(false);
        setEditingItem(null);
        setFoodForm(initialFormState);
        await fetchAllData();
      } else {
        const err = await response.json();
        alert(err.error || 'Something went wrong');
      }
    } catch (error) {
      console.error('Error submitting food form:', error);
    } finally {
      setIsFoodSubmitting(false);
    }
  };

  // Submit weight entry
  const handleWeightSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weightInput || isNaN(parseFloat(weightInput))) return;

    setIsWeightSubmitting(true);
    try {
      const token = await user!.getIdToken();
      const response = await fetch('/api/weight-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          weight: parseFloat(weightInput),
          date: new Date(Date.now() + 7 * 3600000).toISOString().split('T')[0],
        }),
      });
      if (response.ok) {
        setWeightInput('');
        await fetchAllData();
      }
    } catch (error) {
      console.error('Error logging weight:', error);
    } finally {
      setIsWeightSubmitting(false);
    }
  };

  // Main Loading states
  if (authLoading || (user && profileLoading)) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'var(--background)',
        }}
      >
        <div
          style={{
            border: '4px solid rgba(255,255,255,0.05)',
            borderTop: '4px solid var(--accent-purple)',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            animation: 'spin 1s linear infinite',
          }}
        />
        <style jsx global>{`
          @keyframes spin {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  // Not logged in (router will redirect)
  if (!user) return null;

  return (
    <>
      <Navbar />
      <div className="app-container">
        {/* Page Header */}
        <div
          className="page-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            paddingTop: '12px',
          }}
        >
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>
              {t('dashboard')}
            </h1>
            {profile && (
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
                {locale === 'th' ? `สวัสดี, ${profile.displayName}` : `Hello, ${profile.displayName}`}
              </p>
            )}
          </div>

          {profile?.pictureUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={profile.pictureUrl}
              alt={profile.displayName}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                border: '2px solid var(--accent-purple)',
                boxShadow: 'var(--shadow-glow-purple)',
              }}
            />
          )}
        </div>

        {/* Profile incomplete view (404) */}
        {profileError ? (
          <div
            className="card animate-slide-in"
            style={{ textAlign: 'center', padding: '40px 24px', margin: '20px 0' }}
          >
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎯</div>
            <h2 style={{ fontSize: '24px', marginBottom: '12px' }}>
              {locale === 'th' ? 'ยินดีต้อนรับสู่ CalMe!' : 'Welcome to CalMe!'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '28px' }}>
              {locale === 'th'
                ? 'กรุณากรอกข้อมูลส่วนตัวเพื่อเปิดใช้งานแดชบอร์ด เพื่อให้ระบบคำนวณเป้าหมายแคลอรี่และสารอาหารที่เหมาะสมกับคุณ'
                : 'Please set up your profile details first to unlock your personalized calorie and macro tracking dashboard.'}
            </p>
            <Link href="/profile" className="btn btn-primary btn-full">
              🚀 {locale === 'th' ? 'ไปที่หน้าตั้งค่าข้อมูลส่วนตัว' : 'Go to Profile Setup'}
            </Link>
          </div>
        ) : (
          /* Profile loaded: Main Dashboard Grid */
          <div className="animate-slide-in">
            {/* Daily Summary — LINE Flex bubble style */}
            <div className="card" style={{ padding: 0, marginBottom: '24px' }}>
              {/* Card header strip */}
              <div className="card-header">
                <p className="card-header-title">🔥 {locale === 'th' ? 'สรุปแคลอรี่วันนี้' : "Today's Calorie Summary"}</p>
              </div>
              {/* Card body */}
              <div className="card-body">
                {/* Large calorie display */}
                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '44px',
                      fontWeight: 800,
                      color: consumedCalories > targetCalories ? '#ff4081' : '#00e676',
                      lineHeight: 1.1,
                    }}
                  >
                    {consumedCalories}
                  </span>
                  <span style={{ fontSize: '18px', color: '#90a0c0', fontWeight: 500 }}>
                    {' '}/ {targetCalories} kcal
                  </span>
                </div>

                {/* Progress bar */}
                <div className="calorie-progress-wrap">
                  <div
                    className={`calorie-progress-bar${consumedCalories > targetCalories ? ' calorie-progress-bar-over' : ''}`}
                    style={{ width: `${Math.min((consumedCalories / targetCalories) * 100, 100)}%` }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#90a0c0', marginBottom: '4px' }}>
                  <span>{locale === 'th' ? 'บริโภคแล้ว' : 'Consumed'}</span>
                  <span>
                    {consumedCalories > targetCalories
                      ? `+${consumedCalories - targetCalories} ${locale === 'th' ? 'เกิน' : 'over'}`
                      : `${targetCalories - consumedCalories} ${locale === 'th' ? 'เหลือ' : 'remaining'}`}
                  </span>
                </div>

                {/* Macro grid: protein / carbs / fat */}
                <div className="macro-grid">
                  <div className="macro-grid-box macro-grid-box-protein">
                    <span className="macro-grid-label">{locale === 'th' ? 'โปรตีน' : 'Protein'}</span>
                    <span className="macro-grid-value macro-grid-value-protein">
                      {Math.round(consumedProtein)}<span style={{ fontSize: '12px', fontWeight: 500 }}>g</span>
                    </span>
                    <span style={{ fontSize: '11px', color: '#90a0c0' }}>/{targetProtein}g</span>
                  </div>
                  <div className="macro-grid-box macro-grid-box-carbs">
                    <span className="macro-grid-label">{locale === 'th' ? 'คาร์บ' : 'Carbs'}</span>
                    <span className="macro-grid-value macro-grid-value-carbs">
                      {Math.round(consumedCarbs)}<span style={{ fontSize: '12px', fontWeight: 500 }}>g</span>
                    </span>
                    <span style={{ fontSize: '11px', color: '#90a0c0' }}>/{targetCarbs}g</span>
                  </div>
                  <div className="macro-grid-box macro-grid-box-fat">
                    <span className="macro-grid-label">{locale === 'th' ? 'ไขมัน' : 'Fat'}</span>
                    <span className="macro-grid-value macro-grid-value-fat">
                      {Math.round(consumedFat)}<span style={{ fontSize: '12px', fontWeight: 500 }}>g</span>
                    </span>
                    <span style={{ fontSize: '11px', color: '#90a0c0' }}>/{targetFat}g</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Streak & Status — LINE-style stat cards */}
            <div className="stats-grid">
              {/* Streak Card */}
              <div className="card" style={{ padding: 0, marginBottom: 0 }}>
                <div className="card-header" style={{ borderRadius: '16px 16px 0 0' }}>
                  <p className="card-header-title" style={{ color: '#ff9100', fontSize: '13px' }}>
                    🔥 {locale === 'th' ? 'สถิติต่อเนื่อง' : 'Streak'}
                  </p>
                </div>
                <div className="card-body" style={{ textAlign: 'center', paddingTop: '20px', paddingBottom: '20px' }}>
                  <div style={{ fontSize: '36px', fontWeight: 800, color: '#ff9100', fontFamily: 'var(--font-heading)' }}>
                    {stats?.streak || 0}
                  </div>
                  <div style={{ fontSize: '13px', color: '#90a0c0', marginTop: '4px' }}>
                    {locale === 'th' ? 'วัน' : 'Days'}
                  </div>
                </div>
              </div>

              {/* Goal Status Card */}
              <div className="card" style={{ padding: 0, marginBottom: 0 }}>
                <div className="card-header" style={{ borderRadius: '16px 16px 0 0' }}>
                  <p
                    className="card-header-title"
                    style={{ color: consumedCalories > targetCalories ? '#ff4081' : '#00e676', fontSize: '13px' }}
                  >
                    🎯 {locale === 'th' ? 'สถานะเป้าหมาย' : 'Goal Status'}
                  </p>
                </div>
                <div className="card-body" style={{ textAlign: 'center', paddingTop: '20px', paddingBottom: '20px' }}>
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: 800,
                      color: consumedCalories > targetCalories ? '#ff4081' : '#00e676',
                      fontFamily: 'var(--font-heading)',
                    }}
                  >
                    {consumedCalories > targetCalories
                      ? locale === 'th' ? 'เกินเป้าหมาย' : 'Over Target'
                      : locale === 'th' ? 'อยู่ในเกณฑ์ดี' : 'On Track'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#90a0c0', marginTop: '4px' }}>
                    {consumedCalories > targetCalories
                      ? `+${consumedCalories - targetCalories} kcal`
                      : `${targetCalories - consumedCalories} ${locale === 'th' ? 'แคลอรี่เหลือ' : 'kcal left'}`}
                  </div>
                </div>
              </div>
            </div>

            {/* Food Logs Section */}
            <div style={{ marginBottom: '32px', marginTop: '24px' }}>
              {/* LINE-style header card for food logs section */}
              <div className="card" style={{ padding: 0, marginBottom: '16px' }}>
                <div
                  className="card-header"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderRadius: '16px',
                  }}
                >
                  <p className="card-header-title" style={{ color: '#00b0ff' }}>🍽️ {t('recentLogs')}</p>
                  <button
                    onClick={handleOpenAddModal}
                    style={{
                      background: '#7c4dff',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#ffffff',
                      padding: '6px 14px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-heading)',
                    }}
                  >
                    ➕ {t('addFoodManual')}
                  </button>
                </div>
              </div>

              {foodLogsLoading ? (
                <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
                  <div
                    style={{
                      border: '3px solid rgba(255,255,255,0.05)',
                      borderTop: '3px solid var(--accent-purple)',
                      borderRadius: '50%',
                      width: '30px',
                      height: '30px',
                      animation: 'spin 1s linear infinite',
                      margin: '0 auto',
                    }}
                  />
                </div>
              ) : foodLogs.length === 0 ? (
                <div
                  className="card"
                  style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}
                >
                  <span style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}>🍽️</span>
                  <p style={{ fontSize: '14px', lineHeight: 1.5, maxWidth: '340px', margin: '0 auto' }}>
                    {t('noFoodLogged')}
                  </p>
                </div>
              ) : (
                <div className="food-list">
                  {foodLogs.map((item) => (
                    <FoodCard
                      key={item.id}
                      item={item}
                      onConfirm={handleConfirmFood}
                      onDelete={handleDeleteFood}
                      onEdit={handleEditFood}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Weekly Calorie Chart */}
            <div className="card" style={{ padding: 0, marginBottom: '24px' }}>
              <div className="card-header">
                <p className="card-header-title" style={{ color: '#7c4dff' }}>📊 {t('weeklyTitle')}</p>
              </div>
              <div className="card-body">
              {statsLoading ? (
                <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div
                    style={{
                      border: '3px solid rgba(255,255,255,0.05)',
                      borderTop: '3px solid var(--accent-purple)',
                      borderRadius: '50%',
                      width: '30px',
                      height: '30px',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                </div>
              ) : (
                <WeeklyChart data={stats?.weeklyData || []} />
              )}
              </div>
            </div>

            {/* Weight Tracker Section */}
            <div className="card" style={{ padding: 0, marginBottom: '24px' }}>
              <div className="card-header">
                <p className="card-header-title" style={{ color: '#00b0ff' }}>⚖️ {t('weightTitle')}</p>
              </div>
              <div className="card-body">
              {weightLogsLoading ? (
                <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div
                    style={{
                      border: '3px solid rgba(255,255,255,0.05)',
                      borderTop: '3px solid var(--accent-purple)',
                      borderRadius: '50%',
                      width: '30px',
                      height: '30px',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                </div>
              ) : (
                <>
                  <WeightChart data={weightLogs} />

                  {/* Log Weight Form */}
                  <form
                    onSubmit={handleWeightSubmit}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      marginTop: '20px',
                      alignItems: 'flex-end',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <label className="form-label" style={{ fontSize: '12px', marginBottom: '6px' }}>
                        {locale === 'th' ? 'บันทึกน้ำหนักตัววันนี้ (กก.)' : "Log Today's Weight (kg)"}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="10"
                        max="300"
                        className="form-input"
                        placeholder={locale === 'th' ? 'เช่น 70.5' : 'e.g. 70.5'}
                        required
                        value={weightInput}
                        onChange={(e) => setWeightInput(e.target.value)}
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{
                        height: '46px',
                        padding: '0 24px',
                        fontSize: '14px',
                        borderRadius: '8px',
                      }}
                      disabled={isWeightSubmitting}
                    >
                      {isWeightSubmitting ? '...' : locale === 'th' ? 'บันทึก' : 'Log'}
                    </button>
                  </form>
                </>
              )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Manual Food Add / Edit Modal Overlay */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(5, 5, 15, 0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => {
            setModalOpen(false);
            setEditingItem(null);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '440px',
              background: 'rgba(18, 18, 42, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 25px rgba(124, 77, 255, 0.2)',
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
            className="card animate-slide-in"
          >
            <h3
              style={{
                fontSize: '20px',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>{editingItem ? t('edit') : t('addFoodManual')}</span>
              <button
                onClick={() => {
                  setModalOpen(false);
                  setEditingItem(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '24px',
                  cursor: 'pointer',
                }}
              >
                &times;
              </button>
            </h3>

            <form onSubmit={handleFoodFormSubmit}>
              <div className="form-group">
                <label className="form-label">
                  {locale === 'th' ? 'ชื่ออาหาร (ภาษาไทย)' : 'Food Name (Thai)'}{' '}
                  <span style={{ color: 'var(--accent-pink)' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={foodForm.foodNameTh}
                  onChange={(e) => setFoodForm({ ...foodForm, foodNameTh: e.target.value })}
                  placeholder={locale === 'th' ? 'เช่น ข้าวมันไก่' : 'e.g. Hainanese Chicken Rice'}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  {locale === 'th' ? 'ชื่ออาหาร (ภาษาอังกฤษ - ไม่บังคับ)' : 'Food Name (English - Optional)'}
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={foodForm.foodName}
                  onChange={(e) => setFoodForm({ ...foodForm, foodName: e.target.value })}
                  placeholder="e.g. Chicken Rice"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">
                    {t('calories')} (kcal) <span style={{ color: 'var(--accent-pink)' }}>*</span>
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    required
                    min="0"
                    value={foodForm.calories}
                    onChange={(e) => setFoodForm({ ...foodForm, calories: e.target.value })}
                    placeholder="e.g. 500"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {locale === 'th' ? 'ประเภทมื้ออาหาร' : 'Meal Type'}
                  </label>
                  <select
                    className="form-select"
                    value={foodForm.mealType}
                    onChange={(e) => setFoodForm({ ...foodForm, mealType: e.target.value as any })}
                  >
                    <option value="breakfast">{t('mealBreakfast')}</option>
                    <option value="lunch">{t('mealLunch')}</option>
                    <option value="dinner">{t('mealDinner')}</option>
                    <option value="snack">{t('mealSnack')}</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  {locale === 'th' ? 'ขนาดส่วนที่ทาน' : 'Portion Size'}
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={foodForm.portionSize}
                  onChange={(e) => setFoodForm({ ...foodForm, portionSize: e.target.value })}
                  placeholder={locale === 'th' ? 'เช่น 1 จาน, 100 กรัม' : 'e.g. 1 plate, 100g'}
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '12px',
                  marginBottom: '24px',
                }}
              >
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#7c4dff' }}>
                    {t('protein')} (g)
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    min="0"
                    value={foodForm.protein}
                    onChange={(e) => setFoodForm({ ...foodForm, protein: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#00e676' }}>
                    {t('carbs')} (g)
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    min="0"
                    value={foodForm.carbs}
                    onChange={(e) => setFoodForm({ ...foodForm, carbs: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#ff9100' }}>
                    {t('fat')} (g)
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    min="0"
                    value={foodForm.fat}
                    onChange={(e) => setFoodForm({ ...foodForm, fat: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => {
                    setModalOpen(false);
                    setEditingItem(null);
                  }}
                >
                  {t('cancel')}
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={isFoodSubmitting}
                >
                  {isFoodSubmitting
                    ? locale === 'th'
                      ? 'กำลังบันทึก...'
                      : 'Saving...'
                    : t('confirm')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
