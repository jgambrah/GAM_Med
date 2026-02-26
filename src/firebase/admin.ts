import * as admin from 'firebase-admin';

/**
 * == Build-Safe & Sanitized Firebase Admin Provider ==
 * 
 * This module handles the initialization of the Firebase Admin SDK using a single
 * environment variable containing the service account JSON. It includes an aggressive
 * sanitization layer to handle Vercel's string handling of long JSON blobs.
 */

function getAdminApp() {
  if (admin.apps.length > 0) {
    return admin.apps[0];
  }

  const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;

  // During Next.js build/static analysis, env vars might be missing.
  // We log a warning instead of throwing to prevent build-time crashes.
  if (!serviceAccountVar) {
    console.warn("FIREBASE_SERVICE_ACCOUNT is missing. Initialization skipped (normal during build).");
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

// Initialize the app
const app = getAdminApp();

// Export services. Note: These will be null if initialization failed (e.g. during build)
// API routes must handle potential null values or ensure they run only when initialized.
export const adminDb = app ? admin.firestore() : null as unknown as admin.firestore.Firestore;
export const adminAuth = app ? admin.auth() : null as unknown as admin.auth.Auth;
