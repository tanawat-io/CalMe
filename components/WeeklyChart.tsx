'use client';

import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useTranslation } from '@/lib/i18n/context';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface WeeklyChartProps {
  data: {
    date: string;
    calories: number;
  }[];
}

export const WeeklyChart: React.FC<WeeklyChartProps> = ({ data }) => {
  const { t, locale } = useTranslation();

  // Helper to format dates to display name (e.g. Mon, Tue or จ., อ.)
  const formatDateLabel = (dateStr: string) => {
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return dateStr;
    
    return dateObj.toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US', {
      weekday: 'short',
    });
  };

  const labels = data.map((item) => formatDateLabel(item.date));
  const calories = data.map((item) => item.calories);

  const chartData = {
    labels,
    datasets: [
      {
        label: t('calories'),
        data: calories,
        // Premium gradient-like solid coloring
        backgroundColor: 'rgba(124, 77, 255, 0.65)',
        borderColor: '#7c4dff',
        borderWidth: 1.5,
        borderRadius: 6,
        hoverBackgroundColor: 'rgba(0, 230, 118, 0.8)',
        hoverBorderColor: '#00e676',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#12122a',
        titleColor: '#ffffff',
        bodyColor: '#90a0c0',
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: (context: any) => ` ${context.parsed.y} ${t('unitCalories')}`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#90a0c0',
          font: {
            family: 'var(--font-body)',
            size: 11,
          },
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: '#607090',
          font: {
            family: 'var(--font-body)',
            size: 10,
          },
        },
      },
    },
  };

  return (
    <div style={{ height: '220px', width: '100%', position: 'relative' }}>
      <Bar data={chartData} options={options as any} />
    </div>
  );
};
export default WeeklyChart;
