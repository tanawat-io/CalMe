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

    const today = new Date();
    const datesList: string[] = [];
    
    // Generate array of last 7 dates (YYYY-MM-DD)
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      datesList.push(d.toISOString().split('T')[0]);
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

    // Calculate streak (consecutive days with logs, going backward from today)
    let streak = 0;
    let checkDate = new Date();
    
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      const logsSnap = await foodLogsRef
        .where('date', '==', dateStr)
        .where('confirmed', '==', true)
        .limit(1)
        .get();
      
      if (!logsSnap.empty) {
        streak++;
        // Go back 1 day
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        // If it's today and empty, check yesterday to keep streak alive
        if (streak === 0) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          const yesterdaySnap = await foodLogsRef
            .where('date', '==', yesterdayStr)
            .where('confirmed', '==', true)
            .limit(1)
            .get();
          
          if (!yesterdaySnap.empty) {
            // Yes, user logged yesterday but not today yet, streak is alive
            streak = 1;
            checkDate = yesterday;
            checkDate.setDate(checkDate.getDate() - 1);
            continue; // Keep checking backwards
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
