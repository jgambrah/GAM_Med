import * as admin from 'firebase-admin';

// This variable will hold our error if initialization fails
let initError: string | null = null;

function initializeAdmin() {
  // Return existing app if already initialized
  if (admin.apps.length > 0) return admin.apps[0];

  const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!serviceAccountVar) {
    initError = "FIREBASE_SERVICE_ACCOUNT variable is missing in Vercel Settings.";
    return null;
  }

  try {
    // 1. Clean the string (Remove any potential surrounding quotes or whitespace added by Vercel)
    const sanitizedJson = serviceAccountVar.trim().replace(/^['"]|['"]$/g, '');
    const serviceAccount = JSON.parse(sanitizedJson);

    // 2. Initialize
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        // This handles both real newlines and escaped \n characters
        privateKey: serviceAccount.private_key.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error: any) {
    initError = "JSON_PARSE_ERROR: " + error.message;
    console.error("ADMIN_INIT_FAILURE:", initError);
    return null;
  }
}

const app = initializeAdmin();

/**
 * == Admin Services Getter ==
 * 
 * Provides a secure way to access Admin SDK services.
 * Throws a descriptive error if initialization failed, helping with Vercel debugging.
 */
export const getAdminServices = () => {
    if (!app) {
        throw new Error(initError || "Firebase Admin SDK failed to initialize. Check environment variables.");
    }
    return {
        adminDb: admin.firestore(),
        adminAuth: admin.auth()
    };
};
