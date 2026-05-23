const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\Administrator\\.gemini\\antigravity\\brain\\b32dd03e-d092-4b53-a8e6-169cbe5ba2a1';
const WORKSPACE_DIR = 'd:\\Dev\\CalMe\\scratch';

// Ensure directories exist
if (!fs.existsSync(WORKSPACE_DIR)) {
  fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
}
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

function seedDatabase() {
  const dbPath = path.join(WORKSPACE_DIR, 'db.json');
  let db = {};
  if (fs.existsSync(dbPath)) {
    try {
      db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch (e) {
      db = {};
    }
  }

  // Ensure users.test-user exists
  if (!db.users) db.users = {};
  
  const today = new Date();
  const getOffsetDateStr = (offset) => {
    const d = new Date();
    d.setDate(today.getDate() - offset);
    return d.toISOString().split('T')[0];
  };

  const todayStr = getOffsetDateStr(0);
  const yesterdayStr = getOffsetDateStr(1);
  const twoDaysAgoStr = getOffsetDateStr(2);
  const threeDaysAgoStr = getOffsetDateStr(3);

  db.users['test-user'] = {
    displayName: 'Test User',
    pictureUrl: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
    weight: 70,
    height: 170,
    age: 25,
    gender: 'male',
    activityLevel: 'moderate',
    program: 'build_muscle',
    language: 'th',
    updatedAt: new Date().toISOString(),
    targetCalories: 2846,
    targetProtein: 249,
    targetCarbs: 320,
    targetFat: 63,
    weightLogs: {
      'w1': { weight: 71.5, date: threeDaysAgoStr, createdAt: new Date(threeDaysAgoStr).toISOString() },
      'w2': { weight: 71.0, date: twoDaysAgoStr, createdAt: new Date(twoDaysAgoStr).toISOString() },
      'w3': { weight: 70.5, date: yesterdayStr, createdAt: new Date(yesterdayStr).toISOString() },
      'w4': { weight: 70.0, date: todayStr, createdAt: new Date(todayStr).toISOString() }
    },
    foodLogs: {
      'f1': {
        foodName: 'ข้าวผัดปู',
        foodNameTh: 'ข้าวผัดปู',
        calories: 550,
        protein: 18,
        carbs: 75,
        fat: 16,
        portionSize: '1 จาน',
        mealType: 'lunch',
        confirmed: true,
        imageUrl: '',
        date: todayStr,
        createdAt: new Date().toISOString()
      },
      'f2': {
        foodName: 'ข้าวกะเพราไก่ไข่ดาว',
        foodNameTh: 'ข้าวกะเพราไก่ไข่ดาว',
        calories: 620,
        protein: 32,
        carbs: 80,
        fat: 18,
        portionSize: '1 จาน',
        mealType: 'dinner',
        confirmed: true,
        imageUrl: '',
        date: todayStr,
        createdAt: new Date().toISOString()
      },
      'f3': {
        foodName: 'เวย์โปรตีน',
        foodNameTh: 'เวย์โปรตีน',
        calories: 140,
        protein: 26,
        carbs: 3,
        fat: 2,
        portionSize: '1 สกู๊ป',
        mealType: 'snack',
        confirmed: true,
        imageUrl: '',
        date: todayStr,
        createdAt: new Date().toISOString()
      },
      'f_y1': {
        foodName: 'ข้าวมันไก่',
        foodNameTh: 'ข้าวมันไก่',
        calories: 650,
        protein: 24,
        carbs: 85,
        fat: 22,
        portionSize: '1 จาน',
        mealType: 'lunch',
        confirmed: true,
        imageUrl: '',
        date: yesterdayStr,
        createdAt: new Date(yesterdayStr).toISOString()
      },
      'f_y2': {
        foodName: 'สลัดอกไก่',
        foodNameTh: 'สลัดอกไก่',
        calories: 320,
        protein: 28,
        carbs: 12,
        fat: 10,
        portionSize: '1 ชาม',
        mealType: 'dinner',
        confirmed: true,
        imageUrl: '',
        date: yesterdayStr,
        createdAt: new Date(yesterdayStr).toISOString()
      },
      'f_2d1': {
        foodName: 'ก๋วยเตี๋ยวเส้นเล็กต้มยำ',
        foodNameTh: 'ก๋วยเตี๋ยวเส้นเล็กต้มยำ',
        calories: 450,
        protein: 15,
        carbs: 55,
        fat: 12,
        portionSize: '1 ชาม',
        mealType: 'lunch',
        confirmed: true,
        imageUrl: '',
        date: twoDaysAgoStr,
        createdAt: new Date(twoDaysAgoStr).toISOString()
      }
    }
  };

  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  console.log('Seeded database successfully.');
}

async function run() {
  // Seed the mock database before running test
  seedDatabase();

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  // Helper to capture screenshots in both viewports
  async function capture(pageName, url) {
    // 1. Mobile viewport
    console.log(`Visiting ${url} (Mobile)...`);
    await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
    await page.goto(url, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000)); // wait for transitions/animations
    
    let mobilePath = path.join(ARTIFACT_DIR, `${pageName}_mobile.png`);
    await page.screenshot({ path: mobilePath, fullPage: false });
    console.log(`Saved mobile screenshot to ${mobilePath}`);
    
    // Copy to workspace too
    fs.copyFileSync(mobilePath, path.join(WORKSPACE_DIR, `${pageName}_mobile.png`));

    // 2. Desktop viewport
    console.log(`Visiting ${url} (Desktop)...`);
    await page.setViewport({ width: 1280, height: 1024, isMobile: false, hasTouch: false });
    await page.goto(url, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    
    let desktopPath = path.join(ARTIFACT_DIR, `${pageName}_desktop.png`);
    await page.screenshot({ path: desktopPath, fullPage: false });
    console.log(`Saved desktop screenshot to ${desktopPath}`);
    
    // Copy to workspace too
    fs.copyFileSync(desktopPath, path.join(WORKSPACE_DIR, `${pageName}_desktop.png`));
  }

  try {
    const devUser = 'test-user';
    const baseUrl = 'http://localhost:3000';

    // 1. Visit Landing Page (unauthenticated)
    await capture('landing', baseUrl);

    // 2. Visit Profile page
    console.log('Visiting Profile page...');
    await capture('profile', `${baseUrl}/profile?devUserId=${devUser}`);

    // 3. Visit Dashboard
    console.log('Visiting Dashboard...');
    await capture('dashboard', `${baseUrl}/dashboard?devUserId=${devUser}`);

    // 4. Visit History Page
    console.log('Visiting History page...');
    await capture('history', `${baseUrl}/history?devUserId=${devUser}`);

    console.log('Done capturing screenshots!');

  } catch (error) {
    console.error('Error during test-ui script:', error);
  } finally {
    await browser.close();
  }
}

run();
