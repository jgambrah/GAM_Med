// assignTreasuryRole.js - Assign TREASURY_CONTROLLER role via Firebase Admin SDK
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// 1. Initialize the Admin SDK with Service Account Key or Project Fallback
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
    console.log("💻 Firebase Admin initialized via Service Account Key.");
  } else {
    admin.initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-9271533993-3884b'
    });
    console.log("🛠️ Firebase Admin initialized with Project ID configuration.");
  }
}

// 2. Target User and Role Specification
const args = process.argv.slice(2);
const targetInput = args[0] || 'INSERT_MARCUS_UID_HERE';
const targetRole = args[1] || 'TREASURY_CONTROLLER';

async function assignTreasuryRole() {
  try {
    let userRecord;
    if (targetInput.includes('@')) {
      userRecord = await admin.auth().getUserByEmail(targetInput);
    } else {
      userRecord = await admin.auth().getUser(targetInput);
    }

    const targetUid = userRecord.uid;
    const existingClaims = userRecord.customClaims || {};

    // Assign the custom claim for Treasury operations
    await admin.auth().setCustomUserClaims(targetUid, {
      ...existingClaims,
      role: targetRole
    });

    const db = admin.firestore();
    await db.collection('users').doc(targetUid).set({
      role: targetRole,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log(`\n✅ Success! User ${userRecord.email || targetUid} elevated to '${targetRole}'.`);
    console.log(`👉 Instruct the user to log out and log back in to refresh their security token.\n`);
    process.exit(0);
  } catch (error) {
    console.error('Fatal Error assigning role:', error);
    process.exit(1);
  }
}

assignTreasuryRole();
