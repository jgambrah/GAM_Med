const admin = require('firebase-admin');
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function run() {
  try {
    const email = 'johnvitalis@gmail.com';
    console.log(`Searching for Auth User with email: ${email}`);
    let authUser;
    try {
      authUser = await admin.auth().getUserByEmail(email);
      console.log("Auth User Found!");
      console.log("UID:", authUser.uid);
      console.log("Custom Claims:", JSON.stringify(authUser.customClaims, null, 2));
    } catch (e) {
      console.error("Auth User NOT Found in Firebase Auth:", e.message);
    }

    console.log("\nSearching for Firestore User Profile...");
    const userQuery = await db.collection('users').where('email', '==', email).get();
    if (!userQuery.empty) {
      console.log(`Found ${userQuery.size} documents in Firestore:`);
      userQuery.forEach(doc => {
        console.log(`Doc ID (UID): ${doc.id}`);
        console.log("Data:", JSON.stringify(doc.data(), null, 2));
      });
    } else {
      console.log("No user profile found in Firestore with this email.");
    }
    
    process.exit(0);
  } catch (err) {
    console.error("Fatal Error:", err);
    process.exit(1);
  }
}

run();
