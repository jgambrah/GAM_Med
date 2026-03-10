const admin = require('firebase-admin');
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const uid = "WMiDkAVfzaa0IgL6UOjwvnQ7dIk2"; // Marcus's UID

async function forceStamp() {
  try {
    // 1. Force the claims on the server
    await admin.auth().setCustomUserClaims(uid, {
      role: 'DOCTOR',
      hospitalId: 'GAM-GAR-7578' // <--- Ensure this matches Marcus's actual Hospital ID
    });

    // 2. Update the document just in case
    await admin.firestore().collection('users').doc(uid).update({
      role: 'DOCTOR',
      hospitalId: 'GAM-GAR-7578',
      is_active: true
    });

    console.log("✅ Claims set for Marcus.");
    process.exit();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
forceStamp();
