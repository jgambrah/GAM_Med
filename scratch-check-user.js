const admin = require('firebase-admin');
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const uid = "WMiDkAVfzaa0IgL6UOjwvnQ7dIk2"; // Marcus's UID

async function checkUser() {
  try {
    const authUser = await admin.auth().getUser(uid);
    console.log("--- Auth User Claims ---");
    console.log(JSON.stringify(authUser.customClaims || {}, null, 2));

    const userDoc = await db.collection('users').doc(uid).get();
    console.log("--- Firestore Document ---");
    if (userDoc.exists) {
      console.log(JSON.stringify(userDoc.data(), null, 2));
    } else {
      console.log("Document does not exist in 'users' collection!");
    }
    process.exit(0);
  } catch (error) {
    console.error("Error checking user:", error);
    process.exit(1);
  }
}

checkUser();
