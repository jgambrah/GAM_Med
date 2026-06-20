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

async function run() {
  try {
    console.log("Signing in...");
    const userCredential = await signInWithEmailAndPassword(auth, "jamesobrempong@gmail.com", "Staff123!");
    const user = userCredential.user;
    console.log("Signed in successfully. UID:", user.uid);
    
    // Get user document
    const userDocRef = doc(db, "users", user.uid);
    console.log("Fetching /users/" + user.uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      console.log("User document data:", JSON.stringify(userDocSnap.data(), null, 2));
    } else {
      console.log("User document does not exist in Firestore /users collection!");
    }
  } catch (error) {
    console.error("Error occurred:", error);
  } finally {
    process.exit(0);
  }
}

run();
