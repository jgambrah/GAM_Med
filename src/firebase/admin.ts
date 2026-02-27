import * as admin from 'firebase-admin';

/**
 * == Diagnostic-First Admin SDK ==
 * 
 * Uses individual environment variables to bypass JSON parsing issues.
 * Implements lazy-initialization and diagnostic error tracking to 
 * provide clear feedback in Vercel logs.
 */

let initError: string | null = null;

function initializeAdmin() {
  if (admin.apps.length > 0) return admin.app();

  const projectId = process.env.FB_PROJECT_ID;
  const clientEmail = process.env.FB_CLIENT_EMAIL;
  const privateKey = process.env.FB_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    const missing = [];
    if (!projectId) missing.push("FB_PROJECT_ID");
    if (!clientEmail) missing.push("FB_CLIENT_EMAIL");
    if (!privateKey) missing.push("FB_PRIVATE_KEY");
    initError = "Missing Admin Credentials: " + missing.join(', ');
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
    initError = "ADMIN_INIT_CRASH: " + error.message;
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
        throw new Error(initError || "Unknown Admin Init Error");
    }

    return {
        adminDb: admin.firestore(),
        adminAuth: admin.auth()
    };
};
