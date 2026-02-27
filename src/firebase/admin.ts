import * as admin from 'firebase-admin';

/**
 * == Clean Admin SDK Provisioning ==
 * 
 * Uses individual environment variables to bypass JSON parsing issues.
 * Implements lazy-initialization to ensure build-safety on Vercel.
 */
function initializeAdmin() {
  if (admin.apps.length > 0) return admin.app();

  const projectId = process.env.FB_PROJECT_ID;
  const clientEmail = process.env.FB_CLIENT_EMAIL;
  const privateKey = process.env.FB_PRIVATE_KEY;

  // Safety check: During build or if missing, don't crash the server process
  if (!projectId || !clientEmail || !privateKey) {
    console.warn("Firebase Admin credentials partially missing. Returning null for build-time safety.");
    return null;
  }

  try {
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId: projectId,
        clientEmail: clientEmail,
        // Sanitizes escaped newline characters for Vercel compatibility
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error: any) {
    console.error("ADMIN_INIT_CRASH:", error.message);
    return null;
  }
}

const app = initializeAdmin();

/**
 * == Secure Admin Services Getter ==
 * 
 * Provides runtime access to Firestore and Auth with diagnostic error reporting.
 */
export const getAdminServices = () => {
    if (!app) {
        throw new Error("Firebase Admin SDK not initialized. Ensure FB_PROJECT_ID, FB_CLIENT_EMAIL, and FB_PRIVATE_KEY are set.");
    }

    return {
        adminDb: admin.firestore(),
        adminAuth: admin.auth()
    };
};
