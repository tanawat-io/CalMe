'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { useTranslation } from '@/lib/i18n/context';
import { Navbar } from '@/components/Navbar';
import { LanguageToggle } from '@/components/LanguageToggle';
import { FoodCard, FoodLogItem } from '@/components/FoodCard';
import { CalorieRing } from '@/components/CalorieRing';
import { MacroBar } from '@/components/MacroBar';

// Helper to get local date string in YYYY-MM-DD format
const getLocalDateString = (d: Date = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function HistoryPage() {
  const { user, loading } = useAuth();
  const { t, locale } = useTranslation();
  const router = useRouter();

  // Selected date defaults to today
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  
  // Data states
  const [logs, setLogs] = useState<FoodLogItem[]>([]);
  const [targets, setTargets] = useState({
    calories: 2000,
    protein: 130,
    carbs: 220,
    fat: 65,
  });

  // UX states
  const [fetchingLogs, setFetchingLogs] = useState(true);
  const [editingItem, setEditingItem] = useState<FoodLogItem | null>(null);
  
  // Edit Form state
  const [editFoodName, setEditFoodName] = useState('');
  const [editFoodNameTh, setEditFoodNameTh] = useState('');
  const [editCalories, setEditCalories] = useState('');
  const [editProtein, setEditProtein] = useState('');
  const [editCarbs, setEditCarbs] = useState('');
  const [editFat, setEditFat] = useState('');
  const [editPortionSize, setEditPortionSize] = useState('');
  const [editMealType, setEditMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('snack');
  const [updatingLog, setUpdatingLog] = useState(false);

  // Firebase auth redirection
  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Fetch target macros from profile
  const fetchProfileTargets = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/user', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.targetCalories) {
          setTargets({
            calories: data.targetCalories,
            protein: data.targetProtein || 130,
            carbs: data.targetCarbs || 220,
            fat: data.targetFat || 65,
          });
        }
      }
    } catch (err) {
      console.error('Error fetching profile targets:', err);
    }
  };

  // Fetch food logs for the selected date
  const fetchLogs = async () => {
    if (!user) return;
    setFetchingLogs(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/food-log?date=${selectedDate}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      } else {
        throw new Error('Failed to fetch food logs');
      }
    } catch (err) {
      console.error('Error fetching food logs:', err);
    } finally {
      setFetchingLogs(false);
    }
  };

  // Load targets once and logs whenever selectedDate or user changes
  useEffect(() => {
    if (user && !loading) {
      fetchProfileTargets();
    }
  }, [user, loading]);

  useEffect(() => {
    if (user && !loading) {
      fetchLogs();
    }
  }, [user, loading, selectedDate]);

  // Confirm Food Log item
  const handleConfirm = async (id: string) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/food-log', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, confirmed: true }),
      });
      if (res.ok) {
        fetchLogs();
      } else {
        throw new Error('Failed to confirm food item');
      }
    } catch (err) {
      console.error(err);
      alert(locale === 'th' ? 'เกิดข้อผิดพลาดในการยืนยันรายการอาหาร' : 'Failed to confirm food item');
    }
  };

  // Delete Food Log item
  const handleDelete = async (id: string) => {
    if (!user) return;
    const confirmMessage = locale === 'th' 
      ? 'คุณต้องการลบรายการอาหารนี้ใช่หรือไม่?' 
      : 'Are you sure you want to delete this food item?';
    if (!window.confirm(confirmMessage)) return;

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/food-log?id=${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        fetchLogs();
      } else {
        throw new Error('Failed to delete food item');
      }
    } catch (err) {
      console.error(err);
      alert(locale === 'th' ? 'เกิดข้อผิดพลาดในการลบรายการอาหาร' : 'Failed to delete food item');
    }
  };

  // Open Edit Modal and fill form states
  const openEditModal = (item: FoodLogItem) => {
    setEditingItem(item);
    setEditFoodName(item.foodName || '');
    setEditFoodNameTh(item.foodNameTh || '');
    setEditCalories(item.calories?.toString() || '');
    setEditProtein(item.protein?.toString() || '0');
    setEditCarbs(item.carbs?.toString() || '0');
    setEditFat(item.fat?.toString() || '0');
    setEditPortionSize(item.portionSize || '1 portion');
    setEditMealType(item.mealType || 'snack');
  };

  // Submit Edited Food Log item
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingItem) return;

    setUpdatingLog(true);
    try {
      const token = await user.getIdToken();
      const payload = {
        id: editingItem.id,
        foodName: editFoodName,
        foodNameTh: editFoodNameTh,
        calories: parseInt(editCalories) || 0,
        protein: parseInt(editProtein) || 0,
        carbs: parseInt(editCarbs) || 0,
        fat: parseInt(editFat) || 0,
        portionSize: editPortionSize,
        mealType: editMealType,
        confirmed: true, // edits automatically mark as confirmed
      };

      const res = await fetch('/api/food-log', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setEditingItem(null);
        fetchLogs();
      } else {
        throw new Error('Failed to update food log');
      }
    } catch (err) {
      console.error(err);
      alert(locale === 'th' ? 'เกิดข้อผิดพลาดในการแก้ไขข้อมูลอาหาร' : 'Failed to update food log');
    } finally {
      setUpdatingLog(false);
    }
  };

  // Sum totals for the day
  const totalCalories = logs.reduce((sum, item) => sum + (item.calories || 0), 0);
  const totalProtein = logs.reduce((sum, item) => sum + (item.protein || 0), 0);
  const totalCarbs = logs.reduce((sum, item) => sum + (item.carbs || 0), 0);
  const totalFat = logs.reduce((sum, item) => sum + (item.fat || 0), 0);

  if (loading || !user) {
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
        <h1 className="page-title text-gradient">{t('history')}</h1>
        <LanguageToggle />
      </header>

      {/* Date selector header widget */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>📅</span>
          <span style={{ fontWeight: 600, fontSize: '15px' }}>{locale === 'th' ? 'เลือกวันที่ดูประวัติ:' : 'Select History Date:'}</span>
        </div>
        <input
          type="date"
          className="form-input"
          style={{ width: 'auto', minWidth: '160px', padding: '8px 12px' }}
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', width: '100%' }}>
        {/* Desktop Responsive Columns Grid */}
        <style jsx global>{`
          @media (min-width: 769px) {
            .history-grid-layout {
              display: grid;
              grid-template-columns: 1fr 1.3fr;
              gap: 24px;
              align-items: start;
            }
          }
        `}</style>

        <div className="history-grid-layout" style={{ width: '100%' }}>
          
          {/* Left Column: Daily Summary */}
          <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 style={{ alignSelf: 'flex-start', marginBottom: '16px' }}>
              {locale === 'th' ? 'สรุปโภชนาการประจำวัน' : 'Daily Nutrition Summary'}
            </h3>
            
            <CalorieRing consumed={totalCalories} target={targets.calories} />
            
            <div className="macro-container" style={{ width: '100%', marginTop: '20px' }}>
              <MacroBar label={t('protein')} consumed={totalProtein} target={targets.protein} type="protein" />
              <MacroBar label={t('carbs')} consumed={totalCarbs} target={targets.carbs} type="carbs" />
              <MacroBar label={t('fat')} consumed={totalFat} target={targets.fat} type="fat" />
            </div>
          </div>

          {/* Right Column: List of logged food cards */}
          <div>
            <h3 style={{ marginBottom: '16px' }}>
              {locale === 'th' ? 'รายการอาหารมื้อหลักและมื้อว่าง' : 'Meals & Snacks'}
            </h3>

            {fetchingLogs ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                <div style={{ border: '3px solid rgba(255,255,255,0.05)', borderTop: '3px solid var(--accent-purple)', borderRadius: '50%', width: '28px', height: '28px', animation: 'spin 1s linear infinite' }} />
              </div>
            ) : logs.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🍲</div>
                <p style={{ fontSize: '14px', lineHeight: 1.5 }}>
                  {locale === 'th' 
                    ? 'ไม่มีประวัติมื้ออาหารสำหรับวันนี้ ถ่ายรูปส่งทาง LINE Bot เพื่อเพิ่มเลย!' 
                    : 'No food items logged for this date. Log your meals via our LINE Bot!'}
                </p>
              </div>
            ) : (
              <div className="food-list">
                {logs.map((item) => (
                  <FoodCard
                    key={item.id}
                    item={item}
                    onConfirm={handleConfirm}
                    onDelete={handleDelete}
                    onEdit={openEditModal}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Premium Edit Item Modal Dialog overlay */}
      {editingItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '440px', background: 'var(--background-card)', border: '1px solid var(--border-focus)', boxShadow: 'var(--shadow-glow-purple)', marginBottom: 0 }}>
            <h3 style={{ marginBottom: '16px' }}>
              {locale === 'th' ? 'แก้ไขรายละเอียดอาหาร' : 'Edit Food Details'}
            </h3>
            
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label className="form-label">{locale === 'th' ? 'ชื่ออาหาร (ไทย)' : 'Food Name (TH)'}</label>
                <input
                  type="text"
                  className="form-input"
                  value={editFoodNameTh}
                  onChange={(e) => setEditFoodNameTh(e.target.value)}
                  placeholder="e.g. ข้าวมันไก่"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">{locale === 'th' ? 'ชื่ออาหาร (อังกฤษ)' : 'Food Name (EN)'}</label>
                <input
                  type="text"
                  className="form-input"
                  value={editFoodName}
                  onChange={(e) => setEditFoodName(e.target.value)}
                  placeholder="e.g. Chicken Rice"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">{t('calories')} (kcal)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={editCalories}
                    onChange={(e) => setEditCalories(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{locale === 'th' ? 'ขนาดส่วนเสิร์ฟ' : 'Portion'}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editPortionSize}
                    onChange={(e) => setEditPortionSize(e.target.value)}
                    placeholder="e.g. 1 plate, 100g"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{locale === 'th' ? 'ประเภทมื้ออาหาร' : 'Meal Type'}</label>
                <select
                  className="form-select"
                  value={editMealType}
                  onChange={(e) => setEditMealType(e.target.value as any)}
                >
                  <option value="breakfast">{t('mealBreakfast')}</option>
                  <option value="lunch">{t('mealLunch')}</option>
                  <option value="dinner">{t('mealDinner')}</option>
                  <option value="snack">{t('mealSnack')}</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#7c4dff' }}>{t('protein')} (g)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={editProtein}
                    onChange={(e) => setEditProtein(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#00e676' }}>{t('carbs')} (g)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={editCarbs}
                    onChange={(e) => setEditCarbs(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#ff9100' }}>{t('fat')} (g)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={editFat}
                    onChange={(e) => setEditFat(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={updatingLog}
                  className="btn btn-primary"
                  style={{ flex: 1, gap: '8px' }}
                >
                  {updatingLog && (
                    <div style={{ border: '2px solid rgba(255,255,255,0.2)', borderTop: '2px solid white', borderRadius: '50%', width: '12px', height: '12px', animation: 'spin 1s linear infinite' }} />
                  )}
                  <span>{t('confirm')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
