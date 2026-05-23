import * as admin from 'firebase-admin';

const initializeAdmin = () => {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  // Handle newlines in private key, which can happen with Vercel deployment variables
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY 
    ? process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n') 
    : undefined;

  const hasRealCert = 
    projectId && !projectId.includes('your_') &&
    clientEmail && !clientEmail.includes('your_') &&
    privateKey && privateKey.includes('-----BEGIN PRIVATE KEY-----');

  if (hasRealCert) {
    try {
      return admin.initializeApp({
        credential: admin.credential.cert({
          projectId: projectId!,
          clientEmail: clientEmail!,
          privateKey: privateKey!,
        }),
      });
    } catch (error) {
      console.error('Firebase Admin cert initialization error:', error);
    }
  }

  // Fallback for build time if credentials are not configured yet
  try {
    return admin.initializeApp({
      projectId: projectId || 'calme-placeholder-id',
    });
  } catch (error) {
    console.error('Firebase Admin fallback initialization error:', error);
    return admin.app();
  }
};

const adminApp = initializeAdmin();
const adminDb = admin.firestore(adminApp);
const adminAuth = admin.auth(adminApp);

export { adminApp, adminDb, adminAuth };
export default adminApp;
