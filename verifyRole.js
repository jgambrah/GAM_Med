// verifyRole.js - Inspect user custom claims directly from Firebase Auth database
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let serviceAccount;
const possibleKeys = [
  './gam-med-firebase-adminsdk.json',
  './serviceAccountKey.json',
  './src/serviceAccountKey.json'
];

for (const keyPath of possibleKeys) {
  const resolvedPath = path.resolve(__dirname, keyPath);
  if (fs.existsSync(resolvedPath)) {
    try {
      serviceAccount = require(resolvedPath);
      break;
    } catch (e) {}
  }
}

if (!admin.apps.length) {
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else {
    admin.initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-9271533993-3884b'
    });
  }
}

const args = process.argv.slice(2);
const targetInput = args[0] || 'tpgFILYY6PTSHFAmWP4wacrypS83';

async function verifyClaims() {
  try {
    let userRecord;
    if (targetInput.includes('@')) {
      userRecord = await admin.auth().getUserByEmail(targetInput);
    } else {
      userRecord = await admin.auth().getUser(targetInput);
    }

    console.log(`\n🔍 Verifying Custom Claims for User: ${userRecord.email || userRecord.uid}`);
    console.log("User Claims:", userRecord.customClaims || "No custom claims set.");
    console.log("User Profile UID:", userRecord.uid);
    console.log("User Display Name:", userRecord.displayName);
    process.exit(0);
  } catch (error) {
    console.error('Fatal Error verifying role:', error);
    process.exit(1);
  }
}

verifyClaims();
