import * as admin from 'firebase-admin';

/**
 * == Robust Firebase Admin Singleton ==
 * 
 * Ensures the Admin SDK is initialized only once using environment variables.
 * Handles private key newline formatting required for Vercel deployment.
 * Prevents initialization crashes during build-time static analysis.
 */

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!admin.apps.length) {
  // Only attempt initialization if the required environment variables are present.
  // This prevents crashes during Vercel's static analysis/build phase.
  if (projectId && clientEmail && privateKey) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
      console.log('Firebase Admin Initialized Successfully');
    } catch (error: any) {
      console.error('Firebase Admin Initialization Error:', error.stack);
    }
  } else {
    // Graceful fallback for non-production or build-time environments
    if (process.env.NODE_ENV === 'production') {
      console.warn("Firebase Admin SDK: Initialization skipped. Required environment variables (PROJECT_ID, CLIENT_EMAIL, PRIVATE_KEY) are missing.");
    }
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
