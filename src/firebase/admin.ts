import * as admin from 'firebase-admin';

/**
 * == Build-Safe Firebase Admin Singleton ==
 * 
 * Provides secure server-side access to Firebase services.
 * Resilience: Performs an explicit check for environment variables to prevent 
 * Vercel build-time crashes (Error: Service account object must contain a string "project_id").
 */

let adminApp: admin.app.App | null = null;

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!admin.apps.length) {
  // 1. HARD ENFORCEMENT: Only initialize if all critical environment variables are available.
  // This prevents crashes during Vercel's static site generation (build time).
  if (projectId && clientEmail && privateKey) {
    try {
        adminApp = admin.initializeApp({
            credential: admin.credential.cert({
                projectId: projectId,
                clientEmail: clientEmail,
                privateKey: privateKey.replace(/\\n/g, '\n'),
            }),
            databaseURL: `https://${projectId}.firebaseio.com`,
        });
    } catch (error) {
        console.error("Firebase Admin initialization failed at runtime:", error);
    }
  } else {
    // Quietly log missing variables during build, but don't crash.
    if (process.env.NODE_ENV === 'production') {
        console.warn("Firebase Admin SDK: Initialization skipped due to missing environment variables during build analysis.");
    }
  }
} else {
  adminApp = admin.app();
}

// 2. EXPORT SDKs (Safety fallback to null to prevent undefined crashes)
// Type casting helps avoid errors in components that assume the SDK is always present
export const adminDb = (adminApp ? adminApp.firestore() : null) as admin.firestore.Firestore;
export const adminAuth = (adminApp ? adminApp.auth() : null) as admin.auth.Auth;
