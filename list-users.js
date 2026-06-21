const admin = require('firebase-admin');
const serviceAccount = require("./serviceAccountKey.json");

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  const db = admin.firestore();
  
  db.collection('users').get().then(snap => {
    console.log(`Found ${snap.size} users:`);
    snap.forEach(doc => {
      const data = doc.data();
      console.log(`Email: ${data.email} | Role: ${data.role} | FullName: ${data.fullName}`);
    });
    process.exit(0);
  }).catch(err => {
    console.error("Query failed:", err);
    process.exit(1);
  });
} catch (e) {
  console.error("Initialization failed:", e);
  process.exit(1);
}
