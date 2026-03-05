const admin = require('firebase-admin');
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const doctorData = {
  email: "dr.adu@test.com", // CHANGE THIS TO AN EMAIL YOU CAN ACCESS
  fullName: "Dr. Ama Adu",
  // hospitalId will be fetched dynamically
  role: "DOCTOR",
  specialty: "General Practitioner"
};

async function createDoctor() {
  try {
    // Dynamically get the first hospital
    const hospitalsSnapshot = await admin.firestore().collection('hospitals').limit(1).get();
    if (hospitalsSnapshot.empty) {
      throw new Error("No hospitals found in the database. Please onboard a hospital first using the CEO dashboard.");
    }
    const hospital = hospitalsSnapshot.docs[0];
    const hospitalId = hospital.id;
    const hospitalName = hospital.data().name;

    console.log(`✅ Found hospital: ${hospitalName} (ID: ${hospitalId}). Assigning doctor to this facility.`);

    // 1. Create Auth Account
    const userRecord = await admin.auth().createUser({
      email: doctorData.email,
      password: "Doctor123!",
      displayName: doctorData.fullName,
    });

    // 2. Set Custom Claims (The SaaS Badge)
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role: 'DOCTOR',
      hospitalId: hospitalId
    });

    // 3. Create Firestore Profile
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      email: doctorData.email,
      fullName: doctorData.fullName,
      specialty: doctorData.specialty,
      role: 'DOCTOR',
      hospitalId: hospitalId, // Use the dynamically fetched ID
      uid: userRecord.uid,
      is_active: true,
      mustChangePassword: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log("--------------------------------------------------");
    console.log(`✅ SUCCESS: ${doctorData.fullName} created and assigned to ${hospitalName}.`);
    console.log("Login with password: Doctor123!");
    console.log("--------------------------------------------------");

    process.exit();
  } catch (e) {
    if (e.code === 'auth/email-already-exists') {
        console.error("❌ Error:", e.message);
        console.log("👉 Please delete the existing user from the Firebase Authentication console and try again.");
    } else {
        console.error("❌ Error:", e.message);
    }
    process.exit(1);
  }
}

createDoctor();
