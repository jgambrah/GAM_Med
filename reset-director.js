const admin = require('firebase-admin');
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) { admin.initializeApp({ credential: admin.credential.cert(serviceAccount) }); }

const email = "ENTER_DIRECTOR_EMAIL_HERE";
const newPass = "Reset123!"; // Temporary password
const hId = "ENTER_HOSPITAL_ID_HERE";

async function manualRepair() {
  try {
    const user = await admin.auth().getUserByEmail(email);
    // Update Auth
    await admin.auth().updateUser(user.uid, { password: newPass });
    // Update Firestore Vault
    await admin.firestore().collection('hospitals').doc(hId).update({
      provisioningSecret: newPass
    });
    console.log(`✅ Success! Password for ${email} set to: ${newPass}`);
    process.exit();
  } catch (e) { console.error(e); process.exit(1); }
}
manualRepair();
