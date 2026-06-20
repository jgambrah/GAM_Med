const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFunctions, httpsCallable } = require('firebase/functions');

const firebaseConfig = {
  apiKey: "AIzaSyBQyn-2_ar73WypL2r7jk38VJWpRmsS4io",
  authDomain: "studio-9271533993-3884b.firebaseapp.com",
  projectId: "studio-9271533993-3884b",
  storageBucket: "studio-9271533993-3884b.firebasestorage.app",
  messagingSenderId: "903918390806",
  appId: "1:903918390806:web:bf37c5bf8d4bbfe4112f37"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const functions = getFunctions(app, 'us-central1');

async function run() {
  try {
    console.log("Signing in...");
    await signInWithEmailAndPassword(auth, "jamesobrempong@gmail.com", "Staff123!");
    console.log("Signed in successfully. UID:", auth.currentUser.uid);

    const createEncounter = httpsCallable(functions, 'createEncounter');
    
    const payload = {
      patientId: "edG6zYJI37B37hFrTsso",
      hospitalId: "GAM-GAR-7578",
      patientName: "Janet Bonah",
      maternityProfileId: "some-maternity-profile-id",
      encounterType: "ANC Visit",
      diagnosis: "Test diagnosis for ANC visit",
      ancData: {
        bp: "120/80",
        weight: 70,
        fundalHeight: 24,
        fetalHeartRate: 140,
        presentation: "Cephalic",
        fetalMovement: "Active",
        urineProtein: "Negative",
        urineSugar: "Negative",
        edema: "None"
      }
    };

    console.log("Calling createEncounter httpsCallable...");
    const result = await createEncounter(payload);
    console.log("Result:", JSON.stringify(result.data, null, 2));

  } catch (error) {
    console.error("Function call failed:", error);
  } finally {
    process.exit(0);
  }
}

run();
