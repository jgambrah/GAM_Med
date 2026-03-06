const admin = require('firebase-admin');
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

// Your UID from the error log
const uid = "JVp2khEB7yQCCdwhck6UChhQE6s2"; 

async function restoreCeoPower() {
  try {
    console.log("Stamping CEO Badge for UID:", uid);

    // 1. SET THE CUSTOM CLAIMS (The Badge)
    await admin.auth().setCustomUserClaims(uid, {
      role: 'SUPER_ADMIN',
      isGlobalAdmin: true
    });

    // 2. UPDATE THE FIRESTORE PROFILE
    await admin.firestore().collection('users').doc(uid).set({
      role: 'SUPER_ADMIN',
      email: 'jamesgambrah@gmail.com',
      fullName: 'Dr. James Gambrah',
      is_active: true,
      company: 'GAM IT SOLUTIONS'
    }, { merge: true });

    console.log("--------------------------------------------------");
    console.log("✅ SUCCESS: CEO Badge is now permanent.");
    console.log("--------------------------------------------------");
    console.log("ACTION: You MUST Log Out and Log Back In now.");
    process.exit();
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

restoreCeoPower();
