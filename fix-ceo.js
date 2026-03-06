
const admin = require('firebase-admin');
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const uid = "JVp2khEB7yQCCdwhck6UChhQE6s2"; // Your UID from the error log

async function grantPower() {
  try {
    // 1. Set the Custom Claims (The "SaaS Badge")
    await admin.auth().setCustomUserClaims(uid, {
      role: 'SUPER_ADMIN',
      isGlobalAdmin: true
    });

    // 2. Update the Firestore Profile to match
    await admin.firestore().collection('users').doc(uid).set({
      role: 'SUPER_ADMIN',
      email: 'jamesgambrah@gmail.com',
      fullName: 'Dr. James Gambrah',
      is_active: true
    }, { merge: true });

    console.log("--------------------------------------------------");
    console.log("✅ SUCCESS: CEO Badge restored for Dr. Gambrah.");
    console.log("--------------------------------------------------");
    console.log("CRITICAL: You MUST Log Out and Log Back In now.");
    process.exit();
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

grantPower();
