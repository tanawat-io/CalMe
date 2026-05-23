'use client';

import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js';
import { useTranslation } from '@/lib/i18n/context';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

interface WeightChartProps {
  data: {
    date: string;
    weight: number;
  }[];
}

export const WeightChart: React.FC<WeightChartProps> = ({ data }) => {
  const { t, locale } = useTranslation();

  // Return empty message if no data exists
  if (data.length === 0) {
    return (
      <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
        {locale === 'th' ? 'ไม่มีข้อมูลน้ำหนักตัว บันทึกน้ำหนักของคุณในโปรไฟล์เพื่อเริ่มต้น' : 'No weight data. Log weight in profile to start.'}
      </div>
    );
  }

  // Format date labels (e.g. 15 May or 15 พ.ค.)
  const formatDateLabel = (dateStr: string) => {
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return dateStr;
    
    return dateObj.toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US', {
      day: 'numeric',
      month: 'short',
    });
  };

  const labels = data.map((item) => formatDateLabel(item.date));
  const weights = data.map((item) => item.weight);

  const chartData = {
    labels,
    datasets: [
      {
        label: t('weightLabel'),
        data: weights,
        fill: true,
        backgroundColor: 'rgba(0, 230, 118, 0.08)',
        borderColor: '#00e676',
        borderWidth: 2,
        pointBackgroundColor: '#00e676',
        pointBorderColor: '#12122a',
        pointBorderWidth: 1.5,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.35, // Curved lines
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
          label: (context: any) => ` ${context.parsed.y} ${t('unitKg')}`,
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
            size: 10,
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
      <Line data={chartData} options={options as any} />
    </div>
  );
};
export default WeightChart;
