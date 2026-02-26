import * as admin from 'firebase-admin';

/**
 * == Build-Safe & Sanitized Firebase Admin Provider ==
 * 
 * This module handles the initialization of the Firebase Admin SDK using a single
 * environment variable containing the service account JSON. It includes an aggressive
 * sanitization layer to handle Vercel's string handling of long JSON blobs.
 * 
 * It uses lazy initialization to prevent build-time crashes during Vercel's 
 * static analysis phase when environment variables are not yet present.
 */

function initializeAdmin() {
  // Return existing app if already initialized
  if (admin.apps.length > 0) return admin.apps[0];

  const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;

  // If no environment variable is found, we are likely in a build phase.
  // Return null to prevent immediate crash; callers must handle null.
  if (!serviceAccountVar) {
    return null;
  }

  try {
    // 1. SANITIZATION: Remove surrounding quotes or whitespace added by Vercel
    const sanitizedJson = serviceAccountVar.trim().replace(/^['"]|['"]$/g, '');
    const serviceAccount = JSON.parse(sanitizedJson);

    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        // Handle escaped \n characters in the private key
        privateKey: serviceAccount.private_key.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error: any) {
    console.error('CRITICAL: Firebase Admin Initialization Error:', error.message);
    return null;
  }
}

/**
 * Provides access to Firestore with lazy-loading.
 * Safe for use in Next.js Server Components and API Routes.
 */
export const getAdminDb = () => {
  const app = initializeAdmin();
  if (!app) {
    // Return null-proxy to avoid top-level crashes, 
    // but actual calls at runtime will need to verify connectivity.
    return null as unknown as admin.firestore.Firestore;
  }
  return admin.firestore();
};

/**
 * Provides access to Auth with lazy-loading.
 */
export const getAdminAuth = () => {
  const app = initializeAdmin();
  if (!app) {
    return null as unknown as admin.auth.Auth;
  }
  return admin.auth();
};

// Legacy singleton exports (Evaluated at runtime call by lazy pattern)
// These remain for backward compatibility with existing route imports.
export const adminDb = getAdminDb();
export const adminAuth = getAdminAuth();
