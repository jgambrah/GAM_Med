const admin = require('firebase-admin');
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

async function addWhtAccountToExistingHospitals() {
  console.log("🛠️ Starting migration to add Standard WHT Account to all facilities...");
  try {
    const hospitalsSnap = await db.collection('hospitals').get();
    if (hospitalsSnap.empty) {
      console.log("No hospitals found. Exiting.");
      process.exit(0);
    }
    
    const batch = db.batch();
    let count = 0;

    for (const hDoc of hospitalsSnap.docs) {
      const hId = hDoc.id;
      const coaRef = db.collection('hospitals').doc(hId).collection('chart_of_accounts');
      
      // Check if the WHT account already exists for this hospital
      const whtQuery = await coaRef.where('accountCode', '==', '2100').limit(1).get();

      if (whtQuery.empty) {
        const newAccRef = coaRef.doc(); // Auto-generate ID for the new account
        console.log(`  -> Provisioning WHT account for: ${hDoc.data().name}`);
        
        batch.set(newAccRef, {
          accountCode: '2100',
          name: 'Withholding Tax Payable (GRA)',
          category: 'LIABILITIES',
          currentBalance: 0,
          hospitalId: hId,
          isSystemAccount: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        count++;
      } else {
        console.log(`  -> Skipping ${hDoc.data().name} (WHT account already exists).`);
      }
    }

    if (count > 0) {
      await batch.commit();
      console.log(`\n✅ SUCCESS: ${count} hospital(s) have been updated with the Standardized WHT Account.`);
    } else {
      console.log("\n✅ All hospitals were already up-to-date.");
    }
    
    process.exit(0);

  } catch (error) {
    console.error("❌ MIGRATION FAILED:", error);
    process.exit(1);
  }
}

addWhtAccountToExistingHospitals();
