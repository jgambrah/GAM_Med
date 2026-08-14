// assignRole.js - Programmatically assign custom claims via Firebase Admin SDK
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

// 2. Define the Target User and Role (Command Line Arguments or Defaults)
// CLI Arguments format: node assignRole.js <targetUidOrEmail> <targetRole>
const args = process.argv.slice(2);
const targetInput = args[0] || 'tpgFILYY6PTSHFAmWP4wacrypS83'; // Default or CLI arg
const targetRole = args[1] || 'CHIEF_AUDITOR'; // e.g., 'FINANCE_DIRECTOR', 'CASHIER', 'CHIEF_AUDITOR'

async function runRoleAssignment() {
  try {
    let userRecord;
    if (targetInput.includes('@')) {
      userRecord = await admin.auth().getUserByEmail(targetInput);
    } else {
      userRecord = await admin.auth().getUser(targetInput);
    }

    const targetUid = userRecord.uid;
    const existingClaims = userRecord.customClaims || {};

    // 3. Execute the Custom Claim Assignment
    await admin.auth().setCustomUserClaims(targetUid, {
      ...existingClaims,
      role: targetRole
    });

    // Also sync Firestore user profile if present
    const db = admin.firestore();
    await db.collection('users').doc(targetUid).set({
      role: targetRole,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log(`\n✅ Success! User ${userRecord.email || targetUid} has been elevated to ${targetRole}.`);
    console.log(`👉 Instruct the user to log out and log back in to refresh their security token.\n`);
    process.exit(0);
  } catch (error) {
    console.error('Fatal Error assigning role:', error);
    process.exit(1);
  }
}

runRoleAssignment();
