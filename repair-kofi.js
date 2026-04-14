const admin = require('firebase-admin');
const serviceAccount = require("./serviceAccountKey.json");
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const uid = "vycyC1Jup3hmYIa7NBkOiL15ptB2"; // Kofi's UID from your error

async function repair() {
  await admin.auth().setCustomUserClaims(uid, {
    role: 'DIRECTOR', // Or whichever role Kofi has
    hospitalId: 'GAM-GAR-7578' // <--- MUST match his hospital
  });
  console.log("✅ Kofi's badge has been issued.");
  process.exit();
}
repair();