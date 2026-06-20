const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, query, where, orderBy, getDocs } = require('firebase/firestore');

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
    
    console.log(`Querying: hospitals/${hospitalId}/patients/${patientId}/encounters`);
    const q = query(
      collection(db, `hospitals/${hospitalId}/patients/${patientId}/encounters`),
      where("encounterType", "==", "ANC Visit"),
      orderBy("createdAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    console.log(`Query successful! Found ${querySnapshot.size} documents.`);
    querySnapshot.forEach(doc => {
      console.log(doc.id, "=>", doc.data());
    });
  } catch (error) {
    console.error("Query failed:", error);
  } finally {
    process.exit(0);
  }
}

run();
