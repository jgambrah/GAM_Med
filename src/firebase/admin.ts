import * as admin from 'firebase-admin';

/**
 * == Build-Safe Firebase Admin Provider ==
 * 
 * This module ensures the Admin SDK is initialized only when needed (Lazy Init).
 * This prevents crashes during build-time static analysis on platforms like Vercel,
 * where environment variables might not be present until runtime.
 */

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

function initializeAdmin() {
  if (admin.apps.length) return admin.apps[0];

  if (!projectId || !clientEmail || !privateKey) {
    // Only warn during runtime, ignore during build
    if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
      console.warn("Firebase Admin SDK: Initialization skipped. Required environment variables are missing.");
    }
    return null;
  }

  try {
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error: any) {
    console.error('Firebase Admin Initialization Error:', error.stack);
    return null;
  }
}

/**
 * Provides access to Firestore with lazy-loading.
 * Prevents "default app does not exist" errors during build time.
 */
export const getAdminDb = () => {
  const app = initializeAdmin();
  if (!app) return null as unknown as admin.firestore.Firestore;
  return admin.firestore();
};

/**
 * Provides access to Auth with lazy-loading.
 */
export const getAdminAuth = () => {
  const app = initializeAdmin();
  if (!app) return null as unknown as admin.auth.Auth;
  return admin.auth();
};

// Legacy exports for compatibility (will return null if not initialized)
export const adminDb = getAdminDb();
export const adminAuth = getAdminAuth();
