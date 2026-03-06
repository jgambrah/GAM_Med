
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const { addDays } = require("date-fns");
const axios = require("axios");

// Initialize Firebase Admin SDK
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();


/**
 * Onboards a new staff member.
 * Creates an Auth user and a corresponding user profile in Firestore.
 */
exports.onboardStaff = onCall({ region: "us-central1", cors: true }, async (request) => {
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
exports.registerPatient = onCall({ region: "us-central1", cors: true }, async (request) => {
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
      const year = new Date().getFullYear().toString().slice(-2);
      newEhrNumber = `${prefix}/EHR/${year}/${String(newCounter).padStart(4, '0')}`;

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
 * Creates a new clinical encounter and updates patient status.
 */
exports.createEncounter = onCall({ region: "us-central1", cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be an authenticated staff member.');
  }

  const { 
    patientId, 
    patientName,
    vitals, 
    encounterType, 
    ...restOfEncounterData 
  } = request.data;
  
  const hospitalId = request.auth.token.hospitalId;

  if (!patientId || !hospitalId || !encounterType) {
    throw new HttpsError('invalid-argument', 'Missing required encounter data.');
  }

  const batch = db.batch();
  
  // 1. Create the new encounter document
  const encounterRef = db.collection('hospitals').doc(hospitalId).collection('patients').doc(patientId).collection('encounters').doc();
  
  const fullVitals = vitals ? {
      ...vitals,
      bp: (vitals.systolic && vitals.diastolic) ? `${vitals.systolic}/${vitals.diastolic}` : ''
  } : {};
  
  batch.set(encounterRef, {
    id: encounterRef.id,
    patientId,
    hospitalId,
    patientName,
    type: encounterType,
    providerUid: request.auth.uid,
    providerName: request.auth.token.name || 'Unknown Staff',
    providerRole: request.auth.token.role || 'UNKNOWN',
    vitals: fullVitals,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    ...restOfEncounterData
  });

  // 2. Update patient status and denormalize vitals if taken
  const patientRef = db.collection('hospitals').doc(hospitalId).collection('patients').doc(patientId);
  const updatePayload = {
      status: 'Waiting for Assignment', // Ready for doctor
      lastVitals: fullVitals,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  
  if (vitals && (vitals.systolic || vitals.temp)) {
    batch.update(patientRef, updatePayload);
  }

  // 3. FINANCIAL HANDSHAKE: If it's a consultation, add a billing item
  if (encounterType === 'Consultation') {
    const billingRef = db.collection('hospitals').doc(hospitalId).collection('billing_items').doc();
    batch.set(billingRef, {
      patientId,
      patientName,
      hospitalId,
      encounterId: encounterRef.id,
      description: 'OPD Consultation Fee',
      category: 'CONSULTATION',
      qty: 1,
      unitPrice: 50, // This could be fetched from a services catalog later
      total: 50,
      status: 'UNPAID',
      billedBy: request.auth.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  try {
    await batch.commit();
    return { success: true, encounterId: encounterRef.id, message: 'Encounter created successfully.' };
  } catch (error) {
    console.error("Encounter creation failed:", error);
    throw new HttpsError('internal', 'Failed to save encounter data.');
  }
});


/**
 * Creates a new ward and automatically provisions the specified number of beds.
 */
exports.createWardAndBeds = onCall({ region: "us-central1", cors: true }, async (request) => {
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
exports.provisionFullHospital = onCall({ region: "us-central1", secrets: ["PAYSTACK_SECRET_KEY"], cors: true }, async (request) => {
  if (request.auth?.token.role !== 'SUPER_ADMIN') {
    throw new HttpsError('permission-denied', 'You must be a Super Admin to perform this action.');
  }

  const {
    hospitalName,
    region,
    directorEmail,
    directorName,
    mrnPrefix,
    subscriptionPlan,
  } = request.data;

  if (!hospitalName || !directorEmail || !mrnPrefix) {
    throw new HttpsError('invalid-argument', 'Missing required fields for hospital provisioning.');
  }
  
  const hospitalRef = db.collection('hospitals').doc(); // Auto-generate ID for the new hospital
  const hospitalId = hospitalRef.id;

  try {
    // Transaction for atomicity
    await db.runTransaction(async (transaction) => {
        // 1. Create Director Auth Account
        const directorUserRecord = await admin.auth().createUser({
            email: directorEmail,
            password: 'Password123!', // Standard initial password
            displayName: directorName,
        });
        
        // 2. Set Custom Claims for Director
        await admin.auth().setCustomUserClaims(directorUserRecord.uid, {
          role: 'DIRECTOR',
          hospitalId: hospitalId
        });

        // 3. Create Hospital Document with all details
        transaction.set(hospitalRef, {
            hospitalId: hospitalId,
            name: hospitalName,
            region: region,
            directorUid: directorUserRecord.uid,
            directorEmail: directorEmail,
            mrnPrefix: mrnPrefix,
            subscriptionPlan: subscriptionPlan,
            status: 'active',
            isSuspended: false,
            subscriptionStatus: 'ACTIVE',
            patientCounter: 0,
            poCounter: 0,
            pvCounter: 0,
            receiptCounter: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            trialExpiry: admin.firestore.Timestamp.fromDate(addDays(new Date(), 30)),
            nextBillingDate: admin.firestore.Timestamp.fromDate(addDays(new Date(), 30)),
            gracePeriodExpiry: admin.firestore.Timestamp.fromDate(addDays(new Date(), 35)),
        });

        // 4. Create Director's Firestore Profile in /users
        const userRef = db.collection('users').doc(directorUserRecord.uid);
        transaction.set(userRef, {
          uid: directorUserRecord.uid,
          fullName: directorName,
          email: directorEmail,
          role: 'DIRECTOR',
          hospitalId: hospitalId,
          is_active: true,
          mustChangePassword: true,
          onboardingComplete: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 5. Update Global Platform Analytics
        const configRef = db.doc('platform_config/summary');
        transaction.update(configRef, {
            totalFacilities: admin.firestore.FieldValue.increment(1),
            [`regionalBreakdown.${region}`]: admin.firestore.FieldValue.increment(1)
        });
        
        // 6. PROVISION STANDARD CHART OF ACCOUNTS (Not in transaction, can be separate)
        const coaBatch = db.batch();
        const starterCOA = [
          { code: '1000', name: 'GCB Operations Bank', category: 'ASSETS' },
          { code: '1001', name: 'Petty Cash Vault', category: 'ASSETS' },
          { code: '1099', name: 'Accumulated Depreciation', category: 'LIABILITIES' },
          { code: '1200', name: 'Accounts Receivable (NHIS)', category: 'ASSETS' },
          { code: '2000', name: 'Accounts Payable (Suppliers)', category: 'LIABILITIES' },
          { code: '2100', name: 'Withholding Tax Payable (GRA)', category: 'LIABILITIES', isSystemAccount: true },
          { code: '3000', name: 'Director Capital Contribution', category: 'CAPITAL' },
          { code: '4000', name: 'Clinical Revenue (Cash)', category: 'REVENUE' },
          { code: '5000', name: 'Staff Salary Expense', category: 'EXPENSES' },
          { code: '5005', name: 'Depreciation Expense', category: 'EXPENSES' },
        ];
        const coaCollectionRef = hospitalRef.collection('chart_of_accounts');
        starterCOA.forEach(acc => {
            const newAccRef = coaCollectionRef.doc();
            coaBatch.set(newAccRef, { ...acc, currentBalance: 0, hospitalId: hospitalId });
        });
        await coaBatch.commit();
    });

    return { success: true, hospitalId: hospitalId, message: `${hospitalName} provisioned successfully.` };
  } catch (error) {
    console.error("Full Hospital Provisioning Failed:", error);
    throw new HttpsError('internal', error.message);
  }
});


/**
 * Sends an SMS message via a third-party gateway.
 */
exports.sendClinicalSms = onCall({ region: "us-central1", cors: true }, async (request) => {
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
exports.repairUserIdentity = onCall({ region: "us-central1", cors: true }, async (request) => {
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

// --------------------------------
// AUTOMATED AUDIT TRIGGERS (CEO SURVEILLANCE)
// --------------------------------

// 1. MONITOR: New Patient Registrations
exports.auditPatientRegistration = onDocumentCreated("hospitals/{hospitalId}/patients/{patientId}", async (event) => {
  const data = event.data.data();
  if (!data) return null;
  
  return admin.firestore().collection("global_audit_logs").add({
    type: 'CLINICAL',
    action: 'PATIENT_REGISTERED',
    hospitalId: data.hospitalId,
    actorName: 'Front Desk / System',
    details: `New EHR created for ${data.firstName} ${data.lastName}`,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
});

// 2. MONITOR: Financial Inflows (Payments)
exports.auditPayments = onDocumentCreated("hospitals/{hospitalId}/payments/{paymentId}", async (event) => {
  const data = event.data.data();
  if (!data) return null;

  return admin.firestore().collection("global_audit_logs").add({
    type: 'FINANCIAL',
    action: 'PAYMENT_RECEIVED',
    hospitalId: data.hospitalId,
    actorName: data.processedByName || 'Cashier',
    details: `Revenue Secured: GHS ${data.totalAmount} from ${data.patientName}`,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
});

// 3. MONITOR: Critical Hospital Status Changes (Kill-Switch)
exports.auditHospitalStatus = onDocumentUpdated("hospitals/{hospitalId}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (!before || !after) return null;

  if (before.status !== after.status) {
    return admin.firestore().collection("global_audit_logs").add({
      type: 'SECURITY',
      action: 'FACILITY_STATUS_CHANGE',
      hospitalId: event.params.hospitalId,
      actorName: 'App CEO / Autopilot',
      details: `Hospital status moved from ${before.status} to ${after.status}`,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  }
  return null;
});

// 4. MONITOR: Large Procurement Orders
exports.auditPurchaseOrders = onDocumentCreated("hospitals/{hospitalId}/purchase_orders/{poId}", async (event) => {
  const data = event.data.data();
  if (!data) return null;
  
  const totalValue = (data.items || []).reduce((sum, item) => sum + ((item.price || 0) * (item.quantityOrdered || 0)), 0);

  if (totalValue > 5000) { // Only log large orders to CEO
    return admin.firestore().collection("global_audit_logs").add({
      type: 'FINANCIAL',
      action: 'LARGE_PO_ISSUED',
      hospitalId: data.hospitalId,
      actorName: data.orderedByName,
      details: `High-value PO issued to ${data.supplierName} for GHS ${totalValue.toFixed(2)}`,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  }
  return null;
});
    
