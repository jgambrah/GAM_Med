const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, query, where, getDocs, collectionGroup } = require('firebase/firestore');

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

const hospitalId = "GAM-GAR-7578";
const patientId = "edG6zYJI37B37hFrTsso";

async function run() {
  try {
    console.log("Signing in...");
    await signInWithEmailAndPassword(auth, "jamesobrempong@gmail.com", "Staff123!");
    console.log("Signed in successfully. UID:", auth.currentUser.uid);
    
    // 1. Check top-level encounters collection
    console.log("Checking top-level encounters where patientId == ", patientId);
    const topQ = query(collection(db, "encounters"), where("patientId", "==", patientId));
    const topSnap = await getDocs(topQ);
    console.log(`Found ${topSnap.size} documents in top-level /encounters`);
    topSnap.forEach(doc => {
      console.log(doc.id, "=> Path:", doc.ref.path, JSON.stringify(doc.data(), null, 2));
    });

    // 2. Check patient encounters subcollection
    console.log(`Checking subcollection hospitals/${hospitalId}/patients/${patientId}/encounters`);
    const subQ = query(collection(db, `hospitals/${hospitalId}/patients/${patientId}/encounters`));
    const subSnap = await getDocs(subQ);
    console.log(`Found ${subSnap.size} documents in subcollection`);
    subSnap.forEach(doc => {
      console.log(doc.id, "=> Path:", doc.ref.path, JSON.stringify(doc.data(), null, 2));
    });

  } catch (error) {
    console.error("Failed:", error);
  } finally {
    process.exit(0);
  }
}

run();
