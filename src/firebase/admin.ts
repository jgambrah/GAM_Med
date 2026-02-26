import * as admin from 'firebase-admin';

/**
 * == Build-Safe Firebase Admin Provider ==
 * 
 * This module handles the initialization of the Firebase Admin SDK using a single
 * environment variable containing the service account JSON. It uses lazy initialization
 * to prevent build-time crashes during Vercel's static analysis.
 */

function initializeAdmin() {
  if (admin.apps.length > 0) return admin.apps[0];

  const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!serviceAccountVar) {
    if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
      console.warn("Firebase Admin SDK: FIREBASE_SERVICE_ACCOUNT is missing.");
    }
    return null;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountVar);
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey: serviceAccount.private_key.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error: any) {
    console.error('Firebase Admin Initialization Error:', error.message);
    return null;
  }
}

/**
 * Provides access to Firestore with lazy-loading.
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
