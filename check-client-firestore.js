require('dotenv').config({ path: '.env.local' });
const { initializeApp } = require('firebase/app');
const { getFirestore, collectionGroup, getDocs, query, where, limit } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

console.log("Firebase config loaded. Project ID:", firebaseConfig.projectId);

try {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  async function run() {
    console.log("\n=== RECENT COMPLETED SURGERIES ===");
    const surgeriesSnap = await getDocs(query(collectionGroup(db, 'surgeries'), where('status', '==', 'COMPLETED')));
    console.log(`Found ${surgeriesSnap.size} completed surgeries:`);
    surgeriesSnap.forEach(doc => {
      const data = doc.data();
      console.log(`Surgery ID: ${doc.id} | Patient: ${data.patientName} | PatientId: ${data.patientId} | Procedure: ${data.procedureName} | Date: ${data.scheduledDate}`);
    });

    console.log("\n=== RECENT ENCOUNTERS ===");
    const encountersSnap = await getDocs(query(collectionGroup(db, 'encounters'), limit(20)));
    console.log(`Found ${encountersSnap.size} encounters total:`);
    encountersSnap.forEach(doc => {
      const data = doc.data();
      console.log(`Encounter ID: ${doc.id} | Patient: ${data.patientName} | Type: ${data.type} | GhanaCardId: '${data.ghanaCardId}' | Diagnosis: ${data.diagnosis}`);
    });

    process.exit(0);
  }

  run().catch(err => {
    console.error("Execution failed:", err);
    process.exit(1);
  });

} catch (e) {
  console.error("Initialization failed:", e);
  process.exit(1);
}
