import * as admin from 'firebase-admin';

/**
 * == Build-Safe Firebase Admin Singleton ==
 * 
 * Provides secure server-side access to Firebase services.
 * Resilience: Performs a conditional check for required credentials to prevent crashes 
 * during Next.js static page generation (Collecting page data phase) on Vercel.
 */

const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
  // Only initialize if the required project_id is present.
  // This satisfies the Vercel build worker requirements for static export.
  if (firebaseAdminConfig.projectId && firebaseAdminConfig.clientEmail && firebaseAdminConfig.privateKey) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(firebaseAdminConfig),
            databaseURL: `https://${firebaseAdminConfig.projectId}.firebaseio.com`,
        });
    } catch (error) {
        console.error("Firebase Admin initialization failed at runtime:", error);
    }
  } else {
    // Log a warning in development, but avoid crashing the build worker
    if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
      console.warn("Firebase Admin SDK not initialized: Missing project_id environment variable.");
    }
  }
}

export const adminDb = admin.apps.length ? admin.firestore() : null as any;
export const adminAuth = admin.apps.length ? admin.auth() : null as any;
