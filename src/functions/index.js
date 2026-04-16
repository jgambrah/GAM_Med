
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

// 1. ROBUST HISTORY LOADER (THE "TITAN-GRADE" FIX)
exports.getPatientHistory = onCall(GLOBAL_CONFIG, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login Required');
  
  const userProfileDoc = await db.collection("users").doc(request.auth.uid).get();
  if (!userProfileDoc.exists) throw new HttpsError("not-found", "Your user profile could not be found.");
  const currentHospitalId = userProfileDoc.data().hospitalId;

  try {
    const { ghanaCardId, homeHospitalId } = request.data;
    if (!ghanaCardId) throw new HttpsError("invalid-argument", "MISSING_GHANA_CARD_ID");

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

    // EXPLICIT MAPPING: This ensures the frontend receives a predictable data shape.
    const encounters = snap.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          createdAt: d.createdAt,
          vitals: d.vitals,
          chiefComplaint: d.chiefComplaint,
          hpi: d.hpi,
          diagnosis: d.diagnosis,
          prescription: d.prescription,
          items: d.items,
          labOrders: d.labOrders,
          radiologyOrders: d.radiologyOrders,
          type: d.type,
          providerName: d.providerName,
          providerRole: d.providerRole,
          hospitalName: d.hospitalName,
        };
    });

    return { success: true, data: encounters };

  } catch (error) {
    console.error("FATAL: getPatientHistory", error);
    throw new HttpsError('internal', 'An internal error occurred while fetching clinical history.');
  }
});


/**
 * Onboards a new staff member.
 * Creates an Auth user and a corresponding user profile in Firestore.
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
    // 1. Create Auth Account first to get a UID
    const userRecord = await admin.auth().createUser({
      email: email,
      password: "Staff123!",
      displayName: fullName,
    });

    // 2. Set Custom Claims
    await admin.auth().setCustomUserClaims(userRecord.uid, { role, hospitalId, contractType });
    
    let newStaffNumber;

    // 3. Run a transaction to generate staff number and create user doc
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
        
        // Create Firestore User Profile inside transaction
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
            ...optionalData
        });
        
        // Update hospital staff counter
        transaction.update(hospitalRef, { staffCounter: newCounter });
    });


    return { success: true, message: `${fullName} onboarded with Staff ID: ${newStaffNumber}.` };
  } catch (error) {
    console.error("Onboarding failed:", error);
    throw new HttpsError('internal', error.message);
  }
});


/**
 * Registers a new patient and assigns a unique EHR number.
 */
exports.registerPatient = onCall(GLOBAL_CONFIG, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be an authenticated staff member.');
  }
  
  const userProfileDoc = await db.collection("users").doc(request.auth.uid).get();
  if (!userProfileDoc.exists) throw new HttpsError("not-found", "Your user profile could not be found.");
  const hospitalId = userProfileDoc.data().hospitalId;
  if (!hospitalId) throw new HttpsError("failed-precondition", "Your account is not associated with a hospital.");
  
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
    console.error("Patient registration failed:", error);
    throw new HttpsError('internal', error.message);
  }
});

const evaluateCriticalAlerts = (vitals) => {
    const alerts = [];
    const spo2 = Number(vitals?.spo2);
    const resp = Number(vitals?.respiration);
    const pulse = Number(vitals?.pulse);
    const temp = Number(vitals?.temp);
  
    if (spo2 && spo2 < 90) {
      alerts.push({
        type: "CRITICAL_OXYGEN",
        message: `SpO2 critically low (${spo2}%)`,
        severity: "CRITICAL"
      });
    }
  
    if (resp && resp > 30) {
      alerts.push({
        type: "RESPIRATORY_DISTRESS",
        message: `High respiration rate (${resp}/min)`,
        severity: "CRITICAL"
      });
    }
  
    if (pulse && pulse > 130) {
      alerts.push({
        type: "TACHYCARDIA",
        message: `Pulse critically high (${pulse} bpm)`,
        severity: "HIGH"
      });
    }
  
    if (temp && temp > 39) {
      alerts.push({
        type: "HIGH_FEVER",
        message: `High temperature (${temp}°C)`,
        severity: "HIGH"
      });
    }
    return alerts;
};

/**
 * Creates a new clinical encounter and intelligently creates billing items based on insurance coverage.
 */
exports.createEncounter = onCall(GLOBAL_CONFIG, async (request) => {
  // Security Gate first
  if (!request.auth) throw new HttpsError('unauthenticated', 'Session Expired.');
  
  const hospitalId = request.auth.token.hospitalId;
  if (!hospitalId) throw new HttpsError('unauthenticated', 'User not associated with a hospital.');

  const data = request.data;
  const { patientId, ...restOfData } = data;
  
  try {
    const clean = (val) => (val === undefined || val === null ? "" : val);

    if (!patientId) throw new Error("CRITICAL_MISSING_FIELD: patientId");
    
    let patientRef = db.collection('hospitals').doc(hospitalId).collection('patients').doc(patientId);
    let patientDoc = await patientRef.get();

    if (!patientDoc.exists) {
      console.log("⚠️ ID lookup failed, attempting EHR search...");
      const ehrQuery = await db.collection('hospitals').doc(hospitalId)
        .collection('patients')
        .where("ehrNumber", "==", patientId)
        .limit(1)
        .get();
        
      if (!ehrQuery.empty) {
        patientDoc = ehrQuery.docs[0];
        patientRef = patientDoc.ref;
      } else {
        throw new HttpsError('not-found', 'CRITICAL: No patient record matches this ID or EHR Number.');
      }
    }
    const patientData = patientDoc.data();
    if (!patientData) throw new HttpsError('not-found', 'Patient data is empty.');

    const batch = db.batch();
    const encounterRef = doc(collection(firestore, "encounters"));
    
    const { 
        patientName, vitals, encounterType, 
        labOrders = [], radiologyOrders = [], 
        items = [], 
        isExternal,
        ...restOfEncounterData 
    } = restOfData;

    const finalItems = items || [];
    const billingItemsCollection = db.collection('hospitals').doc(hospitalId).collection('billing_items');

    const createBillingItem = (item, type, qty = 1) => {
        let billingType = 'CASH_PAYMENT';
        let billPayerId = null;
        let payerName = 'Cash Patient';

        if (patientData.payerId && patientData.payerId !== 'CASH') {
            billingType = 'INSURANCE_CLAIM';
            billPayerId = patientData.payerId;
            payerName = patientData.payerName;
        }
        
        const billRef = billingItemsCollection.doc();
        batch.set(billRef, {
            patientId: patientDoc.id,
            patientName: `${patientData.firstName} ${patientData.lastName}`,
            hospitalId,
            encounterId: encounterRef.id,
            description: item.name,
            category: type,
            sku: item.sku || null,
            unitPrice: item.price || 0,
            qty,
            total: (item.price || 0) * qty,
            status: 'UNPAID',
            billedBy: request.auth.uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            billingType,
            payerId: billPayerId,
            payerName
        });
    };
    
    if (!isExternal && finalItems && finalItems.length > 0) {
      const drugSkus = finalItems.map(p => p.sku).filter(Boolean);
      if(drugSkus.length > 0) {
        const drugsSnap = await db.collection('hospitals').doc(hospitalId).collection('product_catalog').where('sku', 'in', drugSkus).get();
        drugsSnap.forEach(doc => {
            const rxItem = finalItems.find(p => p.sku === doc.data().sku);
            const qty = rxItem?.qty || 1;
            createBillingItem(doc.data(), 'PHARMACY', qty);
        });
      }
    }
    
    let hasPendingLabs = false;
    let hasPendingScans = false;

    if (!isExternal) {
        if (labOrders && labOrders.length > 0) {
          hasPendingLabs = true;
          for (const order of labOrders) {
            const orderRef = db.collection('hospitals').doc(hospitalId).collection('lab_orders').doc();
            batch.set(orderRef, { ...order, orderId: orderRef.id, patientId: patientDoc.id, patientName: `${patientData.firstName} ${patientData.lastName}`, hospitalId, encounterId: encounterRef.id, providerUid: request.auth.uid, providerName: request.auth.token.name, orderedAt: admin.firestore.FieldValue.serverTimestamp(), status: 'PENDING' });
            createBillingItem(order, 'LABORATORY');
          }
        }
      
        if (radiologyOrders && radiologyOrders.length > 0) {
          hasPendingScans = true;
          for (const order of radiologyOrders) {
            const orderRef = db.collection('hospitals').doc(hospitalId).collection('radiology_orders').doc();
            batch.set(orderRef, { ...order, orderId: orderRef.id, patientId: patientDoc.id, patientName: `${patientData.firstName} ${patientData.lastName}`, hospitalId, encounterId: encounterRef.id, providerUid: request.auth.uid, providerName: request.auth.token.name, orderedAt: admin.firestore.FieldValue.serverTimestamp(), status: 'PENDING' });
            createBillingItem(order, 'IMAGING');
          }
        }
    }

    const hospitalDoc = await db.collection('hospitals').doc(hospitalId).get();
    const hospitalData = hospitalDoc.data();
    const userProfileSnap = await db.collection('users').doc(request.auth.uid).get();
    const userProfileData = userProfileSnap.data();

    const fullVitals = vitals ? { ...vitals, bp: (vitals.systolic && vitals.diastolic) ? `${vitals.systolic}/${vitals.diastolic}` : '' } : {};

    batch.set(encounterRef, {
        id: encounterRef.id,
        patientId: patientDoc.id,
        hospitalId,
        patientName: `${patientData.firstName} ${patientData.lastName}`,
        ehrNumber: patientData.ehrNumber,
        type: encounterType,
        hospitalName: hospitalData?.name,
        ghanaCardId: patientData.ghanaCardId,
        providerUid: request.auth.uid,
        providerName: request.auth.token.name || 'Unknown Staff',
        providerRole: request.auth.token.role || 'UNKNOWN',
        doctorMDC: userProfileData?.licenseNumber || 'N/A',
        vitals: fullVitals,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        items: finalItems,
        prescription: finalItems,
        labOrders: labOrders || [],
        radiologyOrders: radiologyOrders || [],
        hasPendingLabs,
        hasPendingScans,
        isExternal: isExternal || false,
        ...restOfEncounterData,
        chiefComplaint: clean(data.chiefComplaint),
        hpi: clean(data.hpi),
        diagnosis: clean(data.diagnosis),
    });

    batch.update(patientRef, {
        status: 'Waiting for Assignment',
        lastVitals: fullVitals,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // SERVER-SIDE ALERT ENGINE
    const vitalAlerts = evaluateCriticalAlerts(fullVitals);
    if (vitalAlerts.length > 0) {
        vitalAlerts.forEach(alert => {
            const alertRef = db.collection('hospitals').doc(hospitalId).collection('clinical_alerts').doc();
            batch.set(alertRef, {
                hospitalId,
                patientId: patientDoc.id,
                patientName: `${patientData.firstName} ${patientData.lastName}`,
                encounterId: encounterRef.id,
                alertType: 'CRITICAL_VITALS',
                message: alert.message,
                status: 'UNREAD',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        });
    }

    if (!isExternal) {
        const serviceSnap = await db.collection('hospitals').doc(hospitalId).collection('general_services').where('category', '==', 'CONSULTATION').limit(1).get();
        if (!serviceSnap.empty) {
            createBillingItem(serviceSnap.docs[0].data(), 'CONSULTATION');
        }
    }
    
    await batch.commit();
    return { success: true, encounterId: encounterRef.id };

  } catch(error) {
      console.error("FATAL: createEncounter", error.code, error.message, error.stack);
      throw new HttpsError('internal', error.message);
  }
});

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
    const directorUserRecord = await admin.auth().createUser({
        email: cleanDirectorEmail,
        password: defaultPassword,
        displayName: directorName,
    });
    
    await admin.auth().setCustomUserClaims(directorUserRecord.uid, {
      role: 'DIRECTOR',
      hospitalId: hospitalId
    });

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
    const smsApiKey = process.env.SMS_API_KEY;
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
      if (!hospitalDoc.exists()) throw new HttpsError('not-found', 'Hospital record not found.');

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

