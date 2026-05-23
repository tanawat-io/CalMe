# CalMe 🥑 — AI Calorie Tracker & LINE Bot

CalMe is a premium, modern AI-powered calorie tracking application integrated seamlessly with a LINE Bot webhook and a responsive Next.js web dashboard. It allows users to track their daily calories and macronutrients instantly by taking food photos or chatting within LINE, while visualizing their TDEE progress, macro rings, calendar history, and weight progression on the web.

---

## 🚀 Key Advantages & Features

### 1. Conversational Onboarding Setup Wizard (LINE)
- **Automatic TDEE & BMR Calculation**: Calculates metabolic rates automatically using the Mifflin-St Jeor formula based on user metrics (Gender, Age, Height, Weight, Activity Level, and Goal Program).
- **Interactive Conversational Flow**: Guides users step-by-step using custom LINE Quick Replies and numeric inputs directly in the chat.
- **Auto-Calculated Macronutrient Budgets**: Automatically derives daily Protein, Carbohydrate, and Fat allowances tailored to the user's selected fitness goals.

### 2. AI food Analysis (Gemini API)
- **Image-to-Log Analysis**: Send a picture of a meal in LINE, and Gemini automatically identifies the food name, estimates portion sizes, and outputs calculated calories, protein, carbs, and fat.
- **Confirm & Edit UI**: Users receive a custom Flex confirmation card containing action buttons:
  - **Confirm**: Logs the food into their daily budget.
  - **Delete**: Discards the entry.
  - **Edit**: Adjusts portions, switches meal types (Breakfast, Lunch, Dinner, Snack), or overrides calories.

### 3. Interactive Flex Main Menu
- Mapped dynamically to custom LINE Rich Menu buttons with vibrant, user-friendly colors for high contrast and modern aesthetics:
  - 📊 **สรุปการกินวันนี้** (Vibrant Green) — Triggers today's detailed calorie summary Flex card.
  - ⚖️ **บันทึกน้ำหนักตัว** (Vibrant Blue) — Prompts users to log their weight, updating body records and recalculating daily macro budgets.
  - 📅 **ดูประวัติอาหารย้อนหลัง** (Vibrant Orange) — Direct link to the historical food log explorer on the web.
  - ⚙️ **ตั้งค่าเป้าหมายใหม่** (Vibrant Purple) — Resets onboarding wizard and restarts body metrics configuration.
  - 🌐 **เปิดดูหน้าเว็บแดชบอร์ด** (Vibrant Link) — Opens the main statistics web dashboard.

### 4. Responsive Web Dashboard (Next.js)
- **Calorie Rings & Macro Bars**: Animated indicators showing remaining calories and macro progression.
- **Calendar History Explorer**: Date-specific calendar logging to view, edit, or delete past meals.
- **Interactive Weight Charts**: Track TDEE, BMR, and historical weight check-ins.
- **LINE OAuth login**: Secure login flow using LINE Login SDK to align the web account with the bot user profile.

---

## 🛠️ Tech Stack & Architecture
- **Framework**: Next.js 15 (App Router, Server Actions, API Routes)
- **Styling**: Premium Vanilla CSS (Curated HSL color palette, sleeks dark modes, and smooth CSS animations)
- **Database**: Google Firebase Firestore (administered via Server SDK for webhooks and Client SDK for dashboard state)
- **AI Engine**: Google Gemini Pro & Gemini Flash API (Multimodal food analysis)
- **Bot Engine**: LINE Messaging API SDK & Quick Reply Postbacks

---

## ⚙️ Configuration & Setup Guide

Follow these steps to set up CalMe locally:

### 1. Prerequisites
- **Node.js** (v18.0.0 or higher)
- **Firebase Project** (with Firestore database initialized)
- **LINE Official Account (OA)** & **LINE Login Channel** (via [LINE Developers Console](https://developers.line.biz))
- **Google AI Studio API Key** (for Gemini)
- **ngrok** (for local webhook tunneling)

### 2. Environment Variables Configuration
Create a `.env.local` file in the root directory and configure the following variables:

```bash
# LINE Bot & Login Configurations
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
LINE_CHANNEL_SECRET=your_line_channel_secret
LINE_LOGIN_CHANNEL_ID=your_line_login_channel_id
LINE_LOGIN_CHANNEL_SECRET=your_line_login_channel_secret

# Gemini API (Google AI Studio)
GEMINI_API_KEY=your_gemini_api_key

# Firebase Client SDK Credentials (from Firebase Project Console Settings)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id

# Firebase Admin SDK Credentials (for Server-side API / Webhooks)
FIREBASE_ADMIN_PROJECT_ID=your_firebase_admin_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=your_firebase_admin_client_email
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key_lines\n-----END PRIVATE KEY-----\n"
```

### 3. Setting Up Webhooks (Local Testing)
To receive messages and images sent to your LINE Bot locally, expose your local server using **ngrok**:

1. Start your local Next.js server:
   ```bash
   npm run dev
   ```
2. In a separate terminal, start the ngrok tunnel on port `3000`:
   ```bash
   ngrok http 3000
   ```
3. Copy the secure HTTPS URL provided by ngrok (e.g. `https://xxxx.ngrok-free.app`).
4. Go to **LINE Developers Console** ➔ **Messaging API Settings** ➔ **Webhook URL**.
5. Paste the URL and append the webhook path:
   ```text
   https://xxxx.ngrok-free.app/api/line/webhook
   ```
6. Click **Verify** to test connection, and toggle **Use Webhook** to **ON**.

### 4. Rich Menu Action Layout Setup
To match the mapped webhook events, design a **2x2 grid layout** for your Rich Menu inside the **LINE Official Account Manager** (under **Chat items** ➔ **Rich menus**):

- **Image Dimensions**: Recommend uploading `rich_menu_button_2500x1686.png` located under `C:\Users\Administrator\.gemini\antigravity\brain\b32dd03e-d092-4b53-a8e6-169cbe5ba2a1\rich_menu_button_2500x1686.png`.
- **Button Mappings**:
  - **Button A (Top Left)**: Action: `Text`, value: `Calories` (displays daily summary)
  - **Button B (Top Right)**: Action: `Text`, value: `information` (displays main menu)
  - **Button C (Bottom Left)**: Action: `Text`, value: `Goal` (starts target config onboarding wizard)
  - **Button D (Bottom Right)**: Action: `Link`, value: `https://xxxx.ngrok-free.app/dashboard` (opens web app dashboard)

---

## 🏃 Running the Application

### Development Server
```bash
npm run dev
```

### Production Build
Check TypeScript and compile:
```bash
npx tsc --noEmit
npm run build
npm start
```
