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
 * GET weight history
 */
export async function GET(req: NextRequest) {
  try {
    const uid = await authenticate(req);
    if (!uid) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const weightLogsRef = adminDb.collection('users').doc(uid).collection('weightLogs');
    const snapshot = await weightLogsRef.orderBy('date', 'asc').limit(30).get();

    const logs: any[] = [];
    snapshot.forEach((doc) => {
      logs.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
      });
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error fetching weight logs:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * POST add new weight entry
 */
export async function POST(req: NextRequest) {
  try {
    const uid = await authenticate(req);
    if (!uid) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { weight, date } = body;

    if (!weight) {
      return NextResponse.json({ error: 'Missing weight value' }, { status: 400 });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const userRef = adminDb.collection('users').doc(uid);
    
    // Check if user exists
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const weightVal = parseFloat(weight);

    // 1. Add to weightLogs collection
    const logRef = userRef.collection('weightLogs').doc();
    const newLog = {
      weight: weightVal,
      date: date || todayStr,
      createdAt: new Date(),
    };
    await logRef.set(newLog);

    // 2. Update current weight in user profile
    await userRef.update({
      weight: weightVal,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      id: logRef.id,
      ...newLog,
    });
  } catch (error) {
    console.error('Error logging weight:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
