const admin = require('firebase-admin');

// 1. Ensure your service account key is in the same folder
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const ceoEmail = 'jamesgambrah@gmail.com'; 

async function restoreCeoStatus() {
  try {
    // Find you in the system
    const user = await admin.auth().getUserByEmail(ceoEmail);
    
    // FORCE SET the Super Admin Role
    // This is the "Solid" way to ensure you have control over the whole network
    await admin.auth().setCustomUserClaims(user.uid, {
      role: 'SUPER_ADMIN',
      company: 'GAM IT SOLUTIONS',
      isGlobalAdmin: true
    });

    // Also ensure your Firestore profile reflects this
    await admin.firestore().collection('users').doc(user.uid).set({
      fullName: "Dr. James Gambrah",
      email: ceoEmail,
      role: 'SUPER_ADMIN',
      is_active: true,
      mustChangePassword: false
    }, { merge: true });

    console.log("--------------------------------------------------");
    console.log("✅ POWER RESTORED: Dr. James Gambrah is the CEO.");
    console.log(`User ID: ${user.uid}`);
    console.log("--------------------------------------------------");
    console.log("ACTION REQUIRED: Log out and Log back in to refresh your token.");
    process.exit();
  } catch (error) {
    console.error("❌ Failed to restore status:", error.message);
    process.exit(1);
  }
}

restoreCeoStatus();
