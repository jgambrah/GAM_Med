const admin = require('firebase-admin');
const serviceAccount = require("c:/Users/DELL/Documents/GitHub/GAM_Med/src/serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const targetUid = "wALUSwm980TFCBffhKFqCJuVPwh2";

async function run() {
  try {
    // 1. Check if it's in users collection
    const userDoc = await db.collection('users').doc(targetUid).get();
    if (userDoc.exists) {
      console.log(`FOUND in 'users' collection:`, JSON.stringify(userDoc.data(), null, 2));
    } else {
      console.log(`Not found as a document key in 'users' collection.`);
    }

    // 2. Search for any document in all collections containing this string as a value
    console.log("Searching collection groups for references...");
    
    // Check purchase_orders
    const poSnap = await db.collectionGroup('purchase_orders').get();
    poSnap.forEach(doc => {
      const dataStr = JSON.stringify(doc.data());
      if (dataStr.includes(targetUid)) {
        console.log(`FOUND reference in purchase_orders document at: ${doc.ref.path}`);
        console.log(JSON.stringify(doc.data(), null, 2));
      }
    });

    // Check other collections
    const collections = ['attendance_logs', 'lab_orders', 'radiology_orders', 'billing_items', 'encounters'];
    for (const coll of collections) {
      const snap = await db.collectionGroup(coll).get();
      snap.forEach(doc => {
        const dataStr = JSON.stringify(doc.data());
        if (dataStr.includes(targetUid)) {
          console.log(`FOUND reference in ${coll} document at: ${doc.ref.path}`);
        }
      });
    }

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

run();
