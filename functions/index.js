
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { onCall, HttpsError, onRequest } = require("firebase-functions/v2/https");

// Initialize Firebase Admin SDK
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();


/**
 * Onboards a new staff member.
 * Creates an Auth user and a corresponding user profile in Firestore.
 */
exports.onboardStaff = onCall({ region: "us-central1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be an authenticated administrator.');
  }

  const { fullName, email, role, contractType, ...optionalData } = request.data;
  const hospitalId = request.auth.token.hospitalId;

  if (!hospitalId) {
    throw new HttpsError('failed-precondition', 'Caller is not associated with a hospital.');
  }

  try {
    // 1. Create Auth Account
    const userRecord = await admin.auth().createUser({
      email: email,
      password: "Staff123!", // Default password
      displayName: fullName,
    });

    // 2. Set Custom Claims
    await admin.auth().setCustomUserClaims(userRecord.uid, { role, hospitalId, contractType });

    // 3. Create Firestore User Profile
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      fullName,
      email,
      role,
      hospitalId,
      contractType,
      is_active: true,
      mustChangePassword: true,
      onboardingComplete: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      ...optionalData
    });

    return { success: true, message: `${fullName} onboarded successfully.` };
  } catch (error) {
    console.error("Onboarding failed:", error);
    throw new HttpsError('internal', error.message);
  }
});


/**
 * Registers a new patient and assigns a unique EHR number.
 */
exports.registerPatient = onCall({ region: "us-central1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be an authenticated staff member.');
  }

  const hospitalId = request.auth.token.hospitalId;
  const registeringStaffId = request.auth.uid;
  const hospitalRef = db.collection('hospitals').doc(hospitalId);

  try {
    const patientData = request.data;
    let newEhrNumber;

    // Transaction to safely increment patient counter and create patient
    await db.runTransaction(async (transaction) => {
      const hospitalDoc = await transaction.get(hospitalRef);
      if (!hospitalDoc.exists) {
        throw new HttpsError('not-found', 'Hospital record not found.');
      }
      
      const hospital = hospitalDoc.data();
      const newCounter = (hospital.patientCounter || 0) + 1;
      const prefix = hospital.mrnPrefix || 'GAM';
      newEhrNumber = `${prefix}-${String(newCounter).padStart(6, '0')}`;

      const patientRef = db.collection('hospitals').doc(hospitalId).collection('patients').doc();
      transaction.set(patientRef, {
        ...patientData,
        ehrNumber: newEhrNumber,
        hospitalId: hospitalId,
        registeredBy: registeringStaffId,
        status: 'Awaiting Vitals',
        checkInTime: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      transaction.update(hospitalRef, { patientCounter: newCounter });
    });

    return { success: true, ehrNumber: newEhrNumber };
  } catch (error) {
    console.error("Patient registration failed:", error);
    throw new HttpsError('internal', error.message);
  }
});

/**
 * Creates a new ward and automatically provisions the specified number of beds.
 */
exports.createWardAndBeds = onCall({ region: "us-central1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be an authenticated administrator.');
  }
  
  const { name, prefix, capacity } = request.data;
  const hospitalId = request.auth.token.hospitalId;

  try {
    const wardRef = db.collection('hospitals').doc(hospitalId).collection('wards').doc();
    
    const batch = db.batch();
    
    batch.set(wardRef, {
      wardId: wardRef.id,
      name,
      prefix,
      capacity,
      occupancy: 0,
      hospitalId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    for (let i = 1; i <= capacity; i++) {
      const bedId = `${prefix}-${String(i).padStart(3, '0')}`;
      const bedRef = wardRef.collection('beds').doc(bedId);
      batch.set(bedRef, {
        bedId: bedId,
        wardId: wardRef.id,
        wardName: name,
        hospitalId: hospitalId,
        status: 'Available',
        patientId: null,
        admittedAt: null,
      });
    }

    await batch.commit();
    return { success: true, message: `Ward '${name}' and ${capacity} beds created.` };
  } catch (error) {
    console.error("Ward creation failed:", error);
    throw new HttpsError('internal', error.message);
  }
});

/**
 * A CEO-level function to provision a new hospital tenant.
 */
exports.provisionFullHospital = onCall({ region: "us-central1" }, async (request) => {
  // Logic for CEO-level hospital creation would go here.
  // This is a placeholder for a complex operation.
  console.log("Provisioning request received:", request.data);
  return { success: true, hospitalId: `prov-${Date.now()}`, message: "Provisioning initiated." };
});

/**
 * Sends an SMS message via a third-party gateway.
 */
exports.sendClinicalSms = onCall({ region: "us-central1" }, async (request) => {
    // In a real app, you would use a secret for the API key.
    // const smsApiKey = functions.config().sms.key;
    const smsApiKey = "YOUR_SMS_GATEWAY_API_KEY"; 
    const { phoneNumber, message, hospitalId, senderId } = request.data;
    
    // This is a mock API call. Replace with your actual SMS provider's API.
    const url = `https://api.sms-provider.com/send`;
    
    try {
        await axios.post(url, {
            to: phoneNumber,
            from: senderId || 'GamMed',
            message: message,
            api_key: smsApiKey
        });
        
        // Log the SMS for billing/auditing
        await db.collection('sms_logs').add({
            hospitalId,
            recipient: phoneNumber,
            message,
            status: 'SENT',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return { success: true };
    } catch (error) {
        console.error("SMS sending failed:", error);
        throw new HttpsError('internal', 'Could not send SMS.');
    }
});


/**
 * A CEO-level security tool to repair a user's roles and hospital assignment.
 */
exports.repairUserIdentity = onCall({ region: "us-central1" }, async (request) => {
  if (request.auth?.token.role !== 'SUPER_ADMIN') {
    throw new HttpsError('permission-denied', 'You must be a Super Admin.');
  }

  const { targetEmail, hospitalId, role } = request.data;

  try {
    const user = await admin.auth().getUserByEmail(targetEmail);
    
    await admin.auth().setCustomUserClaims(user.uid, { hospitalId, role });

    // Also update the firestore doc for consistency
    await db.collection('users').doc(user.uid).update({ hospitalId, role });

    return { success: true, message: `Identity for ${targetEmail} has been re-stamped.` };
  } catch (error) {
    console.error("Identity repair failed:", error);
    throw new HttpsError('internal', error.message);
  }
});
