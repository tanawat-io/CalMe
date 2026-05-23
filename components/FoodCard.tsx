'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n/context';

export interface FoodLogItem {
  id: string;
  foodName: string;
  foodNameTh: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  portionSize: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  confirmed: boolean;
  imageUrl?: string;
  date: string;
}

interface FoodCardProps {
  item: FoodLogItem;
  onConfirm?: (id: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (item: FoodLogItem) => void;
}

export const FoodCard: React.FC<FoodCardProps> = ({ item, onConfirm, onDelete, onEdit }) => {
  const { t, locale } = useTranslation();
  const { id, foodName, foodNameTh, calories, protein, carbs, fat, portionSize, mealType, confirmed, imageUrl } = item;

  const mealLabels = {
    breakfast: t('mealBreakfast'),
    lunch: t('mealLunch'),
    dinner: t('mealDinner'),
    snack: t('mealSnack'),
  };

  const mealIcons = {
    breakfast: '🍳',
    lunch: '🍱',
    dinner: '🍛',
    snack: '🍎',
  };

  const displayName = locale === 'th' ? foodNameTh : foodName;

  return (
    <div className={`card ${!confirmed ? 'pulse-glow' : ''}`} style={{ padding: '14px', marginBottom: '12px', border: !confirmed ? '1px dashed var(--accent-purple)' : '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
        
        {/* Food Image or Icon */}
        <div className="food-img-wrapper">
          {imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={imageUrl} alt={displayName} className="food-img" />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '24px', background: 'rgba(255,255,255,0.03)' }}>
              {mealIcons[mealType] || '🍲'}
            </div>
          )}
        </div>

        {/* Food Info */}
        <div className="food-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', fontWeight: 600 }}>
              {mealLabels[mealType] || mealType}
            </span>
            {!confirmed && (
              <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'var(--accent-purple-glow)', color: 'var(--accent-purple)', fontWeight: 600, border: '1px solid rgba(124, 77, 255, 0.3)' }}>
                {locale === 'th' ? 'รอยืนยัน' : 'Unconfirmed'}
              </span>
            )}
          </div>
          
          <h4 className="food-name" style={{ marginTop: '4px', marginBottom: '2px' }} title={displayName}>
            {displayName}
          </h4>
          
          <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
            <span>{portionSize}</span>
            <span>•</span>
            <span style={{ display: 'inline-flex', gap: '6px' }}>
              <span style={{ color: '#7c4dff' }}>P: {protein}g</span>
              <span style={{ color: '#00e676' }}>C: {carbs}g</span>
              <span style={{ color: '#ff9100' }}>F: {fat}g</span>
            </span>
          </div>
        </div>

        {/* Calories Display */}
        <div className="food-cals">
          {calories} <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>kcal</span>
        </div>
      </div>

      {/* Action Buttons for Unconfirmed items */}
      {!confirmed && (onConfirm || onDelete) && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {onConfirm && (
            <button
              onClick={() => onConfirm(id)}
              className="btn btn-primary"
              style={{ padding: '6px 16px', fontSize: '12px', flex: 1, borderRadius: '8px' }}
            >
              {t('confirm')}
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(id)}
              className="btn btn-secondary"
              style={{ padding: '6px 16px', fontSize: '12px', flex: 1, borderRadius: '8px', color: 'var(--accent-pink)' }}
            >
              {t('delete')}
            </button>
          )}
        </div>
      )}

      {/* Edit/Delete Actions for Confirmed items */}
      {confirmed && (onEdit || onDelete) && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
          {onEdit && (
            <button 
              onClick={() => onEdit(item)} 
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              className="card-interactive"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
              {t('edit')}
            </button>
          )}
          {onDelete && (
            <button 
              onClick={() => onDelete(id)} 
              style={{ background: 'none', border: 'none', color: 'rgba(255, 64, 129, 0.8)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              className="card-interactive"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
              {t('delete')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
