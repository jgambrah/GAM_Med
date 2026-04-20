const admin = require('firebase-admin');
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const uid = "vycyC1Jup3hmYIa7NBkOiL15ptB2"; // Kofi Boateng's UID

async function verifyClaims() {
  try {
    console.log(`Fetching claims for user: ${uid}`);
    const user = await admin.auth().getUser(uid);
    console.log("✅ Claims found on server:", user.customClaims);
    if (!user.customClaims || !user.customClaims.role || !user.customClaims.hospitalId) {
        console.error("❌ CRITICAL: Claims are missing or incomplete on the Auth server!");
    } else {
        console.log("✅ SUCCESS: Claims are correctly set on the backend.");
    }
    process.exit(0);
  } catch (error) {
    console.error("❌ ERROR fetching user claims:", error.message);
    process.exit(1);
  }
}

verifyClaims();
