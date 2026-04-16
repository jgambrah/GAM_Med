
const admin = require('firebase-admin');
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

// UID for Kofi Boateng (kofiboateng@gmail.com) from the logs
const uid = "vycyC1Jup3hmYIa7NBkOiL15ptB2"; 
const correctHospitalId = "kGcL2hVBx7avqlHD1bVX";
const correctRole = "DIRECTOR";

async function repairKofi() {
  try {
    console.log(`Setting custom claims for UID: ${uid}...`);
    // 1. Force set the badge on Google's Auth Server
    await admin.auth().setCustomUserClaims(uid, {
      role: correctRole,
      hospitalId: correctHospitalId
    });
    console.log('✅ Claims set successfully');
    
    // 2. Sync the Firestore profile to ensure consistency for future sessions
    console.log("Syncing Firestore document...");
    await admin.firestore().collection('users').doc(uid).update({
      role: correctRole,
      hospitalId: correctHospitalId,
      is_active: true
    });
    console.log('✅ Firestore document synced.');

    console.log("\n--------------------------------------------------");
    console.log(`✅ Kofi's Digital Badge has been successfully re-stamped for ${correctHospitalId}.`);
    console.log("👉 He must now log out and log back in to see the changes.");
    console.log("--------------------------------------------------");
    process.exit(0);
  } catch (e) { 
    console.error("❌ ERROR: Failed to repair Kofi's identity.", e);
    process.exit(1);
  }
}

repairKofi();
