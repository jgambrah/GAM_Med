import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

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
      const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        console.log("💻 Firebase Admin initialized via Local File");
      } else {
        console.warn("⚠️ serviceAccountKey.json not found in root directory, and environment variables are missing.");
        admin.initializeApp({
          projectId: adminConfig.projectId || 'studio-9271533993-3884b'
        });
        console.log("🛠️ Firebase Admin initialized with placeholder configuration for build compatibility.");
      }
    } catch (e) {
      console.error("❌ Firebase Admin failed to initialize via local file:", e);
    }
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export const adminMessaging = admin.messaging();

export function getAdminFirestore() {
  return admin.firestore();
}

export function getAdminAuth() {
  return admin.auth();
}

export function getAdminMessaging() {
  return admin.messaging();
}
