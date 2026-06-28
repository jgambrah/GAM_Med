const admin = require('firebase-admin');
const serviceAccount = require("c:/Users/DELL/Documents/GitHub/GAM_Med/src/serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const uid = "tpgFILYY6PTSHFAmWP4wacrypS83";

async function run() {
  try {
    console.log(`Step 1: Setting Custom Claims for UID ${uid}...`);
    await admin.auth().setCustomUserClaims(uid, {
      role: 'PHARMACIST',
      hospitalId: 'GAM-GAR-7578'
    });
    console.log("✅ Custom Claims updated successfully!");

    console.log(`Step 2: Updating Firestore /users/${uid}...`);
    await db.collection('users').doc(uid).set({
      uid: uid,
      email: 'shanegambrah@gmail.com',
      fullName: 'Shane Gambrah',
      role: 'PHARMACIST',
      hospitalId: 'GAM-GAR-7578',
      is_active: true,
      mustChangePassword: false,
      onboardingComplete: true
    }, { merge: true });
    console.log("✅ Firestore user document updated successfully!");

    console.log("Healing complete! Please sign out and sign back in to refresh your auth token.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Healing failed:", err);
    process.exit(1);
  }
}

run();
