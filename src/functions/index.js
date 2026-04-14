// Version 2.2 - Permissions Bound & Logic Synchronized

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

// THE RESILIENCE WRAPPER
const GLOBAL_CONFIG = {
  region: "us-central1",
  cors: true,
  invoker: "public",
  maxInstances: 10
};

// 1. ROBUST HISTORY LOADER
exports.getPatientHistory = onCall(GLOBAL_CONFIG, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login Required');
  
  const currentHospitalId = request.auth.token.hospitalId;
  
  try {
    const { ghanaCardId, homeHospitalId } = request.data;
    if (!ghanaCardId) throw new HttpsError("invalid-argument", "MISSING_GHANA_CARD_ID");

    // SECURITY CHECK
    if (currentHospitalId !== homeHospitalId) {
      const consentDoc = await db.collection("patient_consents").doc(ghanaCardId).get();
      if (!consentDoc.exists || !consentDoc.data().consentedHospitals[currentHospitalId]) {
        console.log(`Permission denied for ${currentHospitalId} on patient ${ghanaCardId}`);
        return { success: false, reason: 'PERMISSION_REQUIRED' };
      }
    }
    
    console.log(`Auditing Clinical History for Ghana Card: ${ghanaCardId}`);

    const snap = await db.collectionGroup("encounters")
      .where("ghanaCardId", "==", ghanaCardId)
      .orderBy("createdAt", "desc")
      .get();

    return { 
      success: true, 
      data: snap.docs.map(d => ({ id: d.id, ...d.data() })) 
    };
  } catch (error) {
    console.error("FATAL: getPatientHistory", error.code, error.message, error.stack);
    throw new HttpsError('internal', error.message || 'Unknown database error');
  }
});

// 2. ROBUST ENCOUNTER CREATOR
exports.createEncounter = onCall(GLOBAL_CONFIG, async (request) => {
  // Security Gate first
  if (!request.auth) throw new HttpsError('unauthenticated', 'Session Expired.');
  
  const hId = request.auth.token.hospitalId;
  if (!hId) throw new HttpsError('unauthenticated', 'User not associated with a hospital.');

  const data = request.data;
  
  try {
    const clean = (val) => (val === undefined || val === null ? "" : val);

    if (!data.patientId) throw new Error("CRITICAL_MISSING_FIELD: patientId");

    const patientRef = db.collection("hospitals").doc(hId).collection("patients").doc(data.patientId);
    const patientDoc = await patientRef.get();
    
    // THE CRITICAL FIX: .exists is a property, not a function
    if (!patientDoc.exists) {
      throw new HttpsError('not-found', `Patient record [${data.patientId}] not found in this facility.`);
    }

    const patientData = patientDoc.data();
    const batch = db.batch();
    const encounterRef = db.collection("encounters").doc();

    const sanitizedVitals = data.vitals || {};
    const encounterDoc = {
      id: encounterRef.id,
      patientId: data.patientId,
      patientName: data.patientName || "N/A",
      ghanaCardId: data.ghanaCardId || "N/A",
      ehrNumber: patientData.ehrNumber,
      hospitalId: hId,
      hospitalName: data.hospitalName || "N/A",
      providerUid: request.auth.uid,
      providerName: request.auth.token.name || "Medical Officer",
      providerRole: request.auth.token.role,
      encounterType: data.encounterType || 'OPD Consultation',
      vitals: {
        bp: sanitizedVitals.bp || "",
        temp: sanitizedVitals.temp || "",
        pulse: sanitizedVitals.pulse || "",
        respiration: sanitizedVitals.respiration || "",
        weight: sanitizedVitals.weight || "",
        height: sanitizedVitals.height || "",
        bmi: sanitizedVitals.bmi || ""
      },
      chiefComplaint: clean(data.chiefComplaint),
      hpi: clean(data.hpi),
      diagnosis: clean(data.diagnosis),
      isExternal: data.isExternal || false,
      items: data.items || [],
      prescription: data.items || [],
      labOrders: data.labOrders || [],
      radiologyOrders: data.radiologyOrders || [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    batch.set(encounterRef, encounterDoc);

    batch.update(patientRef, {
      status: 'Waiting for Assignment',
      lastSeenAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await batch.commit();
    return { success: true, encounterId: encounterRef.id };

  } catch (error) {
    console.error("FATAL: createEncounter", error.code, error.message, error.stack);
    throw new HttpsError('internal', error.message);
  }
});


/**
 * Onboards a new staff member.
 */
exports.onboardStaff = onCall(GLOBAL_CONFIG, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be an authenticated administrator.');
  }

  const { fullName, email, role, contractType, ...optionalData } = request.data;
  const hospitalId = request.auth.token.hospitalId;

  if (!hospitalId) {
    throw new HttpsError('failed-precondition', 'Caller is not associated with a hospital.');
  }
  
  const hospitalRef = db.collection('hospitals').doc(hospitalId);

  try {
    const userRecord = await admin.auth().createUser({
      email: email,
      password: "Staff123!",
      displayName: fullName,
    });

    await admin.auth().setCustomUserClaims(userRecord.uid, { role, hospitalId, contractType });
    
    let newStaffNumber;

    await db.runTransaction(async (transaction) => {
        const hospitalDoc = await transaction.get(hospitalRef);
        if (!hospitalDoc.exists) {
            throw new HttpsError('not-found', 'Hospital record not found.');
        }

        const hospital = hospitalDoc.data();
        const newCounter = (hospital.staffCounter || 0) + 1;
        const prefix = hospital.mrnPrefix || 'GAM';
        const year = new Date().getFullYear().toString().slice(-2);
        newStaffNumber = `${prefix}/STF/${year}/${String(newCounter).padStart(4, '0')}`;
        
        const userRef = db.collection('users').doc(userRecord.uid);
        
        transaction.set(userRef, {
            uid: userRecord.uid,
            fullName, email, role, hospitalId, contractType,
            staffNumber: newStaffNumber,
            is_active: true, mustChangePassword: true, onboardingComplete: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            ...optionalData
        });
        
        transaction.update(hospitalRef, { staffCounter: newCounter });
    });


    return { success: true, message: `${fullName} onboarded with Staff ID: ${newStaffNumber}.` };
  } catch (error) {
    console.error("FATAL: onboardStaff", error.code, error.message, error.stack);
    throw new HttpsError('internal', error.message);
  }
});


/**
 * Registers a new patient and assigns a unique EHR number.
 */
exports.registerPatient = onCall(GLOBAL_CONFIG, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'You must be an authenticated staff member.');
  
  const userProfileDoc = await db.collection("users").doc(request.auth.uid).get();
  if (!userProfileDoc.exists) throw new HttpsError("not-found", "Your user profile could not be found.");
  const hospitalId = userProfileDoc.data().hospitalId;
  if (!hospitalId) throw new HttpsError("failed-precondition", "Your account is not associated with a hospital.");

  const registeringStaffId = request.auth.uid;
  const hospitalRef = db.collection('hospitals').doc(hospitalId);

  try {
    const patientData = request.data;
    let newEhrNumber;

    await db.runTransaction(async (transaction) => {
      const hospitalDoc = await transaction.get(hospitalRef);
      if (!hospitalDoc.exists) throw new HttpsError('not-found', 'Hospital record not found.');
      
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
        homeHospitalId: hospitalId, // Set home hospital on creation
        registeredBy: registeringStaffId,
        status: 'Awaiting Vitals',
        checkInTime: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      transaction.update(hospitalRef, { patientCounter: newCounter });
    });

    return { success: true, ehrNumber: newEhrNumber };
  } catch (error) {
    console.error("FATAL: registerPatient", error.code, error.message, error.stack);
    throw new HttpsError('internal', error.message);
  }
});


/**
 * Creates a new ward and automatically provisions the specified number of beds.
 */
exports.createWardAndBeds = onCall(GLOBAL_CONFIG, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'You must be an authenticated administrator.');
  
  const { name, prefix, capacity } = request.data;
  const hospitalId = request.auth.token.hospitalId;

  try {
    const wardRef = db.collection('hospitals').doc(hospitalId).collection('wards').doc();
    
    const batch = db.batch();
    
    batch.set(wardRef, {
      wardId: wardRef.id, name, prefix, capacity, occupancy: 0, hospitalId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    for (let i = 1; i <= capacity; i++) {
      const bedId = `${prefix}-${String(i).padStart(3, '0')}`;
      const bedRef = wardRef.collection('beds').doc(bedId);
      batch.set(bedRef, {
        bedId: bedId, wardId: wardRef.id, wardName: name, hospitalId: hospitalId,
        status: 'Available', patientId: null, admittedAt: null,
      });
    }

    await batch.commit();
    return { success: true, message: `Ward '${name}' and ${capacity} beds created.` };
  } catch (error) {
    console.error("FATAL: createWardAndBeds", error.code, error.message, error.stack);
    throw new HttpsError('internal', error.message);
  }
});


/**
 * A CEO-level function to provision a new hospital tenant.
 */
exports.provisionFullHospital = onCall(GLOBAL_CONFIG, async (request) => {
  if (request.auth?.token.role !== 'SUPER_ADMIN') {
    throw new HttpsError('permission-denied', 'You must be a Super Admin to perform this action.');
  }

  const {
    hospitalName, region, directorEmail, directorName,
    mrnPrefix, subscriptionPlan, monthlyRateNumeric, monthlyRateWords,
  } = request.data;
  
  const defaultPassword = "password123";
  
  if (!monthlyRateWords || monthlyRateWords.length < 10) {
     throw new HttpsError('invalid-argument', 'You must type the subscription amount in words to authorize.');
  }

  if (!hospitalName || !directorEmail || !mrnPrefix) {
    throw new HttpsError('invalid-argument', 'Missing required fields for hospital provisioning.');
  }
  
  const hospitalRef = db.collection('hospitals').doc();
  const hospitalId = hospitalRef.id;
  const cleanDirectorEmail = directorEmail.toLowerCase().trim();

  try {
    // Perform Auth operations OUTSIDE the transaction
    const directorUserRecord = await admin.auth().createUser({
        email: cleanDirectorEmail,
        password: defaultPassword,
        displayName: directorName,
    });
    
    await admin.auth().setCustomUserClaims(directorUserRecord.uid, {
      role: 'DIRECTOR',
      hospitalId: hospitalId
    });

    // Transaction for Firestore atomicity
    await db.runTransaction(async (transaction) => {
        transaction.set(hospitalRef, {
            hospitalId: hospitalId, name: hospitalName, region: region,
            directorUid: directorUserRecord.uid, directorEmail: cleanDirectorEmail,
            mrnPrefix: mrnPrefix, subscriptionPlan: subscriptionPlan,
            agreedRate: monthlyRateNumeric, agreedRateWords: monthlyRateWords,
            provisioningSecret: defaultPassword, status: 'active', isSuspended: false,
            subscriptionStatus: 'ACTIVE', mustChangePassword: true,
            patientCounter: 0, staffCounter: 0, poCounter: 0, pvCounter: 0,
            receiptCounter: 0, referralCounter: 0, nhisBatchCounter: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            trialExpiry: admin.firestore.Timestamp.fromDate(addDays(new Date(), 30)),
            nextBillingDate: admin.firestore.Timestamp.fromDate(addDays(new Date(), 30)),
            gracePeriodExpiry: admin.firestore.Timestamp.fromDate(addDays(new Date(), 35)),
        });

        const userRef = db.collection('users').doc(directorUserRecord.uid);
        transaction.set(userRef, {
          uid: directorUserRecord.uid, fullName: directorName, email: cleanDirectorEmail,
          role: 'DIRECTOR', hospitalId: hospitalId, is_active: true,
          mustChangePassword: true, onboardingComplete: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        const configRef = db.doc('platform_config/summary');
        const configDoc = await transaction.get(configRef);
        if(configDoc.exists) {
            transaction.update(configRef, {
                totalFacilities: admin.firestore.FieldValue.increment(1),
                [`regionalBreakdown.${region}`]: admin.firestore.FieldValue.increment(1)
            });
        }
    });

    // Post-transaction batch for non-critical setup
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

    return { success: true, hospitalId: hospitalId, message: `${hospitalName} provisioned successfully.` };
  } catch (error) {
    console.error("FATAL: provisionFullHospital", error.code, error.message, error.stack);
    throw new HttpsError('internal', error.message);
  }
});

exports.sendClinicalSms = onCall(GLOBAL_CONFIG, async (request) => {
    const smsApiKey = process.env.SMS_API_KEY; // Corrected
    const { phoneNumber, message, hospitalId, senderId } = request.data;
    const url = `https://api.sms-provider.com/send`;
    
    try {
        if (!smsApiKey || smsApiKey === "YOUR_SMS_GATEWAY_API_KEY") {
            console.warn("SMS_API_KEY not configured. Skipping SMS send.");
            return { success: false, message: "SMS gateway not configured."};
        }
        await axios.post(url, { to: phoneNumber, from: senderId || 'GamMed', message, api_key: smsApiKey });
        await db.collection('sms_logs').add({ hospitalId, recipient: phoneNumber, message, status: 'SENT', createdAt: admin.firestore.FieldValue.serverTimestamp() });
        return { success: true };
    } catch (error) {
        console.error("FATAL: sendClinicalSms", error.code, error.message, error.stack);
        throw new HttpsError('internal', 'Could not send SMS.');
    }
});


exports.createReferral = onCall(GLOBAL_CONFIG, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'You must be an authenticated staff member.');
  
  const { patientId, patientName, ehrNumber, latestEncounter, ...formData } = request.data;
  const hospitalId = request.auth.token.hospitalId;
  const hospitalRef = db.collection('hospitals').doc(hospitalId);

  try {
    let newRefNumber, newReferralId;

    await db.runTransaction(async (transaction) => {
      const hospitalDoc = await transaction.get(hospitalRef);
      if (!hospitalDoc.exists) throw new HttpsError('not-found', 'Hospital record not found.'); // Corrected

      const hospital = hospitalDoc.data();
      const newCounter = (hospital.referralCounter || 0) + 1;
      const prefix = hospital.mrnPrefix || 'GAM';
      const year = new Date().getFullYear().toString().slice(-2);
      newRefNumber = `${prefix}/REF/${year}/${String(newCounter).padStart(3, '0')}`;

      const referralRef = db.collection('referrals').doc();
      newReferralId = referralRef.id;
      
      transaction.set(referralRef, {
        ...formData, referralNumber: newRefNumber, patientId, patientName, ehrNumber,
        vitalsAtReferral: latestEncounter?.vitals || {},
        medications: latestEncounter?.prescription || [],
        hospitalId, referringDoctor: request.auth.token.name, status: 'ISSUED',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      transaction.update(hospitalRef, { referralCounter: newCounter });
    });

    return { success: true, referralId: newReferralId, referralNumber: newRefNumber };
  } catch (error) {
    console.error("FATAL: createReferral", error.code, error.message, error.stack);
    throw new HttpsError('internal', error.message);
  }
});


exports.repairUserIdentity = onCall(GLOBAL_CONFIG, async (request) => {
  if (request.auth?.token.role !== 'SUPER_ADMIN') {
    throw new HttpsError('permission-denied', 'You must be a Super Admin.');
  }
  const { targetEmail, hospitalId, role } = request.data;
  try {
    const user = await admin.auth().getUserByEmail(targetEmail);
    await admin.auth().setCustomUserClaims(user.uid, { hospitalId, role });
    await db.collection('users').doc(user.uid).update({ hospitalId, role });
    return { success: true, message: `Identity for ${targetEmail} has been re-stamped.` };
  } catch (error) {
    console.error("FATAL: repairUserIdentity", error.code, error.message, error.stack);
    throw new HttpsError('internal', error.message);
  }
});

// --- AUTOMATED AUDIT TRIGGERS ---
exports.auditPatientRegistration = onDocumentCreated("hospitals/{hospitalId}/patients/{patientId}", async (event) => {
  const data = event.data.data();
  if (!data) return null;
  const actor = await admin.auth().getUser(data.registeredBy);
  return db.collection("global_audit_logs").add({
    type: 'CLINICAL', action: 'PATIENT_REGISTERED',
    hospitalId: data.hospitalId || 'Unknown', actorId: data.registeredBy,
    actorName: actor.displayName || 'System',
    details: `New EHR created for ${data.firstName} ${data.lastName} (${data.ehrNumber})`,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
});

exports.auditPayments = onDocumentCreated("hospitals/{hospitalId}/payments/{paymentId}", async (event) => {
  const data = event.data.data();
  if (!data) return null;
  return db.collection("global_audit_logs").add({
    type: 'FINANCIAL', action: 'PAYMENT_RECEIVED',
    hospitalId: data.hospitalId, actorId: data.processedBy,
    actorName: data.processedByName || 'Cashier',
    details: `Revenue Secured: GHS ${data.totalAmount} from ${data.patientName} (Ref: ${data.paymentId})`,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
});

exports.auditHospitalStatus = onDocumentUpdated("hospitals/{hospitalId}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (!before || !after) return null;
  if (before.status !== after.status) {
    return db.collection("global_audit_logs").add({
      type: 'SECURITY', action: 'FACILITY_STATUS_CHANGE',
      hospitalId: event.params.hospitalId, actorId: 'SYSTEM',
      actorName: 'App CEO / System Autopilot',
      details: `Hospital status moved from ${before.status} to ${after.status}`,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  }
  return null;
});

exports.auditPurchaseOrders = onDocumentCreated("hospitals/{hospitalId}/purchase_orders/{poId}", async (event) => {
  const data = event.data.data();
  if (!data) return null;
  const totalValue = (data.items || []).reduce((sum, item) => sum + ((item.price || 0) * (item.quantityOrdered || 0)), 0);
  if (totalValue > 5000) {
    return db.collection("global_audit_logs").add({
      type: 'FINANCIAL', action: 'LARGE_PO_ISSUED',
      hospitalId: data.hospitalId, actorId: data.orderedBy,
      actorName: data.orderedByName || 'Procurement Officer',
      details: `High-value PO issued to ${data.supplierName} for GHS ${totalValue.toLocaleString()}`,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  }
  return null;
});
