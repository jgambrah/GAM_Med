import * as admin from 'firebase-admin';

/**
 * == Build-Safe & Sanitized Firebase Admin Provider ==
 * 
 * Provides lazy-loaded access to Firebase Admin services.
 * This prevents build-time crashes when environment variables are missing.
 */

function getAdminApp() {
  if (admin.apps.length > 0) {
    return admin.apps[0];
  }

  const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;

  // During Next.js build/static analysis, env vars might be missing.
  if (!serviceAccountVar) {
    return null;
  }

  try {
    // 1. Remove any potential surrounding quotes or whitespace added by Vercel
    const sanitizedJson = serviceAccountVar.trim().replace(/^['"]|['"]$/g, '');
    const serviceAccount = JSON.parse(sanitizedJson);

    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        // This handles both real newlines and escaped \n characters
        privateKey: serviceAccount.private_key.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error: any) {
    console.error("ADMIN_INIT_FAILURE:", error.message);
    return null;
  }
}

/**
 * == Database Getter ==
 */
export function getAdminDb() {
  const app = getAdminApp();
  return app ? admin.firestore() : null as unknown as admin.firestore.Firestore;
}

/**
 * == Auth Getter ==
 */
export function getAdminAuth() {
  const app = getAdminApp();
  return app ? admin.auth() : null as unknown as admin.auth.Auth;
}

// Export constants for simpler cases (Note: these will be null during build)
export const adminDb = getAdminDb();
export const adminAuth = getAdminAuth();
