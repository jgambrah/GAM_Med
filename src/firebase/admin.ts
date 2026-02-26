import * as admin from 'firebase-admin';

// Local app instance to implement singleton pattern safely for build analysis
let appInstance: admin.app.App | null = null;

function initializeAdmin() {
  if (admin.apps.length > 0) return admin.app();

  // 1. Get the 3 clean variables from .env.local
  const projectId = process.env.FB_PROJECT_ID;
  const clientEmail = process.env.FB_CLIENT_EMAIL;
  const privateKey = process.env.FB_PRIVATE_KEY;

  // 2. Safety check: During Next.js build, these might be missing. 
  // We return null instead of crashing to allow static analysis to complete.
  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  try {
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId: projectId,
        clientEmail: clientEmail,
        // The regex handles the escaped \n characters common in environment variable strings
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error: any) {
    console.error("Firebase Admin Critical Initialization Failure:", error.message);
    return null;
  }
}

/**
 * == Secure Admin Services Getter ==
 * 
 * Provides lazy initialization of Admin SDK services.
 * Ensures the app doesn't crash during Vercel's build-time static analysis.
 */
export const getAdminServices = () => {
    if (!appInstance) {
        appInstance = initializeAdmin();
    }
    
    if (!appInstance) {
        throw new Error("Firebase Admin SDK is not initialized. Ensure FB_PROJECT_ID, FB_CLIENT_EMAIL, and FB_PRIVATE_KEY are set in Vercel.");
    }

    return {
        adminDb: admin.firestore(),
        adminAuth: admin.auth()
    };
};
