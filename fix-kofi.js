
const admin = require('firebase-admin');
const serviceAccount = require("./serviceAccountKey.json");
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const uid = "vycyC1Jup3hmYIa7NBkOiL15ptB2"; // Kofi's UID from your error

async function repairKofi() {
  try {
    // 1. Force set the badge on Google's Auth Server
    await admin.auth().setCustomUserClaims(uid, {
      role: 'DIRECTOR',
      hospitalId: 'kGcL2hVBx7avqlHD1bVX' // Benjamin's Hospital ID from your prev message
    });
    
    // 2. Sync the Firestore profile
    await admin.firestore().collection('users').doc(uid).update({
      role: 'DIRECTOR',
      hospitalId: 'kGcL2hVBx7avqlHD1bVX',
      is_active: true
    });

    console.log("✅ Kofi's Digital Badge Issued for Production.");
    process.exit();
  } catch (e) { console.error(e); }
}
repairKofi();
