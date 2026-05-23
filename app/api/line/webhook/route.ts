import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import * as admin from 'firebase-admin';
import { adminDb } from '@/lib/firebase-admin';
import { analyzeFoodImage, FoodAnalysisResult, FoodLog } from '@/lib/gemini';
import { calculateMacros, UserProfileData } from '@/lib/tdee';
import { 
  lineClient, 
  getLineImageContent, 
  createFoodFlexMessage, 
  createSummaryFlexMessage,
  createEditMenuFlexMessage,
  createOnboardingWelcomeFlexMessage,
  createMainMenuFlexMessage,
  createOnboardingCompleteFlexMessage
} from '@/lib/line/client';

export interface UserProfile extends UserProfileData {
  displayName: string;
  pictureUrl: string;
  language: string;
  setupStep?: string;
  createdAt: Date | admin.firestore.Timestamp;
  updatedAt: Date | admin.firestore.Timestamp;
  targetCalories?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
}

const channelSecret = process.env.LINE_CHANNEL_SECRET || '';

/**
 * Verify LINE Messaging API signature
 */
function verifyLineSignature(body: string, signature: string): boolean {
  if (!signature || !channelSecret) return false;
  
  const hash = crypto
    .createHmac('SHA256', channelSecret)
    .update(body)
    .digest('base64');
  return hash === signature;
}

/**
 * Get or initialize user profile in Firestore
 */
async function getOrCreateUserProfile(lineUserId: string, displayName: string, pictureUrl: string): Promise<UserProfile> {
  const userRef = adminDb.collection('users').doc(lineUserId);
  const doc = await userRef.get();

  if (doc.exists) {
    return doc.data() as UserProfile;
  }

  // Create default profile for first-time user
  const defaultProfile: UserProfile = {
    displayName,
    pictureUrl,
    weight: 70,
    height: 170,
    age: 25,
    gender: 'male',
    activityLevel: 'moderate',
    program: 'build_muscle',
    language: 'th',
    setupStep: 'welcome',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Calculate default macros
  const targets = calculateMacros(defaultProfile);
  
  const fullProfile: UserProfile = {
    ...defaultProfile,
    targetCalories: targets.calories,
    targetProtein: targets.protein,
    targetCarbs: targets.carbs,
    targetFat: targets.fat,
  };

  await userRef.set(fullProfile);
  return fullProfile;
}

/**
 * Get today's total calories for a user
 */
async function getTodayCalories(lineUserId: string): Promise<{ total: number; protein: number; carbs: number; fat: number }> {
  const todayStr = new Date().toISOString().split('T')[0];
  const logsSnapshot = await adminDb
    .collection('users')
    .doc(lineUserId)
    .collection('foodLogs')
    .where('date', '==', todayStr)
    .where('confirmed', '==', true)
    .get();

  let total = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;

  logsSnapshot.forEach((doc) => {
    const data = doc.data();
    total += data.calories || 0;
    protein += data.protein || 0;
    carbs += data.carbs || 0;
    fat += data.fat || 0;
  });

  return { total, protein, carbs, fat };
}

/**
 * Handle summary command and response
 */
async function handleSummaryCommand(lineUserId: string, replyToken: string, req: NextRequest) {
  try {
    const todayTotals = await getTodayCalories(lineUserId);
    const userProfileDoc = await adminDb.collection('users').doc(lineUserId).get();
    const targetCals = userProfileDoc.data()?.targetCalories || 2000;
    
    // 1. Fetch today's confirmed meals from Firestore
    const todayStr = new Date().toISOString().split('T')[0];
    const logsSnapshot = await adminDb
      .collection('users')
      .doc(lineUserId)
      .collection('foodLogs')
      .where('date', '==', todayStr)
      .where('confirmed', '==', true)
      .get();

    const todayMeals: FoodLog[] = [];
    logsSnapshot.forEach((doc) => {
      const data = doc.data();
      todayMeals.push({
        id: doc.id,
        foodName: data.foodName,
        foodNameTh: data.foodNameTh,
        calories: data.calories,
        protein: data.protein,
        carbs: data.carbs,
        fat: data.fat,
        portionSize: data.portionSize,
        mealType: data.mealType,
        confirmed: data.confirmed,
        imageUrl: data.imageUrl,
        date: data.date,
        createdAt: (() => {
          if (!data.createdAt) return new Date();
          if (data.createdAt instanceof admin.firestore.Timestamp) return data.createdAt.toDate();
          if (typeof data.createdAt.toDate === 'function') return data.createdAt.toDate();
          const d = new Date(data.createdAt);
          return isNaN(d.getTime()) ? new Date() : d;
        })(),
        updatedAt: (() => {
          if (!data.updatedAt) return new Date();
          if (data.updatedAt instanceof admin.firestore.Timestamp) return data.updatedAt.toDate();
          if (typeof data.updatedAt.toDate === 'function') return data.updatedAt.toDate();
          const d = new Date(data.updatedAt);
          return isNaN(d.getTime()) ? new Date() : d;
        })(),
        baseCalories: data.baseCalories,
        baseProtein: data.baseProtein,
        baseCarbs: data.baseCarbs,
        baseFat: data.baseFat,
      });
    });

    // Sort in memory by creation time
    todayMeals.sort((a, b) => {
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    // 2. Calculate actual logging streak
    let streak = 0;
    let checkDate = new Date();
    const foodLogsRef = adminDb.collection('users').doc(lineUserId).collection('foodLogs');
    
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      const logsSnap = await foodLogsRef
        .where('date', '==', dateStr)
        .where('confirmed', '==', true)
        .limit(1)
        .get();
      
      if (!logsSnap.empty) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
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
            streak = 1;
            checkDate = yesterday;
            checkDate.setDate(checkDate.getDate() - 1);
            continue;
          }
        }
        break;
      }
    }

    // 3. Resolve dynamic dashboard URL
    const origin = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
    const dashboardUrl = `${origin}/dashboard`;

    const flexSummary = createSummaryFlexMessage(
      todayTotals.total,
      targetCals,
      todayTotals.protein || 0,
      todayTotals.carbs || 0,
      todayTotals.fat || 0,
      streak,
      todayMeals,
      dashboardUrl
    );

    await lineClient.replyMessage({
      replyToken,
      messages: [flexSummary],
    });
  } catch (e) {
    console.error('Error generating summary via bot:', e);
    await lineClient.replyMessage({
      replyToken,
      messages: [
        {
          type: 'text',
          text: '❌ เกิดข้อผิดพลาดในการดึงข้อมูลสรุปแคลอรี่',
        },
      ],
    });
  }
}

// Quick reply builder helpers
function getGenderQuickReplies() {
  return {
    items: [
      {
        type: 'action' as const,
        action: {
          type: 'postback' as const,
          label: '👨‍💼 ชาย',
          data: 'action=setup_gender&value=male',
          displayText: 'เลือกเพศ: ชาย'
        }
      },
      {
        type: 'action' as const,
        action: {
          type: 'postback' as const,
          label: '👩‍💼 หญิง',
          data: 'action=setup_gender&value=female',
          displayText: 'เลือกเพศ: หญิง'
        }
      }
    ]
  };
}

function getAgeQuickReplies() {
  return {
    items: [20, 25, 30, 35, 40].map(age => ({
      type: 'action' as const,
      action: {
        type: 'postback' as const,
        label: `${age} ปี`,
        data: `action=setup_age&value=${age}`,
        displayText: `อายุ ${age} ปี`
      }
    }))
  };
}

function getHeightQuickReplies() {
  return {
    items: [155, 160, 165, 170, 175, 180].map(h => ({
      type: 'action' as const,
      action: {
        type: 'postback' as const,
        label: `${h} ซม.`,
        data: `action=setup_height&value=${h}`,
        displayText: `ส่วนสูง ${h} ซม.`
      }
    }))
  };
}

function getWeightQuickReplies() {
  return {
    items: [50, 60, 70, 80, 90].map(w => ({
      type: 'action' as const,
      action: {
        type: 'postback' as const,
        label: `${w} กก.`,
        data: `action=setup_weight&value=${w}`,
        displayText: `น้ำหนัก ${w} กก.`
      }
    }))
  };
}

function getActivityQuickReplies() {
  return {
    items: [
      { label: '🛋️ ขยับน้อยมาก', val: 'sedentary', display: 'ระดับกิจกรรม: นั่งทำงานกับที่' },
      { label: '🚶 เบาๆ (1-3 วัน/สัปดาห์)', val: 'light', display: 'ระดับกิจกรรม: ออกกำลังกายเบาๆ' },
      { label: '🏃 ปานกลาง (3-5 วัน/สัปดาห์)', val: 'moderate', display: 'ระดับกิจกรรม: ออกกำลังกายปานกลาง' },
      { label: '🏋️ หนัก (6-7 วัน/สัปดาห์)', val: 'active', display: 'ระดับกิจกรรม: ออกกำลังกายหนัก' },
      { label: '🚴 หนักมาก (เป็นนักกีฬา)', val: 'extra', display: 'ระดับกิจกรรม: หนักมาก' }
    ].map(item => ({
      type: 'action' as const,
      action: {
        type: 'postback' as const,
        label: item.label,
        data: `action=setup_activity&value=${item.val}`,
        displayText: item.display
      }
    }))
  };
}

function getProgramQuickReplies() {
  return {
    items: [
      { label: '📉 ลดน้ำหนัก', val: 'lose_weight', display: 'เป้าหมาย: ลดน้ำหนัก' },
      { label: '⚖️ คงน้ำหนักเดิม', val: 'maintain', display: 'เป้าหมาย: คงน้ำหนักเดิม' },
      { label: '📈 เพิ่มกล้ามเนื้อ', val: 'build_muscle', display: 'เป้าหมาย: เพิ่มกล้ามเนื้อ' }
    ].map(item => ({
      type: 'action' as const,
      action: {
        type: 'postback' as const,
        label: item.label,
        data: `action=setup_program&value=${item.val}`,
        displayText: item.display
      }
    }))
  };
}

/**
 * Send wizard step questions with quick reply buttons
 */
async function sendOnboardingStep(lineUserId: string, step: string, replyToken: string) {
  if (step === 'welcome') {
    await lineClient.replyMessage({
      replyToken,
      messages: [createOnboardingWelcomeFlexMessage()]
    });
  } else if (step === 'gender') {
    await lineClient.replyMessage({
      replyToken,
      messages: [
        {
          type: 'text',
          text: '1️⃣ กรุณาเลือกเพศสภาพของคุณเพื่อประกอบการคำนวณอัตราเผาผลาญครับ:',
          quickReply: getGenderQuickReplies()
        }
      ]
    });
  } else if (step === 'age') {
    await lineClient.replyMessage({
      replyToken,
      messages: [
        {
          type: 'text',
          text: '2️⃣ กรุณาพิมพ์อายุปัจจุบันของคุณเป็นตัวเลข (เช่น 28) หรือเลือกตัวเลือกด่วนด้านล่างนี้ครับ:',
          quickReply: getAgeQuickReplies()
        }
      ]
    });
  } else if (step === 'height') {
    await lineClient.replyMessage({
      replyToken,
      messages: [
        {
          type: 'text',
          text: '3️⃣ กรุณาพิมพ์ส่วนสูงในปัจจุบันของคุณเป็นเซนติเมตร (เช่น 175) หรือเลือกตัวเลือกด่วนด้านล่างนี้ครับ:',
          quickReply: getHeightQuickReplies()
        }
      ]
    });
  } else if (step === 'weight') {
    await lineClient.replyMessage({
      replyToken,
      messages: [
        {
          type: 'text',
          text: '4️⃣ กรุณาพิมพ์น้ำหนักปัจจุบันของคุณเป็นกิโลกรัม (เช่น 72.4) หรือเลือกตัวเลือกด่วนด้านล่างนี้ครับ:',
          quickReply: getWeightQuickReplies()
        }
      ]
    });
  } else if (step === 'activity') {
    await lineClient.replyMessage({
      replyToken,
      messages: [
        {
          type: 'text',
          text: '5️⃣ กรุณาเลือกระดับการทำกิจกรรมประจำวันของคุณด้านล่างนี้ครับ:',
          quickReply: getActivityQuickReplies()
        }
      ]
    });
  } else if (step === 'program') {
    await lineClient.replyMessage({
      replyToken,
      messages: [
        {
          type: 'text',
          text: '6️⃣ สุดท้ายแล้ว! กรุณาเลือกเป้าหมายสุขภาพร่างกายที่คุณต้องการในปัจจุบันด้านล่างนี้ครับ:',
          quickReply: getProgramQuickReplies()
        }
      ]
    });
  }
}

/**
 * Handle Onboarding Wizard Text Inputs
 */
async function handleOnboardingText(
  lineUserId: string,
  text: string,
  currentStep: string,
  replyToken: string
) {
  const userRef = adminDb.collection('users').doc(lineUserId);

  if (currentStep === 'welcome') {
    await lineClient.replyMessage({
      replyToken,
      messages: [
        {
          type: 'text',
          text: '👋 ยินดีต้อนรับครับ! กรุณากดปุ่มด้านล่างเพื่อเริ่มตั้งค่าข้อมูลเป้าหมายของคุณครับ',
        },
        createOnboardingWelcomeFlexMessage()
      ]
    });
    return;
  }

  if (currentStep === 'gender') {
    const lower = text.toLowerCase();
    let gender: 'male' | 'female' | null = null;
    if (lower.includes('ชาย') || lower.includes('male') || lower === 'men' || lower === 'man' || lower === 'm') {
      gender = 'male';
    } else if (lower.includes('หญิง') || lower.includes('female') || lower === 'women' || lower === 'woman' || lower === 'w' || lower === 'f') {
      gender = 'female';
    }

    if (gender) {
      await userRef.update({ gender, setupStep: 'age', updatedAt: new Date() });
      await sendOnboardingStep(lineUserId, 'age', replyToken);
    } else {
      await lineClient.replyMessage({
        replyToken,
        messages: [
          {
            type: 'text',
            text: '⚠️ รูปแบบไม่ถูกต้อง! กรุณากดเลือกเพศ "ชาย" หรือ "หญิง" จากปุ่มตัวเลือกด่วนด้านล่างครับ',
            quickReply: getGenderQuickReplies()
          }
        ]
      });
    }
    return;
  }

  if (currentStep === 'age') {
    const val = parseInt(text.replace(/[^0-9]/g, ''));
    if (!isNaN(val) && val >= 10 && val <= 100) {
      await userRef.update({ age: val, setupStep: 'height', updatedAt: new Date() });
      await sendOnboardingStep(lineUserId, 'height', replyToken);
    } else {
      await lineClient.replyMessage({
        replyToken,
        messages: [
          {
            type: 'text',
            text: '⚠️ กรุณาพิมพ์อายุเป็นตัวเลขจำนวนเต็มระหว่าง 10 ถึง 100 (เช่น 25) หรือเลือกตัวเลือกด้านล่างครับ',
            quickReply: getAgeQuickReplies()
          }
        ]
      });
    }
    return;
  }

  if (currentStep === 'height') {
    const val = parseFloat(text.replace(/[^0-9.]/g, ''));
    if (!isNaN(val) && val >= 100 && val <= 250) {
      await userRef.update({ height: val, setupStep: 'weight', updatedAt: new Date() });
      await sendOnboardingStep(lineUserId, 'weight', replyToken);
    } else {
      await lineClient.replyMessage({
        replyToken,
        messages: [
          {
            type: 'text',
            text: '⚠️ กรุณาพิมพ์ส่วนสูงเป็นตัวเลขเซนติเมตรระหว่าง 100 ถึง 250 (เช่น 170) หรือเลือกตัวเลือกด้านล่างครับ',
            quickReply: getHeightQuickReplies()
          }
        ]
      });
    }
    return;
  }

  if (currentStep === 'weight') {
    const val = parseFloat(text.replace(/[^0-9.]/g, ''));
    if (!isNaN(val) && val >= 30 && val <= 300) {
      const todayStr = new Date().toISOString().split('T')[0];
      await userRef.collection('weightLogs').add({
        weight: val,
        date: todayStr,
        createdAt: new Date()
      });

      await userRef.update({ weight: val, setupStep: 'activity', updatedAt: new Date() });
      await sendOnboardingStep(lineUserId, 'activity', replyToken);
    } else {
      await lineClient.replyMessage({
        replyToken,
        messages: [
          {
            type: 'text',
            text: '⚠️ กรุณาพิมพ์น้ำหนักปัจจุบันเป็นตัวเลขกิโลกรัมระหว่าง 30 ถึง 300 (เช่น 68.5) หรือเลือกตัวเลือกด้านล่างครับ',
            quickReply: getWeightQuickReplies()
          }
        ]
      });
    }
    return;
  }

  if (currentStep === 'activity') {
    await lineClient.replyMessage({
      replyToken,
      messages: [
        {
          type: 'text',
          text: '⚠️ กรุณาเลือกระดับกิจกรรมจากตัวเลือกด้านล่างนี้ครับ',
          quickReply: getActivityQuickReplies()
        }
      ]
    });
    return;
  }

  if (currentStep === 'program') {
    await lineClient.replyMessage({
      replyToken,
      messages: [
        {
          type: 'text',
          text: '⚠️ กรุณาเลือกเป้าหมายสุขภาพจากตัวเลือกด้านล่างนี้ครับ',
          quickReply: getProgramQuickReplies()
        }
      ]
    });
    return;
  }
}

/**
 * Handle Onboarding Wizard Postback Events
 */
async function handleOnboardingPostback(
  lineUserId: string,
  action: string,
  value: string,
  replyToken: string,
  userProfile: UserProfile
) {
  const userRef = adminDb.collection('users').doc(lineUserId);

  if (action === 'setup_start') {
    await userRef.update({ setupStep: 'gender', updatedAt: new Date() });
    await sendOnboardingStep(lineUserId, 'gender', replyToken);
    return true;
  }

  if (action === 'setup_gender') {
    await userRef.update({ gender: value as UserProfile['gender'], setupStep: 'age', updatedAt: new Date() });
    await sendOnboardingStep(lineUserId, 'age', replyToken);
    return true;
  }

  if (action === 'setup_age') {
    const ageVal = parseInt(value);
    await userRef.update({ age: ageVal, setupStep: 'height', updatedAt: new Date() });
    await sendOnboardingStep(lineUserId, 'height', replyToken);
    return true;
  }

  if (action === 'setup_height') {
    const heightVal = parseFloat(value);
    await userRef.update({ height: heightVal, setupStep: 'weight', updatedAt: new Date() });
    await sendOnboardingStep(lineUserId, 'weight', replyToken);
    return true;
  }

  if (action === 'setup_weight') {
    const weightVal = parseFloat(value);
    const todayStr = new Date().toISOString().split('T')[0];
    await userRef.collection('weightLogs').add({
      weight: weightVal,
      date: todayStr,
      createdAt: new Date()
    });

    await userRef.update({ weight: weightVal, setupStep: 'activity', updatedAt: new Date() });
    await sendOnboardingStep(lineUserId, 'activity', replyToken);
    return true;
  }

  if (action === 'setup_activity') {
    await userRef.update({ activityLevel: value as UserProfile['activityLevel'], setupStep: 'program', updatedAt: new Date() });
    await sendOnboardingStep(lineUserId, 'program', replyToken);
    return true;
  }

  if (action === 'setup_program') {
    const updatedProfile = {
      ...userProfile,
      program: value,
      updatedAt: new Date()
    };

    const targets = calculateMacros(updatedProfile as unknown as UserProfileData);
    
    const finalProfile = {
      program: value,
      setupStep: 'completed',
      targetCalories: targets.calories,
      targetProtein: targets.protein,
      targetCarbs: targets.carbs,
      targetFat: targets.fat,
      updatedAt: new Date()
    };

    await userRef.update(finalProfile);

    const fullProfile = {
      ...userProfile,
      ...finalProfile
    };

    const completeMsg = createOnboardingCompleteFlexMessage(fullProfile);
    const followUpMsg = {
      type: 'text' as const,
      text: '🚀 แนะนำขั้นตอนถัดไป:\n1. 📸 ถ่ายรูปหรือส่งภาพอาหาร เข้ามาในแชตเพื่อบันทึกทันที\n2. ✍️ พิมพ์ชื่ออาหาร เพื่อให้ AI บันทึกด้วยข้อความ (เช่น "ข้าวมันไก่")\n3. 💬 พิมพ์คำว่า "เมนู" เพื่อเปิดเมนูหลักได้ทุกเมื่อ'
    };
    await lineClient.replyMessage({
      replyToken,
      messages: [completeMsg, followUpMsg]
    });
    return true;
  }

  return false;
}

/**
 * Handle Webhook Events POST request
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-line-signature') || '';

    // Verify LINE webhook signature
    if (!verifyLineSignature(rawBody, signature)) {
      console.warn('Invalid LINE webhook signature detected.');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { events } = JSON.parse(rawBody);
    if (!events || events.length === 0) {
      return NextResponse.json({ status: 'ok' });
    }

    // Process all events asynchronously
    for (const event of events) {
      const lineUserId = event.source.userId;
      if (!lineUserId) continue;

      // Handle message events
      if (event.type === 'message') {
        const { message, replyToken } = event;
        
        // 1. Fetch LINE user profile info
        let displayName = 'User';
        let pictureUrl = '';
        try {
          const profile = await lineClient.getProfile(lineUserId);
          displayName = profile.displayName;
          pictureUrl = profile.pictureUrl || '';
        } catch (e) {
          console.error('Failed to fetch LINE user profile:', e);
        }

        // Get/Create User in Firestore
        const userProfile = await getOrCreateUserProfile(lineUserId, displayName, pictureUrl);
        const targetCals = userProfile?.targetCalories || 2000;
        const currentStep = userProfile?.setupStep || 'completed';

        // Check for manual commands
        if (message.type === 'text') {
          const text = message.text.trim().toLowerCase();
          if (text === 'ตั้งค่า' || text === 'setup' || text === 'settings' || text === 'goal') {
            await adminDb.collection('users').doc(lineUserId).update({
              setupStep: 'welcome',
              updatedAt: new Date()
            });
            const welcomeMsg = createOnboardingWelcomeFlexMessage();
            await lineClient.replyMessage({
              replyToken,
              messages: [welcomeMsg]
            });
            continue;
          }
          
          if (text === 'เมนู' || text === 'menu' || text === 'information' || text === 'info') {
            const origin = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
            const menuMsg = createMainMenuFlexMessage(origin);
            await lineClient.replyMessage({
              replyToken,
              messages: [menuMsg]
            });
            continue;
          }

          if (text === 'สรุป' || text === 'summary' || text === 'calories') {
            await handleSummaryCommand(lineUserId, replyToken, req);
            continue;
          }
        }

        // Intercept inputs if setup is not completed
        if (currentStep !== 'completed') {
          if (message.type === 'image') {
            await lineClient.replyMessage({
              replyToken,
              messages: [
                {
                  type: 'text',
                  text: '⚠️ คุณกำลังอยู่ในขั้นตอนการตั้งค่าเป้าหมาย กรุณาทำรายการตั้งค่าข้อมูลส่วนตัวให้เสร็จสิ้นก่อนส่งรูปภาพอาหารครับ',
                }
              ]
            });
            await sendOnboardingStep(lineUserId, currentStep, replyToken);
          } else if (message.type === 'text') {
            await handleOnboardingText(lineUserId, message.text.trim(), currentStep, replyToken);
          }
          continue;
        }

        // A. Handle Image message (Food log request)
        if (message.type === 'image') {
          // Send thinking reply message first or download + process directly
          try {
            // Download image buffer from LINE Content API
            const imageBuffer = await getLineImageContent(message.id);
            
            // Analyze with Gemini
            const analysis = await analyzeFoodImage(imageBuffer, 'image/jpeg');

            // Save unconfirmed food log
            const logRef = adminDb
              .collection('users')
              .doc(lineUserId)
              .collection('foodLogs')
              .doc(); // Auto-ID

            const todayStr = new Date().toISOString().split('T')[0];

            await logRef.set({
              foodName: analysis.foodName,
              foodNameTh: analysis.foodNameTh,
              calories: analysis.calories,
              protein: analysis.protein,
              carbs: analysis.carbs,
              fat: analysis.fat,
              portionSize: analysis.portionSize,
              mealType: analysis.mealType,
              confirmed: false,
              date: todayStr,
              createdAt: new Date(),
            });

            // Get total calories today (excluding this unconfirmed one)
            const todayTotals = await getTodayCalories(lineUserId);

            // Construct Flex Message
            const flexMsg = createFoodFlexMessage(
              analysis,
              logRef.id,
              todayTotals.total,
              targetCals
            );

            // Reply to user
            await lineClient.replyMessage({
              replyToken,
              messages: [flexMsg],
            });
          } catch (error) {
            console.error('Error handling image message:', error);
            await lineClient.replyMessage({
              replyToken,
              messages: [
                {
                  type: 'text',
                  text: '❌ เกิดข้อผิดพลาดในการวิเคราะห์รูปอาหาร กรุณาลองใหม่อีกครั้งครับ',
                },
              ],
            });
          }
        }
        
        // B. Handle Text command
        else if (message.type === 'text') {
          const text = message.text.trim().toLowerCase();

          // Command: cal <calories> or แคล <calories>
          const calMatch = text.match(/^(แคล|cal)\s*(\d+)$/i);
          if (calMatch) {
            const newCals = parseInt(calMatch[2]);
            try {
              // Find all unconfirmed food logs for the user to find the latest
              const unconfirmedSnapshot = await adminDb
                .collection('users')
                .doc(lineUserId)
                .collection('foodLogs')
                .where('confirmed', '==', false)
                .get();

              if (!unconfirmedSnapshot.empty) {
                interface TempUnconfirmedDoc {
                  id: string;
                  ref: admin.firestore.DocumentReference<admin.firestore.DocumentData>;
                  data: admin.firestore.DocumentData;
                  createdAt: Date;
                }
                const docs: TempUnconfirmedDoc[] = [];
                unconfirmedSnapshot.forEach((doc) => {
                  const data = doc.data();
                  docs.push({
                    id: doc.id,
                    ref: doc.ref,
                    data,
                    createdAt: data.createdAt instanceof admin.firestore.Timestamp 
                      ? data.createdAt.toDate() 
                      : new Date(data.createdAt),
                  });
                });

                // Sort in memory by createdAt descending to get the latest
                docs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

                const latestDoc = docs[0];
                const logId = latestDoc.id;
                const logData = latestDoc.data;

                // Adjust macros proportionally
                const oldCals = logData.calories || 1;
                const ratio = newCals / oldCals;
                const updatedLog = {
                  calories: newCals,
                  protein: Math.round((logData.protein || 0) * ratio),
                  carbs: Math.round((logData.carbs || 0) * ratio),
                  fat: Math.round((logData.fat || 0) * ratio),
                  updatedAt: new Date(),
                };

                await latestDoc.ref.update(updatedLog);

                // Get today's totals (excluding this unconfirmed one)
                const todayTotals = await getTodayCalories(lineUserId);

                const analysisResult: FoodAnalysisResult = {
                  foodName: logData.foodName as string,
                  foodNameTh: logData.foodNameTh as string,
                  calories: updatedLog.calories,
                  protein: updatedLog.protein,
                  carbs: updatedLog.carbs,
                  fat: updatedLog.fat,
                  portionSize: logData.portionSize as string,
                  mealType: logData.mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
                };

                const flexMsg = createFoodFlexMessage(
                  analysisResult,
                  logId,
                  todayTotals.total,
                  targetCals
                );

                await lineClient.replyMessage({
                  replyToken,
                  messages: [
                    {
                      type: 'text',
                      text: `✏️ ปรับแคลอรี่เป็น ${newCals} kcal เรียบร้อยครับ!`,
                    },
                    flexMsg,
                  ],
                });
              } else {
                await lineClient.replyMessage({
                  replyToken,
                  messages: [
                    {
                      type: 'text',
                      text: '⚠️ ไม่พบรายการอาหารที่รอยืนยันเพื่อทำการแก้ไขครับ (กรุณาส่งรูปถ่ายอาหารก่อน)',
                    },
                  ],
                });
              }
            } catch (e) {
              console.error('Error adjusting calories via bot:', e);
              await lineClient.replyMessage({
                replyToken,
                messages: [
                  {
                    type: 'text',
                    text: '❌ เกิดข้อผิดพลาดในการแก้ไขแคลอรี่',
                  },
                ],
              });
            }
            continue;
          }

          // Command: น้ำหนัก <กก.> / weight <kg>
          if (text.startsWith('น้ำหนัก') || text.startsWith('weight')) {
            const numStr = text.replace(/[^0-9.]/g, '');
            const weightVal = parseFloat(numStr);

            if (isNaN(weightVal) || weightVal <= 0) {
              await lineClient.replyMessage({
                replyToken,
                messages: [
                  {
                    type: 'text',
                    text: '⚠️ รูปแบบไม่ถูกต้อง! กรุณาพิมพ์เช่น "น้ำหนัก 68" หรือ "weight 72.5"',
                  },
                ],
              });
              continue;
            }

            try {
              const todayStr = new Date().toISOString().split('T')[0];

              // Save to weight logs
              await adminDb
                .collection('users')
                .doc(lineUserId)
                .collection('weightLogs')
                .add({
                  weight: weightVal,
                  date: todayStr,
                  createdAt: new Date(),
                });

              // Update user profile weight & recalculate targets
              const userRef = adminDb.collection('users').doc(lineUserId);
              const userDoc = await userRef.get();
              
              if (userDoc.exists) {
                const profile = userDoc.data() as UserProfile;
                const updatedProfile: UserProfile = {
                  ...profile,
                  weight: weightVal,
                  updatedAt: new Date(),
                };

                const newTargets = calculateMacros(updatedProfile);

                await userRef.update({
                  weight: weightVal,
                  targetCalories: newTargets.calories,
                  targetProtein: newTargets.protein,
                  targetCarbs: newTargets.carbs,
                  targetFat: newTargets.fat,
                  updatedAt: new Date(),
                });

                await lineClient.replyMessage({
                  replyToken,
                  messages: [
                    {
                      type: 'text',
                      text: `⚖️ บันทึกน้ำหนัก ${weightVal} กก. สำเร็จ!\n🎯 คำนวณเป้าหมายใหม่:\n🔥 พลังงาน: ${newTargets.calories} kcal\n🥩 โปรตีน: ${newTargets.protein}g\n🍚 คาร์บ: ${newTargets.carbs}g\n🧈 ไขมัน: ${newTargets.fat}g`,
                    },
                  ],
                });
              }
            } catch (e) {
              console.error('Error logging weight via bot:', e);
              await lineClient.replyMessage({
                replyToken,
                messages: [
                  {
                    type: 'text',
                    text: '❌ เกิดข้อผิดพลาดในการบันทึกน้ำหนัก กรุณาลองอีกครั้งครับ',
                  },
                ],
              });
            }
          } 
          
          // Default Help Command
          else {
            const locale = userProfile?.language || 'th';
            const welcomeText = locale === 'th' 
              ? `สวัสดีครับคุณ ${displayName}! ยินดีต้อนรับสู่ CalMe 🥑\n\nวิธีใช้งานบอท:\n1. 📸 ถ่ายรูปอาหารแล้วส่งให้บอทเพื่อวิเคราะห์แคลอรี่\n2. 📊 พิมพ์ "สรุป" เพื่อดูแคลอรี่และสารอาหารสะสมวันนี้\n3. ⚖️ พิมพ์ "น้ำหนัก <ตัวเลข>" เพื่อบันทึกน้ำหนักตัว (เช่น น้ำหนัก 70)\n4. ✏️ พิมพ์ "แคล <ตัวเลข>" เพื่อแก้ไขแคลอรี่ของเมนูล่าสุดที่รอยืนยัน (เช่น แคล 450)\n\nสามารถเปิดดูประวัติและตั้งค่าเป้าหมายเพิ่มเติมได้ที่เว็ปไซต์ CalMe ครับ!`
              : `Hello ${displayName}! Welcome to CalMe 🥑\n\nHow to use:\n1. 📸 Send a food photo to analyze calories and macros.\n2. 📊 Type "summary" to check today's accumulated intake.\n3. ⚖️ Type "weight <number>" to log your weight (e.g., weight 70).\n4. ✏️ Type "cal <number>" to adjust calories of the latest unconfirmed food item (e.g. cal 450).\n\nManage goals and check history details on our Web Dashboard!`;

            await lineClient.replyMessage({
              replyToken,
              messages: [
                {
                  type: 'text',
                  text: welcomeText,
                },
              ],
            });
          }
        }
      }

      // Handle postback events (from buttons)
      else if (event.type === 'postback') {
        const { replyToken, postback } = event;
        const params = new URLSearchParams(postback.data);
        const action = params.get('action') || '';
        const logId = params.get('logId');
        const value = params.get('value') || '';

        // Intercept onboarding postbacks (actions starting with 'setup_')
        if (action.startsWith('setup_')) {
          let displayName = 'User';
          let pictureUrl = '';
          try {
            const profile = await lineClient.getProfile(lineUserId);
            displayName = profile.displayName;
            pictureUrl = profile.pictureUrl || '';
          } catch (e) {
            console.error('Failed to fetch LINE user profile in postback:', e);
          }
          const userProfile = await getOrCreateUserProfile(lineUserId, displayName, pictureUrl);
          await handleOnboardingPostback(lineUserId, action, value, replyToken, userProfile);
          continue;
        }

        // Intercept general action triggers
        if (action === 'summary_trigger') {
          await handleSummaryCommand(lineUserId, replyToken, req);
          continue;
        }

        if (action === 'log_weight_prompt') {
          await lineClient.replyMessage({
            replyToken,
            messages: [
              {
                type: 'text',
                text: '⚖️ กรุณาพิมพ์น้ำหนักปัจจุบันของคุณ เช่น "น้ำหนัก 68" หรือ "weight 72.5" ส่งในห้องแชตนี้ เพื่อบันทึกและคำนวณเป้าหมายแคลอรี่ใหม่ครับ',
              },
            ],
          });
          continue;
        }

        if (action === 'show_help_capture') {
          await lineClient.replyMessage({
            replyToken,
            messages: [
              {
                type: 'text',
                text: '📸 คุณสามารถถ่ายรูปอาหารมื้อนี้ หรืออัปโหลดรูปภาพอาหารจากแกลเลอรีส่งเข้ามาในห้องแชตนี้ได้ทันที เพื่อให้ AI ช่วยคำนวณแคลอรี่และสารอาหารให้ครับ!',
              },
            ],
          });
          continue;
        }

        if (!logId) continue;

        const logRef = adminDb
          .collection('users')
          .doc(lineUserId)
          .collection('foodLogs')
          .doc(logId);

        if (action === 'confirm') {
          try {
            await logRef.update({
              confirmed: true,
            });

            // Recalculate today totals
            const totals = await getTodayCalories(lineUserId);
            const userDoc = await adminDb.collection('users').doc(lineUserId).get();
            const targetCals = userDoc.data()?.targetCalories || 2000;

            const confirmReply = `✅ บันทึกเมนูอาหารเรียบร้อยครับ!\n\n📊 วันนี้สะสมแล้ว: ${totals.total} / ${targetCals} kcal\nเหลืออีก: ${Math.max(0, targetCals - totals.total)} kcal`;

            await lineClient.replyMessage({
              replyToken,
              messages: [
                {
                  type: 'text',
                  text: confirmReply,
                },
              ],
            });
          } catch (e) {
            console.error('Error confirming log via bot:', e);
            await lineClient.replyMessage({
              replyToken,
              messages: [
                {
                  type: 'text',
                  text: '❌ เกิดข้อผิดพลาดในการยืนยันรายการอาหาร',
                },
              ],
            });
          }
        } 
        
        else if (action === 'delete') {
          try {
            await logRef.delete();
            await lineClient.replyMessage({
              replyToken,
              messages: [
                {
                  type: 'text',
                  text: '🗑️ ลบรายการอาหารมื้อนี้เรียบร้อยแล้วครับ',
                },
              ],
            });
          } catch (e) {
            console.error('Error deleting log via bot:', e);
            await lineClient.replyMessage({
              replyToken,
              messages: [
                {
                  type: 'text',
                  text: '❌ เกิดข้อผิดพลาดในการลบรายการอาหาร',
                },
              ],
            });
          }
        }
        
        else if (action === 'edit') {
          try {
            const logDoc = await logRef.get();
            if (logDoc.exists) {
              const logData = logDoc.data();
              const editMenuMsg = createEditMenuFlexMessage(logId, logData?.foodNameTh || logData?.foodName || 'อาหาร');
              await lineClient.replyMessage({
                replyToken,
                messages: [editMenuMsg],
              });
            } else {
              await lineClient.replyMessage({
                replyToken,
                messages: [
                  {
                    type: 'text',
                    text: '⚠️ ไม่พบรายการอาหารนี้ในระบบครับ',
                  },
                ],
              });
            }
          } catch (e) {
            console.error('Error generating edit menu via bot:', e);
          }
        }

        else if (action === 'change_meal_select') {
          try {
            await lineClient.replyMessage({
              replyToken,
              messages: [
                {
                  type: 'text' as const,
                  text: '🍳 กรุณาเลือกประเภทมื้ออาหารที่ต้องการเปลี่ยน:',
                  quickReply: {
                    items: [
                      {
                        type: 'action' as const,
                        action: {
                          type: 'postback' as const,
                          label: '🍳 เช้า',
                          data: `action=set_meal&meal=breakfast&logId=${logId}`,
                          displayText: 'เลือกประเภทมื้อ: มื้อเช้า'
                        }
                      },
                      {
                        type: 'action' as const,
                        action: {
                          type: 'postback' as const,
                          label: '🍱 กลางวัน',
                          data: `action=set_meal&meal=lunch&logId=${logId}`,
                          displayText: 'เลือกประเภทมื้อ: มื้อกลางวัน'
                        }
                      },
                      {
                        type: 'action' as const,
                        action: {
                          type: 'postback' as const,
                          label: '🍛 เย็น',
                          data: `action=set_meal&meal=dinner&logId=${logId}`,
                          displayText: 'เลือกประเภทมื้อ: มื้อเย็น'
                        }
                      },
                      {
                        type: 'action' as const,
                        action: {
                          type: 'postback' as const,
                          label: '🍎 มื้อว่าง',
                          data: `action=set_meal&meal=snack&logId=${logId}`,
                          displayText: 'เลือกประเภทมื้อ: มื้อว่าง'
                        }
                      }
                    ]
                  }
                }
              ]
            });
          } catch (e) {
            console.error('Error sending change meal select:', e);
          }
        }

        else if (action === 'change_portion_select') {
          try {
            await lineClient.replyMessage({
              replyToken,
              messages: [
                {
                  type: 'text' as const,
                  text: '⚖️ กรุณาเลือกสัดส่วนปริมาณอาหารที่รับประทานจริง:',
                  quickReply: {
                    items: [
                      {
                        type: 'action' as const,
                        action: {
                          type: 'postback' as const,
                          label: '½ ส่วน (ครึ่งเดียว)',
                          data: `action=set_portion&ratio=0.5&label=0.5 portion&logId=${logId}`,
                          displayText: 'ปรับสัดส่วน: ครึ่งส่วน'
                        }
                      },
                      {
                        type: 'action' as const,
                        action: {
                          type: 'postback' as const,
                          label: '1 ส่วน (ปกติ)',
                          data: `action=set_portion&ratio=1.0&label=1 portion&logId=${logId}`,
                          displayText: 'ปรับสัดส่วน: ขนาดปกติ'
                        }
                      },
                      {
                        type: 'action' as const,
                        action: {
                          type: 'postback' as const,
                          label: '1.5 ส่วน (พิเศษ/จานใหญ่)',
                          data: `action=set_portion&ratio=1.5&label=1.5 portions&logId=${logId}`,
                          displayText: 'ปรับสัดส่วน: พิเศษ/จานใหญ่'
                        }
                      },
                      {
                        type: 'action' as const,
                        action: {
                          type: 'postback' as const,
                          label: '2 ส่วน (จานเบิ้ล)',
                          data: `action=set_portion&ratio=2.0&label=2 portions&logId=${logId}`,
                          displayText: 'ปรับสัดส่วน: สองส่วน'
                        }
                      }
                    ]
                  }
                }
              ]
            });
          } catch (e) {
            console.error('Error sending change portion select:', e);
          }
        }

        else if (action === 'change_cal_select') {
          try {
            await lineClient.replyMessage({
              replyToken,
              messages: [
                {
                  type: 'text',
                  text: '🔥 พิมพ์ "แคล [ตัวเลข]" (เช่น แคล 450) ส่งในห้องแชตนี้เพื่อปรับเปลี่ยนปริมาณแคลอรี่ของเมนูนี้ได้ทันทีครับ',
                }
              ]
            });
          } catch (e) {
            console.error('Error sending change cal select:', e);
          }
        }

        else if (action === 'set_meal') {
          const mealType = (params.get('meal') || 'snack') as 'breakfast' | 'lunch' | 'dinner' | 'snack';
          try {
            await logRef.update({
              mealType,
              updatedAt: new Date(),
            });

            const logDoc = await logRef.get();
            const logData = logDoc.data();
            if (!logData) {
              throw new Error('Log data not found');
            }
            const todayTotals = await getTodayCalories(lineUserId);
            const userDoc = await adminDb.collection('users').doc(lineUserId).get();
            const targetCals = userDoc.data()?.targetCalories || 2000;

            const mealNames = {
              breakfast: 'มื้อเช้า',
              lunch: 'มื้อกลางวัน',
              dinner: 'มื้อเย็น',
              snack: 'มื้อว่าง',
            };
            const mealName = mealNames[mealType as keyof typeof mealNames] || mealType;

            const flexMsg = createFoodFlexMessage(
              logData as unknown as FoodAnalysisResult,
              logId,
              todayTotals.total,
              targetCals
            );

            await lineClient.replyMessage({
              replyToken,
              messages: [
                {
                  type: 'text',
                  text: `🍳 เปลี่ยนมื้ออาหารเป็น [${mealName}] สำเร็จ!`,
                },
                flexMsg,
              ],
            });
          } catch (e) {
            console.error('Error updating mealType:', e);
          }
        }

        else if (action === 'set_portion') {
          const ratio = parseFloat(params.get('ratio') || '1.0');
          const portionLabel = params.get('label') || '1 portion';

          try {
            const logDoc = await logRef.get();
            if (logDoc.exists) {
              const logData = logDoc.data()!;
              
              const baseCals = logData.baseCalories || logData.calories;
              const baseProt = logData.baseProtein || logData.protein;
              const baseCarb = logData.baseCarbs || logData.carbs;
              const baseFat = logData.baseFat || logData.fat;

              const updatedLog = {
                calories: Math.round(baseCals * ratio),
                protein: Math.round(baseProt * ratio),
                carbs: Math.round(baseCarb * ratio),
                fat: Math.round(baseFat * ratio),
                portionSize: portionLabel,
                baseCalories: baseCals,
                baseProtein: baseProt,
                baseCarbs: baseCarb,
                baseFat: baseFat,
                updatedAt: new Date(),
              };

              await logRef.update(updatedLog);

              const todayTotals = await getTodayCalories(lineUserId);
              const userDoc = await adminDb.collection('users').doc(lineUserId).get();
              const targetCals = userDoc.data()?.targetCalories || 2000;

              const flexMsg = createFoodFlexMessage(
                {
                  ...logData,
                  ...updatedLog,
                } as unknown as FoodAnalysisResult,
                logId,
                todayTotals.total,
                targetCals
              );

              await lineClient.replyMessage({
                replyToken,
                messages: [
                  {
                    type: 'text',
                    text: `⚖️ ปรับสัดส่วนปริมาณอาหารเป็น [${portionLabel}] สำเร็จ!`,
                  },
                  flexMsg,
                ],
              });
            }
          } catch (e) {
            console.error('Error updating portion size:', e);
          }
        }
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
