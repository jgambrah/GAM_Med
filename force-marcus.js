const admin = require('firebase-admin');
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const uid = "WMiDkAVfzaa0IgL6UOjwvnQ7dIk2"; // Marcus's UID

async function forceStamp() {
  try {
    // 1. Force the claims on the server to match the database
    await admin.auth().setCustomUserClaims(uid, {
      role: 'DIRECTOR', // CORRECTED to DIRECTOR as per your database record
      hospitalId: 'GAM-GAR-7578'
    });

    // 2. Update the document to ensure consistency
    await admin.firestore().collection('users').doc(uid).update({
      role: 'DIRECTOR',
      hospitalId: 'GAM-GAR-7578',
      is_active: true
    });

    console.log("✅ Claims have been corrected for Marcus Amosah Henaku.");
    console.log("👉 User must log out and log back in to apply changes.");
    process.exit();
  } catch (e) {
    console.error("❌ Failed to stamp claims:", e);
    process.exit(1);
  }
}
forceStamp();
