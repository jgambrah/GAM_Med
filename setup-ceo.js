const admin = require('firebase-admin');

// Ensure your serviceAccountKey.json is in the same folder!
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// THE NEW UPDATED CEO EMAIL
const ceoEmail = 'marcusamosah@gmail.com'; 

async function grantSuperAdminRole(email) {
  try {
    const user = await admin.auth().getUserByEmail(email);
    
    // 1. Set Custom Claim (for faster client-side routing)
    await admin.auth().setCustomUserClaims(user.uid, {
      role: 'SUPER_ADMIN',
      company: 'GAM IT SOLUTIONS'
    });
    console.log(`✅ Custom claim 'SUPER_ADMIN' set for ${email}.`);
    
    // 2. Create document in 'app_ceos' (for security rules)
    const ceoRef = db.collection('app_ceos').doc(user.uid);
    await ceoRef.set({
        email: user.email,
        displayName: user.displayName || 'App CEO',
        grantedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`✅ CEO document created in 'app_ceos' collection.`);

    // 3. Create a corresponding user profile in '/users' collection
    // This helps with consistency and allows the CEO to have a profile like other users.
    const userRef = db.collection('users').doc(user.uid);
    await userRef.set({
      uid: user.uid,
      fullName: user.displayName || 'App CEO',
      email: user.email,
      role: 'SUPER_ADMIN', // Storing role here for client-side checks
      hospitalId: null, // Super admin is not tied to a hospital
      is_active: true,
      onboardingComplete: true, // CEO is always considered onboarded
      mustChangePassword: false, // CEO manages their own password
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true }); // Use merge to not overwrite if a basic profile already exists
    console.log(`✅ User profile document created/updated in 'users' collection.`);


    console.log("--------------------------------------------------");
    console.log(`SUCCESS: ${email} is now the APP CEO.`);
    console.log("You will need to log out and log back in for changes to take effect.");
    console.log("--------------------------------------------------");
    process.exit();
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
        console.error("\n❌ ERROR: User not found.");
        console.error(`Go to your app and SIGN UP with this email first: ${email}\n`);
    } else {
        console.error("❌ An unexpected error occurred:", error.message);
    }
    process.exit(1);
  }
}

grantSuperAdminRole(ceoEmail);
