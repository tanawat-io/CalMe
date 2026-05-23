import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

async function authenticate(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      return decodedToken.uid;
    } catch (error) {
      console.error('Auth verification failed:', error);
    }
  }
  
  return null;
}

/**
 * GET weekly statistics and streak metrics
 */
export async function GET(req: NextRequest) {
  try {
    const uid = await authenticate(req);
    if (!uid) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Bangkok UTC+7 helper
    const bangkokMs = () => Date.now() + 7 * 3600000;
    const bangkokDateStr = (offsetDays = 0) => {
      const d = new Date(bangkokMs());
      d.setUTCDate(d.getUTCDate() - offsetDays);
      return d.toISOString().split('T')[0];
    };

    const datesList: string[] = [];

    // Generate array of last 7 dates (YYYY-MM-DD) in Bangkok time
    for (let i = 6; i >= 0; i--) {
      datesList.push(bangkokDateStr(i));
    }

    const startDateStr = datesList[0];

    // Fetch all confirmed food logs in last 7 days
    const foodLogsRef = adminDb.collection('users').doc(uid).collection('foodLogs');
    const snapshot = await foodLogsRef
      .where('date', '>=', startDateStr)
      .get();

    // Map logs to dates
    const dailyTotals: Record<string, { calories: number; protein: number; carbs: number; fat: number }> = {};
    datesList.forEach((date) => {
      dailyTotals[date] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    });

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.confirmed) return; // Filter in memory to avoid requiring a Firestore composite index
      const logDate = data.date;
      if (dailyTotals[logDate]) {
        dailyTotals[logDate].calories += data.calories || 0;
        dailyTotals[logDate].protein += data.protein || 0;
        dailyTotals[logDate].carbs += data.carbs || 0;
        dailyTotals[logDate].fat += data.fat || 0;
      }
    });

    // Format for charts
    const weeklyData = datesList.map((date) => ({
      date,
      calories: dailyTotals[date].calories,
      protein: dailyTotals[date].protein,
      carbs: dailyTotals[date].carbs,
      fat: dailyTotals[date].fat,
    }));

    // Calculate streak (consecutive days with logs, going backward from today) — Bangkok UTC+7
    let streak = 0;
    let checkDayOffset = 0; // 0 = today, 1 = yesterday, …

    while (true) {
      const dateStr = bangkokDateStr(checkDayOffset);
      const logsSnap = await foodLogsRef
        .where('date', '==', dateStr)
        .where('confirmed', '==', true)
        .limit(1)
        .get();

      if (!logsSnap.empty) {
        streak++;
        checkDayOffset++;
      } else {
        // If it's today and empty, check yesterday to keep streak alive
        if (streak === 0) {
          const yesterdayStr = bangkokDateStr(1);
          const yesterdaySnap = await foodLogsRef
            .where('date', '==', yesterdayStr)
            .where('confirmed', '==', true)
            .limit(1)
            .get();

          if (!yesterdaySnap.empty) {
            // User logged yesterday but not today yet — streak is alive
            streak = 1;
            checkDayOffset = 2; // next iteration checks 2 days ago
            continue;
          }
        }
        break; // Streak broken
      }
    }

    return NextResponse.json({
      weeklyData,
      streak,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
