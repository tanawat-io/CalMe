import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

/**
 * Helper to authenticate request using Firebase ID Token
 */
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
 * GET food logs for a specific date (defaults to today)
 */
export async function GET(req: NextRequest) {
  try {
    const uid = await authenticate(req);
    if (!uid) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    // Default to Bangkok date (UTC+7) so the server-side date matches Thai users
    const bangkokDateStr = new Date(Date.now() + 7 * 3600000).toISOString().split('T')[0];
    const date = searchParams.get('date') || bangkokDateStr;

    const logsRef = adminDb.collection('users').doc(uid).collection('foodLogs');
    const snapshot = await logsRef.where('date', '==', date).get();

    const logs: any[] = [];
    snapshot.forEach((doc) => {
      logs.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
      });
    });

    // Sort in memory to avoid requiring a Firestore composite index
    logs.sort((a, b) => {
      const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
      const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
      return timeB - timeA;
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error fetching food logs:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * POST create a new food log entry (manual entry)
 */
export async function POST(req: NextRequest) {
  try {
    const uid = await authenticate(req);
    if (!uid) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { foodName, foodNameTh, calories, protein, carbs, fat, portionSize, mealType, date, imageUrl } = body;

    if (!foodNameTh || !calories) {
      return NextResponse.json({ error: 'Missing foodNameTh or calories' }, { status: 400 });
    }

    const todayStr = new Date(Date.now() + 7 * 3600000).toISOString().split('T')[0];
    const logRef = adminDb.collection('users').doc(uid).collection('foodLogs').doc();

    const newLog = {
      foodName: foodName || foodNameTh,
      foodNameTh: foodNameTh,
      calories: parseInt(calories),
      protein: parseInt(protein) || 0,
      carbs: parseInt(carbs) || 0,
      fat: parseInt(fat) || 0,
      portionSize: portionSize || '1 portion',
      mealType: mealType || 'snack',
      confirmed: true, // Manual logs are auto-confirmed
      imageUrl: imageUrl || '',
      date: date || todayStr,
      createdAt: new Date(),
    };

    await logRef.set(newLog);

    return NextResponse.json({
      id: logRef.id,
      ...newLog,
    });
  } catch (error) {
    console.error('Error creating food log:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * PUT update an existing food log (or confirm it)
 */
export async function PUT(req: NextRequest) {
  try {
    const uid = await authenticate(req);
    if (!uid) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { id, foodName, foodNameTh, calories, protein, carbs, fat, portionSize, mealType, confirmed, date } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing log entry id' }, { status: 400 });
    }

    const logRef = adminDb.collection('users').doc(uid).collection('foodLogs').doc(id);
    const doc = await logRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Log entry not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (foodName !== undefined) updateData.foodName = foodName;
    if (foodNameTh !== undefined) updateData.foodNameTh = foodNameTh;
    if (calories !== undefined) updateData.calories = parseInt(calories);
    if (protein !== undefined) updateData.protein = parseInt(protein);
    if (carbs !== undefined) updateData.carbs = parseInt(carbs);
    if (fat !== undefined) updateData.fat = parseInt(fat);
    if (portionSize !== undefined) updateData.portionSize = portionSize;
    if (mealType !== undefined) updateData.mealType = mealType;
    if (confirmed !== undefined) updateData.confirmed = confirmed;
    if (date !== undefined) updateData.date = date;
    updateData.updatedAt = new Date();

    await logRef.update(updateData);

    const updatedDoc = await logRef.get();
    return NextResponse.json({
      id: logRef.id,
      ...updatedDoc.data(),
    });
  } catch (error) {
    console.error('Error updating food log:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * DELETE food log entry
 */
export async function DELETE(req: NextRequest) {
  try {
    const uid = await authenticate(req);
    if (!uid) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing log entry id' }, { status: 400 });
    }

    const logRef = adminDb.collection('users').doc(uid).collection('foodLogs').doc(id);
    const doc = await logRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Log entry not found' }, { status: 404 });
    }

    await logRef.delete();
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Error deleting food log:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
