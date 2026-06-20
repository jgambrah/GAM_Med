const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

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
const db = getFirestore(app);

const encounterId = "iR01KrdJW8RXXNtQAnZO";
const hospitalId = "GAM-GAR-7578";
const patientId = "edG6zYJI37B37hFrTsso";

async function run() {
  try {
    console.log("Signing in...");
    await signInWithEmailAndPassword(auth, "jamesobrempong@gmail.com", "Staff123!");
    
    // Check top level
    const ref1 = doc(db, "encounters", encounterId);
    const snap1 = await getDoc(ref1);
    if (snap1.exists()) {
      console.log(`FOUND at top-level: ${ref1.path}`);
      console.log(JSON.stringify(snap1.data(), null, 2));
    } else {
      console.log(`NOT found at top-level: ${ref1.path}`);
    }

    // Check nested subcollection
    const ref2 = doc(db, `hospitals/${hospitalId}/patients/${patientId}/encounters`, encounterId);
    const snap2 = await getDoc(ref2);
    if (snap2.exists()) {
      console.log(`FOUND at subcollection: ${ref2.path}`);
      console.log(JSON.stringify(snap2.data(), null, 2));
    } else {
      console.log(`NOT found at subcollection: ${ref2.path}`);
    }

  } catch (error) {
    console.error("Failed:", error);
  } finally {
    process.exit(0);
  }
}

run();
