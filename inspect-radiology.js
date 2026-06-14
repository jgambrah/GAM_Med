const admin = require('firebase-admin');

process.env.GCLOUD_PROJECT = "studio-9271533993-3884b";
try {
  admin.initializeApp({
    projectId: "studio-9271533993-3884b"
  });
  const db = admin.firestore();
  
  db.collectionGroup('radiology_orders').limit(5).get().then(snap => {
    console.log(`Found ${snap.size} radiology orders:`);
    snap.forEach(doc => {
      console.log(`ID: ${doc.id} | Path: ${doc.ref.path}`);
      console.log(JSON.stringify(doc.data(), null, 2));
      console.log("-----------------------------------------");
    });
    process.exit(0);
  }).catch(err => {
    console.error("CollectionGroup query failed:", err);
    process.exit(1);
  });
} catch (e) {
  console.error("Initialization failed:", e);
  process.exit(1);
}
