const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

async function run() {
  console.log("=== WARDS & BEDS ===");
  const wardsSnap = await db.collectionGroup('wards').get();
  for (const doc of wardsSnap.docs) {
    const data = doc.data();
    console.log(`Ward ID: ${doc.id} | Name: ${data.name} | Prefix: ${data.prefix} | Capacity: ${data.capacity} | Occupancy: ${data.occupancy}`);
    
    const bedsSnap = await doc.ref.collection('beds').get();
    console.log(`  Beds count: ${bedsSnap.size}`);
    bedsSnap.docs.forEach(b => {
      const bdata = b.data();
      if (bdata.status === 'Occupied' || bdata.patientId) {
        console.log(`    Bed ID: ${b.id} | status: ${bdata.status} | patientId: ${bdata.patientId} | patientName: ${bdata.patientName}`);
      }
    });
  }

  console.log("\n=== ACTIVE ADMISSIONS ===");
  const admissionsSnap = await db.collectionGroup('admissions').where('status', '==', 'ADMITTED').get();
  console.log(`Found ${admissionsSnap.size} active admissions:`);
  admissionsSnap.forEach(doc => {
    const data = doc.data();
    console.log(`Admission ID: ${doc.id} | Patient: ${data.patientName} | WardId: ${data.wardId} | WardName: ${data.wardName} | BedId: ${data.bedId} | BedName: ${data.bedName}`);
  });

  process.exit(0);
}

run().catch(err => {
  console.error("Execution failed:", err);
  process.exit(1);
});
