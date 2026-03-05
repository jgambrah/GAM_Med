
import * as admin from 'firebase-admin';

// This logic allows it to work on your computer (file) AND on Vercel (env vars)
const adminConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  // We handle the private key specially because Vercel/Next.js might mess up the line breaks
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
  if (adminConfig.privateKey && adminConfig.clientEmail && adminConfig.projectId) {
    // PRODUCTION: Use Environment Variables
    admin.initializeApp({
      credential: admin.credential.cert(adminConfig as any),
    });
    console.log("🚀 Firebase Admin initialized via Environment Variables");
  } else {
    // LOCAL: Fallback to the local file (only works on your computer)
    try {
      const serviceAccount = require("../../../serviceAccountKey.json");
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("💻 Firebase Admin initialized via Local File");
    } catch (e) {
      console.error("❌ Firebase Admin failed to initialize. Missing Credentials. Make sure serviceAccountKey.json is in the root directory OR all FIREBASE_... environment variables are set.");
    }
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
