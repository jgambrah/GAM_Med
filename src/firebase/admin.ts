import * as admin from 'firebase-admin';

/**
 * == Firebase Admin Singleton ==
 * 
 * Provides secure server-side access to Firebase services.
 * Resilience: Checks for presence of environment variables to prevent build-time crashes.
 */

const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
  // Only initialize if all required keys are present.
  // This prevents build errors on Vercel if keys aren't set in the build environment.
  if (firebaseAdminConfig.projectId && firebaseAdminConfig.clientEmail && firebaseAdminConfig.privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert(firebaseAdminConfig),
      databaseURL: `https://${firebaseAdminConfig.projectId}.firebaseio.com`,
    });
  } else {
    // Log a warning if we are in production but keys are missing
    if (process.env.NODE_ENV === 'production') {
      console.warn("Firebase Admin SDK not initialized: Missing environment variables.");
    }
  }
}

export const adminDb = admin.apps.length ? admin.firestore() : null as any;
export const adminAuth = admin.apps.length ? admin.auth() : null as any;
