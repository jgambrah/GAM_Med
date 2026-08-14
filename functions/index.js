
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

    // EXPLICIT MAPPING: This ensures the frontend receives a predictable data shape, de-duplicated by ID.
    const seen = new Set();
    const encounters = [];
    snap.docs.forEach(doc => {
      if (!seen.has(doc.id)) {
        seen.add(doc.id);
        const d = doc.data();
        encounters.push({
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
        });
      }
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
  const { patientId, encounterId, ...restOfData } = data;
  
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
    
    let encounterRef;
    let subEncounterRef;
    let isMerge = false;
    if (encounterId) {
      encounterRef = db.collection("encounters").doc(encounterId);
      subEncounterRef = db.collection("hospitals").doc(hospitalId).collection("patients").doc(patientId).collection("encounters").doc(encounterId);
      isMerge = true;
    } else {
      encounterRef = db.collection("encounters").doc();
      subEncounterRef = db.collection("hospitals").doc(hospitalId).collection("patients").doc(patientId).collection("encounters").doc(encounterRef.id);
    }
    
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
    
    const hospitalDoc = await db.collection('hospitals').doc(hospitalId).get();
    const hospitalData = hospitalDoc.data();
    const userProfileSnap = await db.collection('users').doc(request.auth.uid).get();
    const userProfileData = userProfileSnap.data();

    let hasPendingLabs = false;
    let hasPendingScans = false;

    if (!isExternal) {
        if (labOrders && labOrders.length > 0) {
          hasPendingLabs = true;
          for (const order of labOrders) {
            const orderRef = db.collection('hospitals').doc(hospitalId).collection('lab_orders').doc();
            batch.set(orderRef, { 
              ...order, 
              orderId: orderRef.id, 
              patientId: patientDoc.id, 
              patientName: `${patientData.firstName} ${patientData.lastName}`, 
              hospitalId, 
              encounterId: encounterRef.id, 
              providerUid: request.auth.uid, 
              providerName: userProfileData?.fullName || request.auth.token.name || 'Unknown Staff', 
              unitName: userProfileData?.department || 'OPD', 
              orderedAt: admin.firestore.FieldValue.serverTimestamp(), 
              status: 'PENDING' 
            });
            createBillingItem(order, 'LABORATORY');
          }
        }
      
        if (radiologyOrders && radiologyOrders.length > 0) {
          hasPendingScans = true;
          for (const order of radiologyOrders) {
            const orderRef = db.collection('hospitals').doc(hospitalId).collection('radiology_orders').doc();
            batch.set(orderRef, { 
              ...order, 
              orderId: orderRef.id, 
              patientId: patientDoc.id, 
              patientName: `${patientData.firstName} ${patientData.lastName}`, 
              hospitalId, 
              encounterId: encounterRef.id, 
              providerUid: request.auth.uid, 
              providerName: userProfileData?.fullName || request.auth.token.name || 'Unknown Staff', 
              unitName: userProfileData?.department || 'OPD', 
              orderedAt: admin.firestore.FieldValue.serverTimestamp(), 
              status: 'PENDING' 
            });
            createBillingItem(order, 'IMAGING');
          }
        }
    }

    const fullVitals = vitals ? { ...vitals, bp: (vitals.systolic && vitals.diastolic) ? `${vitals.systolic}/${vitals.diastolic}` : '' } : {};

    const encounterData = {
        id: encounterRef.id,
        patientId: patientDoc.id,
        hospitalId,
        patientName: `${patientData.firstName} ${patientData.lastName}`,
        ehrNumber: patientData.ehrNumber,
        type: encounterType,
        encounterType: encounterType,
        hospitalName: hospitalData?.name,
        ghanaCardId: patientData.ghanaCardId,
        providerUid: request.auth.uid,
        providerName: userProfileData?.fullName || request.auth.token.name || 'Unknown Staff',
        providerRole: request.auth.token.role || 'UNKNOWN',
        doctorMDC: userProfileData?.licenseNumber || 'N/A',
        vitals: fullVitals,
        items: finalItems,
        prescription: finalItems,
        labOrders: labOrders || [],
        radiologyOrders: radiologyOrders || [],
        hasPendingLabs,
        hasPendingScans,
        isExternal: isExternal || false,
        isDispensed: false,
        ...restOfEncounterData,
        chiefComplaint: clean(data.chiefComplaint),
        hpi: clean(data.hpi),
        diagnosis: clean(data.diagnosis),
    };

    if (isMerge) {
      encounterData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      batch.set(encounterRef, encounterData, { merge: true });
      batch.set(subEncounterRef, encounterData, { merge: true });
    } else {
      encounterData.createdAt = admin.firestore.FieldValue.serverTimestamp();
      batch.set(encounterRef, encounterData);
      batch.set(subEncounterRef, encounterData);
    }

    const patientUpdates = {};
    if (isMerge) {
      patientUpdates.status = 'Active';
      patientUpdates.activeEncounterId = null;
      patientUpdates.assignedDoctorId = null;
      patientUpdates.assignedDoctorName = null;
      patientUpdates.assignedAt = null;
    } else {
      patientUpdates.status = 'Waiting for Assignment';
      patientUpdates.activeEncounterId = encounterRef.id;
      patientUpdates.lastVitals = fullVitals;
    }
    patientUpdates.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    batch.update(patientRef, patientUpdates);
    
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
    const { phoneNumber, message, hospitalId, senderId } = request.data;
    if (!phoneNumber || !message) {
        throw new HttpsError('invalid-argument', 'Missing phoneNumber or message');
    }

    try {
        let finalProvider = 'MOCK';
        let finalApiKey = null;
        let finalSenderId = senderId || 'GamMed';

        if (hospitalId) {
            const hospitalDoc = await db.collection('hospitals').doc(hospitalId).get();
            if (hospitalDoc.exists) {
                const hospitalData = hospitalDoc.data();
                if (hospitalData.smsProvider) {
                    finalProvider = hospitalData.smsProvider;
                }
                if (hospitalData.smsApiKey) {
                    finalApiKey = hospitalData.smsApiKey;
                }
                if (hospitalData.smsSenderId) {
                    finalSenderId = hospitalData.smsSenderId;
                }
            }
        }

        // Fallback to process.env.SMS_API_KEY
        if (!finalApiKey && process.env.SMS_API_KEY && process.env.SMS_API_KEY !== "YOUR_SMS_GATEWAY_API_KEY") {
            finalApiKey = process.env.SMS_API_KEY;
            finalProvider = process.env.SMS_PROVIDER || 'ARKESEL';
        }

        if (finalProvider === 'ARKESEL' && finalApiKey) {
            const url = `https://api.arkesel.com/sms/v2/sms/send`;
            await axios.post(url, {
                sender: finalSenderId.substring(0, 11),
                message: message,
                recipients: [phoneNumber]
            }, {
                headers: {
                    'api-key': finalApiKey,
                    'Content-Type': 'application/json'
                }
            });
            await db.collection('sms_logs').add({
                hospitalId: hospitalId || 'SYSTEM',
                recipient: phoneNumber,
                message,
                status: 'SENT',
                provider: 'ARKESEL',
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            return { success: true };
        } else {
            console.log(`[MOCK SMS] To: ${phoneNumber} | From: ${finalSenderId} | Msg: ${message}`);
            await db.collection('sms_logs').add({
                hospitalId: hospitalId || 'SYSTEM',
                recipient: phoneNumber,
                message,
                status: 'SENT',
                provider: 'MOCK',
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            return { success: true, mock: true };
        }
    } catch (error) {
        console.error("FATAL: sendClinicalSms", error.response?.data || error.message);
        throw new HttpsError('internal', error.message || 'Could not send SMS.');
    }
});

exports.sendClinicalEmail = onCall(GLOBAL_CONFIG, async (request) => {
    const { recipientEmail, subject, htmlContent, hospitalId } = request.data;
    if (!recipientEmail || !subject || !htmlContent) {
        throw new HttpsError('invalid-argument', 'Missing recipientEmail, subject, or htmlContent');
    }

    try {
        let finalProvider = 'MOCK';
        let finalApiKey = null;
        let finalFromAddress = 'notifications@gammed.com';

        if (hospitalId) {
            const hospitalDoc = await db.collection('hospitals').doc(hospitalId).get();
            if (hospitalDoc.exists) {
                const hospitalData = hospitalDoc.data();
                if (hospitalData.emailProvider) {
                    finalProvider = hospitalData.emailProvider;
                }
                if (hospitalData.emailApiKey) {
                    finalApiKey = hospitalData.emailApiKey;
                }
                if (hospitalData.emailFromAddress) {
                    finalFromAddress = hospitalData.emailFromAddress;
                }
            }
        }

        // Fallback to process.env.EMAIL_API_KEY
        if (!finalApiKey && process.env.EMAIL_API_KEY) {
            finalApiKey = process.env.EMAIL_API_KEY;
            finalProvider = process.env.EMAIL_PROVIDER || 'RESEND';
        }
        if (finalFromAddress === 'notifications@gammed.com' && process.env.EMAIL_FROM_ADDRESS) {
            finalFromAddress = process.env.EMAIL_FROM_ADDRESS;
        }

        if (finalProvider === 'RESEND' && finalApiKey) {
            const url = `https://api.resend.com/emails`;
            await axios.post(url, {
                from: finalFromAddress,
                to: [recipientEmail],
                subject: subject,
                html: htmlContent
            }, {
                headers: {
                    'Authorization': `Bearer ${finalApiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            await db.collection('email_logs').add({
                hospitalId: hospitalId || 'SYSTEM',
                recipient: recipientEmail,
                subject,
                status: 'SENT',
                provider: 'RESEND',
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            return { success: true };
        } else {
            console.log(`[MOCK EMAIL] To: ${recipientEmail} | From: ${finalFromAddress} | Subject: ${subject}`);
            await db.collection('email_logs').add({
                hospitalId: hospitalId || 'SYSTEM',
                recipient: recipientEmail,
                subject,
                status: 'SENT',
                provider: 'MOCK',
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            return { success: true, mock: true };
        }
    } catch (error) {
        console.error("FATAL: sendClinicalEmail", error.response?.data || error.message);
        throw new HttpsError('internal', error.message || 'Could not send Email.');
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
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Login Required');
  }

  const callerRole = request.auth.token.role;
  const callerHospitalId = request.auth.token.hospitalId;

  const isSuperAdmin = callerRole === 'SUPER_ADMIN';
  const isHospitalManager = ['DIRECTOR', 'ADMIN', 'HR_MANAGER'].includes(callerRole);

  if (!isSuperAdmin && !isHospitalManager) {
    throw new HttpsError('permission-denied', 'You must be a Super Admin, Director, Admin, or HR Manager.');
  }

  const { targetEmail, hospitalId, role } = request.data;

  try {
    const user = await admin.auth().getUserByEmail(targetEmail);
    
    // Fetch the target user document to verify their current hospital
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (!userDoc.exists) {
      throw new HttpsError('not-found', 'User profile not found.');
    }
    const targetUserHospitalId = userDoc.data().hospitalId;

    // Multi-tenant check: non-super-admins can only modify users inside their own hospital,
    // and cannot change the user's hospital association or move them to another hospital.
    if (!isSuperAdmin) {
      if (targetUserHospitalId !== callerHospitalId) {
        throw new HttpsError('permission-denied', 'Target user is not associated with your hospital.');
      }
      if (hospitalId !== callerHospitalId) {
        throw new HttpsError('permission-denied', 'You cannot change the hospital association of this user.');
      }
    }

    // Set claims and update Firestore document
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

/**
 * Processes a Payment Voucher creation with Encumbrance Accounting & Race Condition Protection.
 * Atomically updates the target ledger budget's encumberedAmount using a transaction.
 */
exports.submitPaymentVoucherWithEncumbrance = onCall(GLOBAL_CONFIG, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login Required');
  
  const { hospitalId, pvData, overrideJustification } = request.data;
  if (!hospitalId || !pvData || !pvData.debitAccountId || !pvData.grossAmount) {
    throw new HttpsError('invalid-argument', 'Missing required payment voucher data.');
  }

  const year = new Date().getFullYear();
  const quarter = `Q${Math.floor(new Date().getMonth() / 3) + 1}`;
  const budgetDocId = `${year}_${quarter}_${pvData.debitAccountId}`;
  
  const budgetRef = db.collection('hospitals').doc(hospitalId).collection('budgets').doc(budgetDocId);
  const pvCollectionRef = db.collection('hospitals').doc(hospitalId).collection('payment_vouchers');

  try {
    const result = await db.runTransaction(async (transaction) => {
      const budgetDoc = await transaction.get(budgetRef);
      
      let allocatedAmount = 150000.00;
      let postedAmount = 0;
      let encumberedAmount = 0;

      if (budgetDoc.exists) {
        const bData = budgetDoc.data();
        allocatedAmount = bData.allocatedAmount || 0;
        postedAmount = bData.postedAmount || 0;
        encumberedAmount = bData.encumberedAmount || 0;
      }

      const availableBudget = allocatedAmount - (postedAmount + encumberedAmount);
      const proposedAmount = Number(pvData.grossAmount);
      const isOverBudget = proposedAmount > availableBudget;

      const newPvRef = pvCollectionRef.doc();
      const pvStatus = isOverBudget ? 'AWAITING_BUDGET_OVERRIDE' : 'AWAITING_FINANCE_APPROVAL';

      // 1. Set PV document
      transaction.set(newPvRef, {
        ...pvData,
        status: pvStatus,
        isOverBudget,
        overrideJustification: isOverBudget ? (overrideJustification || 'Clinical priority override requested.') : null,
        availableBudgetAtCreation: availableBudget,
        createdBy: request.auth.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // 2. Encumber the amount on the budget node to prevent race conditions
      if (budgetDoc.exists) {
        transaction.update(budgetRef, {
          encumberedAmount: admin.firestore.FieldValue.increment(proposedAmount),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        transaction.set(budgetRef, {
          ledgerCode: pvData.debitAccountId,
          ledgerName: pvData.debitAccountName || 'Expenditure Ledger',
          period: `${year}-${quarter}`,
          allocatedAmount: 150000.00,
          postedAmount: 0,
          encumberedAmount: proposedAmount,
          isActive: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      return {
        pvId: newPvRef.id,
        pvStatus,
        isOverBudget,
        availableBudget,
        newEncumberedAmount: encumberedAmount + proposedAmount
      };
    });

    return { success: true, ...result };
  } catch (error) {
    console.error("FATAL: submitPaymentVoucherWithEncumbrance", error);
    throw new HttpsError('internal', error.message || 'Error processing encumbrance accounting transaction.');
  }
});

/**
 * 1. REQUEST BUDGET OVERRIDE (Callable Function with Atomic Encumbrance Transaction)
 */
exports.requestBudgetOverride = onCall(GLOBAL_CONFIG, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "User must be logged in to request overrides.");

  const { hospitalId, pvId, ledgerCode, period, amount, justification } = request.data;
  const uid = request.auth.uid;
  const targetHospitalId = hospitalId || request.auth.token.hospitalId;

  if (!targetHospitalId || !pvId || !ledgerCode || !amount) {
    throw new HttpsError("invalid-argument", "Missing required payment voucher override parameters.");
  }

  const budgetRef = db.collection("hospitals").doc(targetHospitalId).collection("budgets").doc(`${period || '2026_Q3'}_${ledgerCode}`);
  const pvRef = db.collection("hospitals").doc(targetHospitalId).collection("payment_vouchers").doc(pvId);
  const auditLogRef = db.collection("global_audit_logs").doc();

  try {
    const result = await db.runTransaction(async (transaction) => {
      const budgetDoc = await transaction.get(budgetRef);
      const pvDoc = await transaction.get(pvRef);

      if (!pvDoc.exists) throw new HttpsError("not-found", "Payment voucher not found.");

      const pvData = pvDoc.data();
      if (pvData?.status !== "DRAFT" && pvData?.status !== "AWAITING_FINANCE_APPROVAL") {
        throw new HttpsError("failed-precondition", "Voucher is not in DRAFT or PENDING state.");
      }

      let allocatedAmount = 150000.00;
      let postedAmount = 0;
      let encumberedAmount = 0;

      if (budgetDoc.exists) {
        const bData = budgetDoc.data();
        allocatedAmount = bData.allocatedAmount || 150000.00;
        postedAmount = bData.postedAmount || 0;
        encumberedAmount = bData.encumberedAmount || 0;
      }

      const availableBudget = allocatedAmount - (postedAmount + encumberedAmount);

      // Increase encumbrance atomically
      const newEncumberedAmount = encumberedAmount + Number(amount);

      if (budgetDoc.exists) {
        transaction.update(budgetRef, {
          encumberedAmount: newEncumberedAmount,
          lastModifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        transaction.set(budgetRef, {
          ledgerCode,
          period: period || '2026_Q3',
          allocatedAmount,
          postedAmount,
          encumberedAmount: newEncumberedAmount,
          isActive: true,
          lastModifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      transaction.update(pvRef, {
        status: "AWAITING_BUDGET_OVERRIDE",
        overrideJustification: justification || "Clinical emergency override requested.",
        submittedBy: uid,
        submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      transaction.set(auditLogRef, {
        type: "FINANCIAL",
        action: "BUDGET_OVERRIDE_REQUESTED",
        hospitalId: targetHospitalId,
        pvId: pvId,
        ledgerCode: ledgerCode,
        requestedAmount: Number(amount),
        makerId: uid,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { availableBudget, newEncumberedAmount };
    });

    return { 
      success: true, 
      message: "Budget override requested and safely encumbered.",
      ...result 
    };

  } catch (error) {
    console.error("FATAL: requestBudgetOverride", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message || "An error occurred while processing the transaction.");
  }
});

/**
 * 2. AUTHORIZE BUDGET OVERRIDE (Executive Director Tier)
 */
exports.authorizeBudgetOverride = onCall(GLOBAL_CONFIG, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "User must be logged in to authorize overrides.");
  
  const { hospitalId, pvId, action, overrideNotes, supplementaryAllocation = 0 } = request.data;
  const uid = request.auth.uid;
  const targetHospitalId = hospitalId || request.auth.token.hospitalId;

  if (!targetHospitalId || !pvId || !['APPROVE', 'REJECT'].includes(action)) {
    throw new HttpsError("invalid-argument", "Missing required authorization parameters.");
  }

  const userProfileDoc = await db.collection("users").doc(uid).get();
  if (!userProfileDoc.exists) throw new HttpsError("not-found", "User profile not found.");
  const role = userProfileDoc.data()?.role;
  if (!['DIRECTOR', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
    throw new HttpsError("permission-denied", "Only Medical Directors and Executive Admins can authorize budget overrides.");
  }

  const pvRef = db.collection("hospitals").doc(targetHospitalId).collection("payment_vouchers").doc(pvId);
  const auditLogRef = db.collection("global_audit_logs").doc();

  try {
    const result = await db.runTransaction(async (transaction) => {
      const pvDoc = await transaction.get(pvRef);
      if (!pvDoc.exists) throw new HttpsError("not-found", "Payment Voucher document not found.");

      const pvData = pvDoc.data();
      if (pvData.status !== "AWAITING_BUDGET_OVERRIDE") {
        throw new HttpsError("failed-precondition", "Voucher is not in AWAITING_BUDGET_OVERRIDE state.");
      }

      const ledgerCode = pvData.debitAccountId;
      const proposedAmount = pvData.grossAmount || 0;
      const year = new Date().getFullYear();
      const quarter = `Q${Math.floor(new Date().getMonth() / 3) + 1}`;
      const periodDocId = `${year}_${quarter}_${ledgerCode}`;
      const budgetRef = db.collection("hospitals").doc(targetHospitalId).collection("budgets").doc(periodDocId);

      const budgetDoc = await transaction.get(budgetRef);

      if (action === 'APPROVE') {
        if (budgetDoc.exists) {
          const injectAmount = Number(supplementaryAllocation) > 0 ? Number(supplementaryAllocation) : (proposedAmount - (pvData.availableBudgetAtCreation || 0));
          transaction.update(budgetRef, {
            allocatedAmount: admin.firestore.FieldValue.increment(Math.max(0, injectAmount)),
            lastModifiedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }

        transaction.update(pvRef, {
          status: "AWAITING_FINANCE_APPROVAL",
          budgetOverrideAuthorizedBy: uid,
          budgetOverrideAuthorizedByName: userProfileDoc.data()?.name || "Medical Director",
          budgetOverrideNotes: overrideNotes || "Executive Budget Override Granted",
          budgetOverrideAuthorizedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        transaction.set(auditLogRef, {
          type: "FINANCIAL",
          action: "BUDGET_OVERRIDE_AUTHORIZED",
          hospitalId: targetHospitalId,
          pvId,
          ledgerCode,
          authorizedAmount: proposedAmount,
          directorId: uid,
          directorName: userProfileDoc.data()?.name || "Medical Director",
          notes: overrideNotes || "Executive Budget Override Granted",
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        return { pvStatus: "AWAITING_FINANCE_APPROVAL", message: "Budget override authorized by Medical Director. PV routed for finance processing." };

      } else {
        if (budgetDoc.exists) {
          transaction.update(budgetRef, {
            encumberedAmount: admin.firestore.FieldValue.increment(-proposedAmount),
            lastModifiedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }

        transaction.update(pvRef, {
          status: "QUERIED",
          budgetOverrideRejectedBy: uid,
          budgetOverrideRejectedByName: userProfileDoc.data()?.name || "Medical Director",
          auditComment: overrideNotes || "Budget Override Rejected by Executive Tier",
          rejectedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        transaction.set(auditLogRef, {
          type: "FINANCIAL",
          action: "BUDGET_OVERRIDE_REJECTED",
          hospitalId: targetHospitalId,
          pvId,
          ledgerCode,
          directorId: uid,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        return { pvStatus: "QUERIED", message: "Budget override request rejected by Medical Director. Encumbered funds released." };
      }
    });

    return { success: true, ...result };
  } catch (error) {
    console.error("FATAL: authorizeBudgetOverride", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message || "An error occurred while authorizing the budget override.");
  }
});

/**
 * 3. POST & DISBURSE PAYMENT VOUCHER (Finance Manager Final Step)
 * Converts encumbrance into posted expense:
 * - Decrements encumberedAmount by proposedAmount
 * - Increments postedAmount by proposedAmount
 * - Posts double-entry Journal Voucher (JV-PV-[pvNumber]) to General Ledger
 * - Updates PV status to 'POSTED' or 'PAID'
 */
exports.postAndDisbursePaymentVoucher = onCall(GLOBAL_CONFIG, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "User must be logged in.");

  const { hospitalId, pvId } = request.data;
  const uid = request.auth.uid;
  const targetHospitalId = hospitalId || request.auth.token.hospitalId;

  if (!targetHospitalId || !pvId) {
    throw new HttpsError("invalid-argument", "Missing hospitalId or pvId.");
  }

  const userProfileDoc = await db.collection("users").doc(uid).get();
  if (!userProfileDoc.exists) throw new HttpsError("not-found", "User profile not found.");

  const pvRef = db.collection("hospitals").doc(targetHospitalId).collection("payment_vouchers").doc(pvId);
  const auditLogRef = db.collection("global_audit_logs").doc();
  const jvRef = db.collection("hospitals").doc(targetHospitalId).collection("journal_entries").doc();

  try {
    const result = await db.runTransaction(async (transaction) => {
      const pvDoc = await transaction.get(pvRef);
      if (!pvDoc.exists) throw new HttpsError("not-found", "Payment Voucher document not found.");

      const pvData = pvDoc.data();
      if (!['AWAITING_FINANCE_APPROVAL', 'APPROVED'].includes(pvData.status)) {
        throw new HttpsError("failed-precondition", "Voucher is not in an approvable state.");
      }

      const grossAmount = Number(pvData.grossAmount) || 0;
      const netAmount = Number(pvData.netAmount) || grossAmount;
      const vatAmount = Number(pvData.vatAmount) || 0;
      const whtAmount = Number(pvData.whtAmount) || 0;

      const ledgerCode = pvData.debitAccountId;
      const year = new Date().getFullYear();
      const quarter = `Q${Math.floor(new Date().getMonth() / 3) + 1}`;
      const periodDocId = `${year}_${quarter}_${ledgerCode}`;
      const budgetRef = db.collection("hospitals").doc(targetHospitalId).collection("budgets").doc(periodDocId);

      const budgetDoc = await transaction.get(budgetRef);

      // A. Convert Encumbrance to Posted Expense
      if (budgetDoc.exists) {
        transaction.update(budgetRef, {
          encumberedAmount: admin.firestore.FieldValue.increment(-grossAmount),
          postedAmount: admin.firestore.FieldValue.increment(grossAmount),
          lastModifiedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      // B. Create Double-Entry Journal Voucher (JV-PV-XXXX)
      const jvNumber = `JV-${pvData.pvNumber || pvId.slice(-6)}`;
      transaction.set(jvRef, {
        jvNumber,
        pvId,
        narration: `Automated Ledger Posting for PV ${pvData.pvNumber}: ${pvData.narration}`,
        totalAmount: grossAmount + vatAmount,
        hospitalId: targetHospitalId,
        createdBy: uid,
        createdByName: userProfileDoc.data()?.name || "Finance Manager",
        status: "AUTHORIZED",
        source: "SYSTEM",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lines: [
          { accountId: pvData.debitAccountId, accountName: pvData.debitAccountName || 'Expenditure Account', debit: grossAmount, credit: 0 },
          ...(vatAmount > 0 ? [{ accountId: '2004', accountName: 'Input VAT Receivable', debit: vatAmount, credit: 0 }] : []),
          ...(whtAmount > 0 ? [{ accountId: '2005', accountName: 'GRA WHT Payable', debit: 0, credit: whtAmount }] : []),
          { accountId: pvData.creditAccountId, accountName: pvData.creditAccountName || 'Bank/Cash Account', debit: 0, credit: netAmount }
        ]
      });

      // C. Update PV status to POSTED
      transaction.update(pvRef, {
        status: "POSTED",
        reconciled: false,
        postedBy: uid,
        postedByName: userProfileDoc.data()?.name || "Finance Manager",
        postedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // D. Immutable Financial Audit Log
      transaction.set(auditLogRef, {
        type: "FINANCIAL",
        action: "PV_POSTED_AND_DISBURSED",
        hospitalId: targetHospitalId,
        pvId,
        pvNumber: pvData.pvNumber,
        grossAmount,
        netAmount,
        financeManagerId: uid,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      return { jvNumber, status: "POSTED" };
    });

    return { success: true, message: `Payment Voucher posted to General Ledger under ${result.jvNumber}.`, ...result };
  } catch (error) {
    console.error("FATAL: postAndDisbursePaymentVoucher", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message || "An error occurred while posting the payment voucher.");
  }
});


/**
 * Callable Function: Post Remittance Settlement & Variance Resolution
 * Atomically clears claim batches, accounts for WHT and Bad Debt write-offs,
 * posts the double-entry Journal Voucher, and updates AR.
 */
exports.postRemittanceSettlement = onCall(GLOBAL_CONFIG, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "User must be logged in.");
  
  const { payerId, bankAccountCode, totalReceived, whtDeducted, writeOffAmount, batchIds, remittanceRef, hospitalId: reqHospitalId } = request.data;
  const uid = request.auth.uid;

  const userProfileDoc = await db.collection("users").doc(uid).get();
  if (!userProfileDoc.exists) throw new HttpsError("not-found", "User profile not found.");

  const targetHospitalId = reqHospitalId || userProfileDoc.data().hospitalId;
  if (!targetHospitalId) throw new HttpsError("failed-precondition", "Hospital ID missing.");

  const totalClearedAR = (Number(totalReceived) || 0) + (Number(whtDeducted) || 0) + (Number(writeOffAmount) || 0);

  const jvRef = db.collection("hospitals").doc(targetHospitalId).collection("journal_vouchers").doc();
  const auditLogRef = db.collection("global_audit_logs").doc();

  try {
    await db.runTransaction(async (transaction) => {
      let calculatedBatchTotal = 0;
      const batchRefs = (batchIds || []).map(id => db.collection("hospitals").doc(targetHospitalId).collection("claim_batches").doc(id));
      const batchDocs = batchRefs.length > 0 ? await transaction.getAll(...batchRefs) : [];

      batchDocs.forEach((docSnap) => {
        if (!docSnap.exists) throw new HttpsError("not-found", "A selected batch was not found.");
        const data = docSnap.data();
        calculatedBatchTotal += Number(data.totalClaimValue || 0);
      });

      // Update Batches to SETTLED
      batchRefs.forEach((ref) => {
        transaction.update(ref, {
          status: "SETTLED",
          settledAt: admin.firestore.FieldValue.serverTimestamp(),
          remittanceReference: remittanceRef,
          settledBy: uid
        });
      });

      // Post Automated Journal Voucher
      transaction.set(jvRef, {
        jvNumber: `JV-REC-${remittanceRef}`,
        source: "REMITTANCE_PORTAL",
        datePosted: admin.firestore.FieldValue.serverTimestamp(),
        preparerId: uid,
        preparerName: userProfileDoc.data()?.name || "Chief Accountant",
        narration: `NHIS/Payer Settlement for Ref: ${remittanceRef}. Includes WHT and Write-offs.`,
        status: "POSTED",
        hospitalId: targetHospitalId,
        period: new Date().toISOString().slice(0, 7),
        entries: [
          { accountCode: bankAccountCode || "1001", accountName: "GCB Bank Cash Account", debit: Number(totalReceived) || 0, credit: 0 },
          ...(whtDeducted > 0 ? [{ accountCode: "1205", accountName: "WHT Receivables Credit", debit: Number(whtDeducted), credit: 0 }] : []),
          ...(writeOffAmount > 0 ? [{ accountCode: "5100", accountName: "Bad Debt & Claims Write-Off", debit: Number(writeOffAmount), credit: 0 }] : []),
          { accountCode: "1200", accountName: "Accounts Receivable - NHIS Claims", debit: 0, credit: totalClearedAR }
        ]
      });

      // Audit Trail Log
      transaction.set(auditLogRef, {
        type: "FINANCIAL",
        action: "REMITTANCE_SETTLED",
        hospitalId: targetHospitalId,
        payerId: payerId || "NHIS",
        totalCleared: totalClearedAR,
        jvId: jvRef.id,
        officerId: uid,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    return { success: true, message: "Remittance processed and AR cleared successfully." };
  } catch (error) {
    console.error("FATAL: postRemittanceSettlement", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message || "Failed to process remittance settlement.");
  }
});

/**
 * Cloud Function Trigger: Intercepts every newly posted Journal Voucher
 * and updates the running balance aggregation collection `ledger_balances` in real-time.
 */
exports.aggregateJournalVoucherToLedgerBalances = onDocumentCreated(
  { document: "hospitals/{hospitalId}/journal_vouchers/{jvId}", region: "us-central1" },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const jvData = snap.data();
    if (jvData.status !== "POSTED" || !jvData.entries || !Array.isArray(jvData.entries)) {
      return;
    }

    const hospitalId = event.params.hospitalId;
    const period = jvData.period || new Date().toISOString().slice(0, 7);

    const batch = db.batch();

    jvData.entries.forEach((entry) => {
      const accountCode = entry.accountCode || entry.accountId;
      if (!accountCode) return;

      const balanceDocRef = db
        .collection("hospitals")
        .doc(hospitalId)
        .collection("ledger_balances")
        .doc(`${period}_account_${accountCode}`);

      const debit = Number(entry.debit || 0);
      const credit = Number(entry.credit || 0);

      batch.set(
        balanceDocRef,
        {
          period,
          accountCode,
          accountName: entry.accountName || `Account ${accountCode}`,
          totalDebit: admin.firestore.FieldValue.increment(debit),
          totalCredit: admin.firestore.FieldValue.increment(credit),
          netBalance: admin.firestore.FieldValue.increment(debit - credit),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    });

    await batch.commit();
    console.log(`Successfully aggregated JV ${snap.id} into ledger_balances for hospital ${hospitalId}`);
  }
);

/**
 * Callable Function: Publish Fiscal Budget & Lock Quarterly Ledger Caps
 * Transitions budget state from DRAFT -> LOCKED_ACTIVE, generating quarterly 
 * budget documents (e.g. 2026_Q3_4001) in hospitals/{hospitalId}/budgets for 
 * instant encumbrance evaluation by the Disbursement Portal.
 */
exports.publishFiscalBudget = onCall(GLOBAL_CONFIG, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "User must be logged in.");

  const { fiscalYear, allocations, hospitalId: reqHospitalId } = request.data;
  const uid = request.auth.uid;

  const userProfileDoc = await db.collection("users").doc(uid).get();
  if (!userProfileDoc.exists) throw new HttpsError("not-found", "User profile not found.");

  const role = userProfileDoc.data()?.role;
  if (!['DIRECTOR', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
    throw new HttpsError("permission-denied", "Only Medical Directors or Admins can publish fiscal budgets.");
  }

  const targetHospitalId = reqHospitalId || userProfileDoc.data().hospitalId;
  if (!targetHospitalId) throw new HttpsError("failed-precondition", "Hospital ID missing.");

  const year = fiscalYear || new Date().getFullYear();
  const masterRef = db.collection("hospitals").doc(targetHospitalId).collection("fiscal_budgets").doc(`budget_${year}`);
  const auditLogRef = db.collection("global_audit_logs").doc();

  try {
    await db.runTransaction(async (transaction) => {
      // 1. Lock Master Fiscal Budget Document
      transaction.set(masterRef, {
        fiscalYear: year,
        status: "LOCKED_ACTIVE",
        publishedBy: uid,
        publishedByName: userProfileDoc.data()?.name || "Medical Director",
        publishedAt: admin.firestore.FieldValue.serverTimestamp(),
        allocationsCount: (allocations || []).length
      }, { merge: true });

      // 2. Generate/Update Quarterly Budget Caps in budgets/{year}_Q{1-4}_{accountCode}
      (allocations || []).forEach((alloc) => {
        const accountCode = alloc.accountCode || alloc.accountId;
        const q1 = Number(alloc.q1) || 0;
        const q2 = Number(alloc.q2) || 0;
        const q3 = Number(alloc.q3) || 0;
        const q4 = Number(alloc.q4) || 0;

        const quarters = [
          { q: 'Q1', val: q1 },
          { q: 'Q2', val: q2 },
          { q: 'Q3', val: q3 },
          { q: 'Q4', val: q4 }
        ];

        quarters.forEach(({ q, val }) => {
          const docId = `${year}_${q}_${accountCode}`;
          const bRef = db.collection("hospitals").doc(targetHospitalId).collection("budgets").doc(docId);
          
          transaction.set(bRef, {
            fiscalYear: year,
            quarter: q,
            accountId: accountCode,
            accountCode: accountCode,
            accountName: alloc.accountName || `Account ${accountCode}`,
            allocatedAmount: val,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            status: "LOCKED_ACTIVE"
          }, { merge: true });
        });
      });

      // 3. Audit Trail Log
      transaction.set(auditLogRef, {
        type: "FINANCIAL",
        action: "FISCAL_BUDGET_PUBLISHED",
        hospitalId: targetHospitalId,
        fiscalYear: year,
        publisherId: uid,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    return { success: true, message: `Fiscal Budget ${year} permanently locked and published to Disbursement Portal.` };
  } catch (error) {
    console.error("FATAL: publishFiscalBudget", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message || "Failed to publish fiscal budget.");
  }
});

/**
 * Callable Function: Request Supplementary Budget Allocation
 * Allows submitting formal supplementary budget requests for LOCKED_ACTIVE fiscal periods,
 * producing an audit trail and requiring Medical Director sign-off.
 */
exports.requestSupplementaryBudget = onCall(GLOBAL_CONFIG, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "User must be logged in.");

  const { fiscalYear, quarter, accountCode, supplementaryAmount, justification, hospitalId: reqHospitalId } = request.data;
  const uid = request.auth.uid;

  const userProfileDoc = await db.collection("users").doc(uid).get();
  if (!userProfileDoc.exists) throw new HttpsError("not-found", "User profile not found.");

  const targetHospitalId = reqHospitalId || userProfileDoc.data().hospitalId;
  const suppRef = db.collection("hospitals").doc(targetHospitalId).collection("supplementary_budgets").doc();

  await suppRef.set({
    fiscalYear: fiscalYear || new Date().getFullYear(),
    quarter: quarter || 'Q3',
    accountCode,
    supplementaryAmount: Number(supplementaryAmount) || 0,
    justification,
    requestedBy: uid,
    requestedByName: userProfileDoc.data()?.name || "Finance Officer",
    status: "AWAITING_DIRECTOR_APPROVAL",
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { success: true, message: "Supplementary budget request submitted to Medical Director for approval." };
});

/**
 * Callable Function: Submit Audit Query Clarification & Resubmit Voucher
 * Updates the audit_queries document status to CLARIFICATION_SUBMITTED,
 * attaches financial officer comments/documents, and pushes the Payment Voucher 
 * back into the Medical Director / Auditor approval queue (status: AWAITING_FINANCE_APPROVAL).
 */
exports.submitClarification = onCall(GLOBAL_CONFIG, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "User must be logged in.");

  const { queryId, sourceDocumentId, clarificationText, attachedFileUrls, hospitalId: reqHospitalId } = request.data;
  const uid = request.auth.uid;

  const userProfileDoc = await db.collection("users").doc(uid).get();
  if (!userProfileDoc.exists) throw new HttpsError("not-found", "User profile not found.");

  const targetHospitalId = reqHospitalId || userProfileDoc.data().hospitalId;
  if (!targetHospitalId) throw new HttpsError("failed-precondition", "Hospital ID missing.");

  const pvRef = db.collection("hospitals").doc(targetHospitalId).collection("payment_vouchers").doc(sourceDocumentId);
  const queryRef = db.collection("hospitals").doc(targetHospitalId).collection("audit_queries").doc(queryId || sourceDocumentId);
  const auditLogRef = db.collection("global_audit_logs").doc();

  try {
    await db.runTransaction(async (transaction) => {
      // 1. Update Audit Query document
      transaction.set(queryRef, {
        status: "CLARIFICATION_SUBMITTED",
        respondedBy: uid,
        respondedByName: userProfileDoc.data()?.name || "Marcus Amosah Henaku",
        financeResponse: clarificationText,
        attachedFileUrls: attachedFileUrls || [],
        respondedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      // 2. Return Payment Voucher back to AWAITING_APPROVAL queue
      transaction.update(pvRef, {
        status: "AWAITING_FINANCE_APPROVAL",
        auditClarified: true,
        lastClarificationText: clarificationText,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // 3. Log Audit Trail
      transaction.set(auditLogRef, {
        type: "FINANCIAL",
        action: "AUDIT_QUERY_CLARIFIED",
        hospitalId: targetHospitalId,
        sourceDocumentId,
        queryId: queryRef.id,
        respondedBy: uid,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    return { success: true, message: `Clarification submitted. PV ${sourceDocumentId} returned to approval queue.` };
  } catch (error) {
    console.error("FATAL: submitClarification", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message || "Failed to submit clarification.");
  }
});






