import * as admin from 'firebase-admin';

/**
 * == Build-Safe Firebase Admin Singleton ==
 * 
 * Provides secure server-side access to Firebase services.
 * Resilience: Performs an explicit check for environment variables to prevent 
 * Vercel build-time crashes (Error: Service account object must contain a string "project_id").
 */

let adminApp: admin.app.App | null = null;

if (!admin.apps.length) {
  // 1. HARD ENFORCEMENT: Only initialize if all critical environment variables are available.
  // During Vercel's static page analysis phase, these might be missing.
  if (
    process.env.FIREBASE_PROJECT_ID && 
    process.env.FIREBASE_CLIENT_EMAIL && 
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    try {
        adminApp = admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            }),
            databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
        });
    } catch (error) {
        console.error("Firebase Admin initialization failed at runtime:", error);
    }
  } else {
    // Graceful Skip: Avoid throwing an error during build phase
    // This handles the Vercel "Collecting page data" step
  }
} else {
  adminApp = admin.app();
}

// 2. EXPORT SDKs (Safety fallback to null for build-time safety)
export const adminDb = adminApp ? adminApp.firestore() : null as any;
export const adminAuth = adminApp ? adminApp.auth() : null as any;