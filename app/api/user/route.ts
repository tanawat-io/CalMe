import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { calculateMacros } from '@/lib/tdee';

/**
 * Helper to authenticate request using Firebase ID Token
 * Returns uid (LINE User ID) if successful, or null
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
 * GET user profile
 */
export async function GET(req: NextRequest) {
  try {
    const uid = await authenticate(req);
    if (!uid) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const userRef = adminDb.collection('users').doc(uid);
    const doc = await userRef.get();

    if (!doc.exists) {
      // Return 404 so frontend knows to trigger initial setup or registration
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    return NextResponse.json(doc.data());
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * PUT update user profile (and recalculate targets)
 */
export async function PUT(req: NextRequest) {
  try {
    const uid = await authenticate(req);
    if (!uid) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { displayName, pictureUrl, weight, height, age, gender, activityLevel, program, language } = body;

    const userRef = adminDb.collection('users').doc(uid);
    const doc = await userRef.get();

    const currentData = doc.exists ? doc.data() : {};
    
    // Construct updated profile
    const updatedProfile = {
      displayName: displayName || currentData?.displayName || 'User',
      pictureUrl: pictureUrl || currentData?.pictureUrl || '',
      weight: parseFloat(weight) || currentData?.weight || 70,
      height: parseFloat(height) || currentData?.height || 170,
      age: parseInt(age) || currentData?.age || 25,
      gender: gender || currentData?.gender || 'male',
      activityLevel: activityLevel || currentData?.activityLevel || 'moderate',
      program: program || currentData?.program || 'build_muscle',
      language: language || currentData?.language || 'th',
      setupStep: 'completed', // Complete onboarding wizard step
      updatedAt: new Date(),
    };

    // Calculate new calorie/macro targets
    const newTargets = calculateMacros(updatedProfile as any);

    const fullProfile = {
      ...updatedProfile,
      targetCalories: newTargets.calories,
      targetProtein: newTargets.protein,
      targetCarbs: newTargets.carbs,
      targetFat: newTargets.fat,
    };

    await userRef.set(fullProfile, { merge: true });

    // Proactively log this weight update in weightLogs as well
    const todayStr = new Date(Date.now() + 7 * 3600000).toISOString().split('T')[0]; // Bangkok UTC+7
    await userRef.collection('weightLogs').add({
      weight: fullProfile.weight,
      date: todayStr,
      createdAt: new Date(),
    });

    return NextResponse.json(fullProfile);
  } catch (error) {
    console.error('Error updating user profile:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
