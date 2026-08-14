const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Load environment variables if available
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-9271533993-3884b';

let serviceAccount;
const possiblePaths = [
  path.resolve(__dirname, 'serviceAccountKey.json'),
  path.resolve(__dirname, 'src/serviceAccountKey.json'),
  path.resolve(process.cwd(), 'serviceAccountKey.json')
];

for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    try {
      serviceAccount = JSON.parse(fs.readFileSync(p, 'utf8'));
      break;
    } catch (e) {}
  }
}

if (!admin.apps.length) {
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("💻 Firebase Admin initialized via serviceAccountKey.json");
  } else {
    admin.initializeApp({
      projectId: projectId
    });
    console.log(`🛠️ Firebase Admin initialized with Project ID: ${projectId}`);
  }
}

const db = admin.firestore();

async function setRole(targetUser, newRole, targetHospitalId) {
  try {
    let userRecord;
    if (targetUser.includes('@')) {
      userRecord = await admin.auth().getUserByEmail(targetUser);
    } else {
      userRecord = await admin.auth().getUser(targetUser);
    }

    const uid = userRecord.uid;
    console.log(`\n🔍 Found User: ${userRecord.displayName || userRecord.email} (UID: ${uid})`);

    const userDocRef = db.collection('users').doc(uid);
    const userDocSnap = await userDocRef.get();
    const existingData = userDocSnap.exists ? userDocSnap.data() : {};
    
    const hospitalId = targetHospitalId || existingData.hospitalId || 'GAM-GAR-7578';

    console.log(`Step 1: Setting Custom Claims: { role: '${newRole}', hospitalId: '${hospitalId}' }...`);
    await admin.auth().setCustomUserClaims(uid, {
      ...userRecord.customClaims,
      role: newRole,
      hospitalId: hospitalId
    });
    console.log("✅ Custom User Claims updated successfully!");

    console.log(`Step 2: Syncing Firestore Profile /users/${uid}...`);
    await userDocRef.set({
      role: newRole,
      hospitalId: hospitalId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log("✅ Firestore Profile updated successfully!");

    console.log(`\n🎉 SUCCESS: ${userRecord.displayName || userRecord.email} elevated to '${newRole}'.`);
    console.log("👉 IMPORTANT: The user must LOG OUT and LOG BACK IN to issue a fresh JWT token with the new claims.\n");
    process.exit(0);
  } catch (err) {
    console.error("❌ Failed to set custom claims:", err.message || err);
    process.exit(1);
  }
}

const args = process.argv.slice(2);
const targetUser = args[0] || "marcus@gammed.com";
const newRole = args[1] || "CHIEF_AUDITOR";
const hospitalId = args[2] || "GAM-GAR-7578";

console.log(`🚀 Programmatic Role Elevation Script`);
console.log(`Target: ${targetUser} | Role: ${newRole} | Hospital ID: ${hospitalId}`);

setRole(targetUser, newRole, hospitalId);
