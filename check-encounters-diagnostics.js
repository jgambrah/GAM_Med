const admin = require('firebase-admin');

process.env.GCLOUD_PROJECT = "studio-9271533993-3884b";
try {
  admin.initializeApp({
    projectId: "studio-9271533993-3884b"
  });
  const db = admin.firestore();
  
  async function run() {
    console.log("=== COMPLETED SURGERIES ===");
    const surgeriesSnap = await db.collectionGroup('surgeries').where('status', '==', 'COMPLETED').get();
    console.log(`Found ${surgeriesSnap.size} completed surgeries:`);
    for (const doc of surgeriesSnap.docs) {
      const data = doc.data();
      console.log(`Surgery ID: ${doc.id} | Patient: ${data.patientName} | PatientId: ${data.patientId} | Procedure: ${data.procedureName} | Date: ${data.scheduledDate}`);
    }

    console.log("\n=== PATIENTS ===");
    const patientsSnap = await db.collectionGroup('patients').get();
    console.log(`Found ${patientsSnap.size} patients total:`);
    patientsSnap.forEach(doc => {
      const data = doc.data();
      console.log(`Patient ID: ${doc.id} | Name: ${data.firstName} ${data.lastName} | GhanaCardId: '${data.ghanaCardId}'`);
    });

    console.log("\n=== ENCOUNTERS ===");
    const encountersSnap = await db.collectionGroup('encounters').get();
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
