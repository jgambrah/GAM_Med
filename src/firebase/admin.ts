import * as admin from 'firebase-admin';

/**
 * == Robust Firebase Admin Singleton ==
 * 
 * Ensures the Admin SDK is initialized only once using environment variables.
 * Handles private key newline formatting required for Vercel deployment.
 */

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!admin.apps.length) {
  if (projectId && clientEmail && privateKey) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
        databaseURL: `https://${projectId}.firebaseio.com`,
      });
      console.log('Firebase Admin Initialized Successfully');
    } catch (error: any) {
      console.error('Firebase Admin Initialization Error:', error.stack);
    }
  } else {
    if (process.env.NODE_ENV === 'production') {
      console.warn("Firebase Admin SDK: Initialization skipped. Missing environment variables.");
    }
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
