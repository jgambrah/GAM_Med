
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

// ============================================================
// getPatientHistory — v2.2.0 (Enhanced Logging & Consent Check)
// Fetches unified encounter history across ALL hospitals
// using Ghana Card ID as the national patient identifier.
// ============================================================
exports.getPatientHistory = onCall({
  region: "us-central1",
  cors: true,
  invoker: "public",
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "The clinical request requires an authorized session.");
  }

  const { ghanaCardId, homeHospitalId } = request.data;
  const currentHospitalId = request.auth.token.hospitalId;

  if (!ghanaCardId) {
    throw new HttpsError("invalid-argument", "Ghana Card ID is missing from the request.");
  }

  try {
    // SECURITY CHECK:
    // If the doctor is NOT from the home hospital, check for explicit consent
    if (currentHospitalId !== homeHospitalId) {
      const consentRef = db.collection("patient_consents").doc(ghanaCardId);
      const consentSnap = await consentRef.get();
      
      if (!consentSnap.exists || !consentSnap.data().consentedHospitals?.[currentHospitalId]) {
        // Instead of an error, we return a specific message
        return { success: false, reason: 'PERMISSION_REQUIRED' };
      }
    }

    console.log(`Auditing Clinical History for Ghana Card: ${ghanaCardId}`);

    const snap = await db.collectionGroup("encounters")
      .where("ghanaCardId", "==", ghanaCardId)
      .orderBy("createdAt", "desc") // This is fine IF the index exists
      .get();

    return {
      success: true,
      data: snap.docs.map(d => ({ id: d.id, ...d.data() }))
    };
  } catch (error) {
    console.error("DETAILED_CLINICAL_ERROR:", error);
    throw new HttpsError('internal', error.message || 'Unknown database error');
  }
});


// ============================================================
// onboardStaff
// Creates an Auth user and Firestore profile for a new staff member.
// ============================================================
exports.onboardStaff = onCall({
  region: "us-central1",
  cors: true,
  invoker: "public",
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be an authenticated administrator.");
  }

  const adminProfileDoc = await db.collection("users").doc(request.auth.uid).get();
  if (!adminProfileDoc.exists) {
    throw new HttpsError("not-found", "Your user profile could not be found.");
  }
  const hospitalId = adminProfileDoc.data().hospitalId;
  if (!hospitalId) {
    throw new HttpsError("failed-precondition", "Caller is not associated with a hospital.");
  }

  const { fullName, email, role, contractType, ...optionalData } = request.data;
  const hospitalRef = db.collection("hospitals").doc(hospitalId);

  try {
    const userRecord = await admin.auth().createUser({
      email,
      password: "Staff123!",
      displayName: fullName,
    });

    await admin.auth().setCustomUserClaims(userRecord.uid, { role, hospitalId, contractType });

    let newStaffNumber;

    await db.runTransaction(async (transaction) => {
      const hospitalDoc = await transaction.get(hospitalRef);
      if (!hospitalDoc.exists) throw new HttpsError("not-found", "Hospital record not found.");

      const hospital = hospitalDoc.data();
      const newCounter = (hospital.staffCounter || 0) + 1;
      const prefix = hospital.mrnPrefix || "GAM";
      const year = new Date().getFullYear().toString().slice(-2);
      newStaffNumber = `${prefix}/STF/${year}/${String(newCounter).padStart(4, "0")}`;

      const userRef = db.collection("users").doc(userRecord.uid);
      transaction.set(userRef, {
        uid: userRecord.uid,
        fullName,
        email,
        role,
        hospitalId,
        contractType,
        staffNumber: newStaffNumber,
        is_active: true,
        mustChangePassword: true,
        onboardingComplete: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        ...optionalData,
      });

      transaction.update(hospitalRef, { staffCounter: newCounter });
    });

    return { success: true, message: `${fullName} onboarded with Staff ID: ${newStaffNumber}.` };
  } catch (error) {
    console.error("Onboarding failed:", error);
    throw new HttpsError("internal", error.message);
  }
});


// ============================================================
// registerPatient
// Registers a new patient and assigns a unique EHR number.
// ============================================================
exports.registerPatient = onCall({
  region: "us-central1",
  cors: true,
  invoker: "public",
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be an authenticated staff member.");
  }

  const userProfileDoc = await db.collection("users").doc(request.auth.uid).get();
  if (!userProfileDoc.exists) throw new HttpsError("not-found", "Your user profile could not be found.");
  const hospitalId = userProfileDoc.data().hospitalId;
  if (!hospitalId) throw new HttpsError("failed-precondition", "Your account is not associated with a hospital.");


  const registeringStaffId = request.auth.uid;
  const hospitalRef = db.collection("hospitals").doc(hospitalId);

  try {
    const patientData = request.data;
    let newEhrNumber;

    // Transaction to safely increment patient counter and create patient
    await db.runTransaction(async (transaction) => {
      const hospitalDoc = await transaction.get(hospitalRef);
      if (!hospitalDoc.exists) {
        throw new HttpsError("not-found", "Hospital record not found.");
      }
      
      const hospital = hospitalDoc.data();
      const newCounter = (hospital.patientCounter || 0) + 1;
      const prefix = hospital.mrnPrefix || "GAM";
      const year = new Date().getFullYear().toString().slice(-2);
      newEhrNumber = `${prefix}/EHR/${year}/${String(newCounter).padStart(4, "0")}`;

      const patientRef = db.collection("hospitals").doc(hospitalId).collection("patients").doc();
      transaction.set(patientRef, {
        ...patientData,
        ehrNumber: newEhrNumber,
        homeHospitalId: hospitalId, // ✅ Set the home hospital on creation
        hospitalId: hospitalId,
        registeredBy: registeringStaffId,
        status: "Awaiting Vitals",
        checkInTime: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      transaction.update(hospitalRef, { patientCounter: newCounter });
    });

    return { success: true, ehrNumber: newEhrNumber };
  } catch (error) {
    console.error("Patient registration failed:", error);
    throw new HttpsError("internal", error.message);
  }
});

// ✅ THE CORRECTED FUNCTION
exports.createEncounter = onCall({ 
  region: "us-central1", 
  cors: true 
}, async (request) => {
  const data = request.data;
  const db = admin.firestore();

  // 1. Security Check
  if (!request.auth) throw new HttpsError('unauthenticated', 'Session Expired.');

  try {
    // DATA SANITIZATION: Prevents Firestore from crashing on 'undefined' values
    const clean = (val) => (val === undefined || val === null ? "" : val);

    // 2. Fetch the patient document to verify existence
    const patientRef = db.collection("hospitals").doc(data.hospitalId).collection("patients").doc(data.patientId);
    const patientDoc = await patientRef.get();

    // --- THE CRITICAL FIX (Line 188) ---
    // REMOVED the brackets (). It must be .exists, not .exists()
    if (!patientDoc.exists) {
      throw new HttpsError('not-found', 'Patient record not found in the system.');
    }

    const batch = db.batch();
    const encounterRef = db.collection("encounters").doc();

    // 3. CONSTRUCT THE DOCUMENT SAFELY
    const encounterData = {
      id: encounterRef.id,
      patientId: clean(data.patientId),
      patientName: clean(data.patientName),
      ghanaCardId: clean(data.ghanaCardId),
      hospitalId: clean(data.hospitalId),
      hospitalName: clean(data.hospitalName),
      providerUid: request.auth.uid,
      providerName: clean(request.auth.token.name),
      providerRole: clean(data.providerRole),
      encounterType: clean(data.encounterType || 'OPD Consultation'),
      vitals: {
        bp: clean(data.vitals?.bp),
        temp: clean(data.vitals?.temp),
        pulse: clean(data.vitals?.pulse),
        respiration: clean(data.vitals?.respiration),
        weight: clean(data.vitals?.weight),
        height: clean(data.vitals?.height),
        bmi: clean(data.vitals?.bmi),
        spo2: clean(data.vitals?.spo2),
      },
      chiefComplaint: clean(data.chiefComplaint),
      hpi: clean(data.hpi),
      diagnosis: clean(data.diagnosis || ""),
      isExternal: data.isExternal || false,
      items: data.items || [],
      prescription: data.items || [], // Legacy support
      labOrders: data.labOrders || [],
      radiologyOrders: data.radiologyOrders || [],
      hasPendingLabs: (data.labOrders || []).length > 0,
      hasPendingScans: (data.radiologyOrders || []).length > 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    batch.set(encounterRef, encounterData);

    // 4. UPDATE PATIENT MASTER STATUS
    batch.update(patientRef, {
      status: 'Waiting for Assignment',
      lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
      lastVitals: encounterData.vitals
    });

    await batch.commit();
    
    console.log(`✅ EHR Successfully Committed: ${encounterRef.id}`);
    return { success: true, encounterId: encounterRef.id };

  } catch (error) {
    console.error("CRITICAL_LOG: createEncounter failed:", error.message);
    throw new HttpsError('internal', error.message);
  }
});


/**
 * Creates a new ward and automatically provisions the specified number of beds.
 */
exports.createWardAndBeds = onCall({
  region: "us-central1",
  cors: true,
  invoker: "public",
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be an authenticated administrator.");
  }

  const { name, prefix, capacity } = request.data;
  const hospitalId = request.auth.token.hospitalId;

  try {
    const wardRef = db.collection("hospitals").doc(hospitalId).collection("wards").doc();
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
      const bedId = `${prefix}-${String(i).padStart(3, "0")}`;
      const bedRef = wardRef.collection("beds").doc(bedId);
      batch.set(bedRef, {
        bedId,
        wardId: wardRef.id,
        wardName: name,
        hospitalId,
        status: "Available",
        patientId: null,
        admittedAt: null,
      });
    }

    await batch.commit();
    return { success: true, message: `Ward '${name}' and ${capacity} beds created.` };
  } catch (error) {
    console.error("Ward creation failed:", error);
    throw new HttpsError("internal", error.message);
  }
});


/**
 * A CEO-level function to provision a new hospital tenant.
 */
exports.provisionFullHospital = onCall({
  region: "us-central1",
  cors: true,
  invoker: "public",
}, async (request) => {
  if (request.auth?.token.role !== "SUPER_ADMIN") {
    throw new HttpsError("permission-denied", "You must be a Super Admin to perform this action.");
  }

  const {
    hospitalName, region, directorEmail, directorName,
    mrnPrefix, subscriptionPlan, monthlyRateNumeric, monthlyRateWords,
  } = request.data;

  const defaultPassword = "password123";

  if (!monthlyRateWords || monthlyRateWords.length < 10) {
    throw new HttpsError("invalid-argument", "You must type the subscription amount in words to authorize.");
  }
  if (!hospitalName || !directorEmail || !mrnPrefix) {
    throw new HttpsError("invalid-argument", "Missing required fields for hospital provisioning.");
  }

  const hospitalRef = db.collection("hospitals").doc();
  const hospitalId = hospitalRef.id;
  const cleanDirectorEmail = directorEmail.toLowerCase().trim();

  try {
    await db.runTransaction(async (transaction) => {
      const directorUserRecord = await admin.auth().createUser({
        email: cleanDirectorEmail,
        password: defaultPassword,
        displayName: directorName,
      });

      await admin.auth().setCustomUserClaims(directorUserRecord.uid, {
        role: "DIRECTOR",
        hospitalId,
      });

      transaction.set(hospitalRef, {
        hospitalId,
        name: hospitalName,
        region,
        directorUid: directorUserRecord.uid,
        directorEmail: cleanDirectorEmail,
        mrnPrefix,
        subscriptionPlan,
        agreedRate: monthlyRateNumeric,
        agreedRateWords: monthlyRateWords,
        provisioningSecret: defaultPassword,
        status: "active",
        isSuspended: false,
        subscriptionStatus: "ACTIVE",
        mustChangePassword: true,
        patientCounter: 0,
        staffCounter: 0,
        poCounter: 0,
        pvCounter: 0,
        receiptCounter: 0,
        referralCounter: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        trialExpiry: admin.firestore.Timestamp.fromDate(addDays(new Date(), 30)),
        nextBillingDate: admin.firestore.Timestamp.fromDate(addDays(new Date(), 30)),
        gracePeriodExpiry: admin.firestore.Timestamp.fromDate(addDays(new Date(), 35)),
      });

      const userRef = db.collection("users").doc(directorUserRecord.uid);
      transaction.set(userRef, {
        uid: directorUserRecord.uid,
        fullName: directorName,
        email: cleanDirectorEmail,
        role: "DIRECTOR",
        hospitalId,
        is_active: true,
        mustChangePassword: true,
        onboardingComplete: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const configRef = db.doc("platform_config/summary");
      transaction.update(configRef, {
        totalFacilities: admin.firestore.FieldValue.increment(1),
        [`regionalBreakdown.${region}`]: admin.firestore.FieldValue.increment(1),
      });

      const coaBatch = db.batch();
      const starterCOA = [
        { code: "1000", name: "GCB Operations Bank", category: "ASSETS" },
        { code: "1001", name: "Petty Cash Vault", category: "ASSETS" },
        { code: "1099", name: "Accumulated Depreciation", category: "LIABILITIES" },
        { code: "1200", name: "Accounts Receivable (NHIS)", category: "ASSETS" },
        { code: "2000", name: "Accounts Payable (Suppliers)", category: "LIABILITIES" },
        { code: "2100", name: "Withholding Tax Payable (GRA)", category: "LIABILITIES", isSystemAccount: true },
        { code: "3000", name: "Director Capital Contribution", category: "CAPITAL" },
        { code: "4000", name: "Clinical Revenue (Cash)", category: "REVENUE" },
        { code: "5000", name: "Staff Salary Expense", category: "EXPENSES" },
        { code: "5005", name: "Depreciation Expense", category: "EXPENSES" },
      ];
      const coaCollectionRef = hospitalRef.collection("chart_of_accounts");
      starterCOA.forEach((acc) => {
        const newAccRef = coaCollectionRef.doc();
        coaBatch.set(newAccRef, { ...acc, currentBalance: 0, hospitalId });
      });
      await coaBatch.commit();
    });

    return { success: true, hospitalId, message: `${hospitalName} provisioned successfully.` };
  } catch (error) {
    console.error("Full Hospital Provisioning Failed:", error);
    throw new HttpsError("internal", error.message);
  }
});


/**
 * Sends an SMS message via a third-party gateway.
 */
exports.sendClinicalSms = onCall({
  region: "us-central1",
  cors: true,
  invoker: "public",
}, async (request) => {
  const smsApiKey = "YOUR_SMS_GATEWAY_API_KEY";
  const { phoneNumber, message, hospitalId, senderId } = request.data;

  try {
    await axios.post("https://api.sms-provider.com/send", {
      to: phoneNumber,
      from: senderId || "GamMed",
      message,
      api_key: smsApiKey,
    });

    await db.collection("sms_logs").add({
      hospitalId,
      recipient: phoneNumber,
      message,
      status: "SENT",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error("SMS sending failed:", error);
    throw new HttpsError("internal", "Could not send SMS.");
  }
});


/**
 * Creates a Clinical Referral and generates a unique referral number.
 */
exports.createReferral = onCall({
  region: "us-central1",
  cors: true,
  invoker: "public",
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "You must be an authenticated staff member.");

  const userProfileDoc = await db.collection("users").doc(request.auth.uid).get();
  if (!userProfileDoc.exists) throw new HttpsError("not-found", "Your user profile could not be found.");
  const hospitalId = userProfileDoc.data().hospitalId;
  const userName = userProfileDoc.data().fullName;
  if (!hospitalId) throw new HttpsError("failed-precondition", "Your account is not associated with a hospital.");

  const { patientId, patientName, ehrNumber, latestEncounter, ...formData } = request.data;
  const hospitalRef = db.collection("hospitals").doc(hospitalId);

  try {
    let newRefNumber;
    let newReferralId;

    await db.runTransaction(async (transaction) => {
      const hospitalDoc = await transaction.get(hospitalRef);
      if (!hospitalDoc.exists()) throw new HttpsError("not-found", "Hospital record not found.");

      const hospital = hospitalDoc.data();
      const newCounter = (hospital.referralCounter || 0) + 1;
      const prefix = hospital.mrnPrefix || "GAM";
      const year = new Date().getFullYear().toString().slice(-2);
      newRefNumber = `${prefix}/REF/${year}/${String(newCounter).padStart(3, "0")}`;

      const referralRef = db.collection("referrals").doc();
      newReferralId = referralRef.id;

      transaction.set(referralRef, {
        ...formData,
        referralNumber: newRefNumber,
        patientId,
        patientName,
        ehrNumber,
        vitalsAtReferral: latestEncounter?.vitals || {},
        medications: latestEncounter?.prescription || [],
        hospitalId,
        referringDoctor: userName,
        status: "ISSUED",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      transaction.update(hospitalRef, { referralCounter: newCounter });
    });

    return { success: true, referralId: newReferralId, referralNumber: newRefNumber };
  } catch (error) {
    console.error("Referral creation failed:", error);
    throw new HttpsError("internal", error.message);
  }
});


/**
 * A CEO-level security tool to repair a user's roles and hospital assignment.
 */
exports.repairUserIdentity = onCall({
  region: "us-central1",
  cors: true,
  invoker: "public",
}, async (request) => {
  if (request.auth?.token.role !== "SUPER_ADMIN") {
    throw new HttpsError("permission-denied", "You must be a Super Admin.");
  }

  const { targetEmail, hospitalId, role } = request.data;

  try {
    const user = await admin.auth().getUserByEmail(targetEmail);
    await admin.auth().setCustomUserClaims(user.uid, { hospitalId, role });
    await db.collection("users").doc(user.uid).update({ hospitalId, role });

    return { success: true, message: `Identity for ${targetEmail} has been re-stamped.` };
  } catch (error) {
    console.error("Identity repair failed:", error);
    throw new HttpsError("internal", error.message);
  }
});


// ============================================================
// AUTOMATED AUDIT TRIGGERS (CEO SURVEILLANCE)
// ============================================================

exports.auditPatientRegistration = onDocumentCreated(
  "hospitals/{hospitalId}/patients/{patientId}",
  async (event) => {
    const data = event.data.data();
    if (!data) return null;

    const actor = await admin.auth().getUser(data.registeredBy);
    return admin.firestore().collection("global_audit_logs").add({
      type: "CLINICAL",
      action: "PATIENT_REGISTERED",
      hospitalId: data.hospitalId || "Unknown",
      actorId: data.registeredBy,
      actorName: actor.displayName || "System",
      details: `New EHR created for ${data.firstName} ${data.lastName} (${data.ehrNumber})`,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
);

exports.auditPayments = onDocumentCreated(
  "hospitals/{hospitalId}/payments/{paymentId}",
  async (event) => {
    const data = event.data.data();
    if (!data) return null;
    return admin.firestore().collection("global_audit_logs").add({
      type: "FINANCIAL",
      action: "PAYMENT_RECEIVED",
      hospitalId: data.hospitalId,
      actorId: data.processedBy,
      actorName: data.processedByName || "Cashier",
      details: `Revenue Secured: GHS ${data.totalAmount} from ${data.patientName} (Ref: ${data.paymentId})`,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
);

exports.auditHospitalStatus = onDocumentUpdated(
  "hospitals/{hospitalId}",
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    if (!before || !after) return null;

    if (before.status !== after.status) {
      return admin.firestore().collection("global_audit_logs").add({
        type: "SECURITY",
        action: "FACILITY_STATUS_CHANGE",
        hospitalId: event.params.hospitalId,
        actorId: "SYSTEM",
        actorName: "App CEO / System Autopilot",
        details: `Hospital status moved from ${before.status} to ${after.status}`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    return null;
  }
);

exports.auditPurchaseOrders = onDocumentCreated(
  "hospitals/{hospitalId}/purchase_orders/{poId}",
  async (event) => {
    const data = event.data.data();
    if (!data) return null;

    const totalValue = (data.items || []).reduce(
      (sum, item) => sum + (item.price || 0) * (item.quantityOrdered || 0),
      0
    );

    if (totalValue > 5000) {
      return admin.firestore().collection("global_audit_logs").add({
        type: "FINANCIAL",
        action: "LARGE_PO_ISSUED",
        hospitalId: data.hospitalId,
        actorId: data.orderedBy,
        actorName: data.orderedByName || "Procurement Officer",
        details: `High-value PO issued to ${data.supplierName} for GHS ${totalValue.toLocaleString()}`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    return null;
  }
);
