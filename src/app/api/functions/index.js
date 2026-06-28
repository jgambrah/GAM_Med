

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
 * Creates a new clinical encounter and intelligently creates billing items based on insurance coverage.
 */
exports.createEncounter = onCall({ region: "us-central1", cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be an authenticated staff member.');
  }

  let hospitalId = request.auth.token.hospitalId;
  // Fallback to Firestore if token is stale
  if (!hospitalId && request.auth.uid) {
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    if (userDoc.exists) {
        hospitalId = userDoc.data().hospitalId;
    }
  }
  
  const { 
    patientId, encounterId, patientName, vitals, encounterType, 
    labOrders = [], radiologyOrders = [], 
    items = [], // Standardized field
    isExternal, // Single flag
    ...restOfEncounterData 
  } = request.data;
  
  const finalItems = items || [];
  

  if (!patientId || !hospitalId || !encounterType) {
    throw new HttpsError('invalid-argument', 'Missing required encounter data or could not determine hospital ID.');
  }

  const batch = db.batch();
  
  const patientRef = db.collection('hospitals').doc(hospitalId).collection('patients').doc(patientId);
  const billingItemsCollection = db.collection('hospitals').doc(hospitalId).collection('billing_items');

  let encounterRef;
  let subEncounterRef;
  let isMerge = false;
  if (encounterId) {
    encounterRef = db.collection('encounters').doc(encounterId);
    subEncounterRef = db.collection('hospitals').doc(hospitalId).collection('patients').doc(patientId).collection('encounters').doc(encounterId);
    isMerge = true;
  } else {
    encounterRef = db.collection('encounters').doc();
    subEncounterRef = db.collection('hospitals').doc(hospitalId).collection('patients').doc(patientId).collection('encounters').doc(encounterRef.id);
  }

  // Prepare encounter data
  const fullVitals = vitals ? { ...vitals, bp: (vitals.systolic && vitals.diastolic) ? `${vitals.systolic}/${vitals.diastolic}` : '' } : {};
  let hasPendingLabs = false;
  let hasPendingScans = false;

  const patientDoc = await patientRef.get();
  if (!patientDoc.exists()) throw new HttpsError('not-found', 'Patient record not found for billing.');
  const patientData = patientDoc.data();
  
  const hospitalDoc = await db.collection('hospitals').doc(hospitalId).get();
  const hospitalData = hospitalDoc.data();
  
  const userProfileSnap = await db.collection('users').doc(request.auth.uid).get();
  const userProfile = userProfileSnap.data();

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
      patientId, patientName, hospitalId, encounterId: encounterRef.id,
      description: item.name, category: type, sku: item.sku || null, unitPrice: item.price || 0,
      qty, total: (item.price || 0) * qty, status: 'UNPAID', billedBy: request.auth.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(), billingType, payerId: billPayerId, payerName
    });
  };

  // Internal prescriptions are billed
  if (!isExternal && finalItems && finalItems.length > 0) {
      for (const rxItem of finalItems) {
        if (rxItem.sku) {
            const productQuery = db.collection('hospitals').doc(hospitalId).collection('product_catalog').where('sku', '==', rxItem.sku).limit(1);
            const productSnap = await productQuery.get();
            if (!productSnap.empty) {
                const productData = productSnap.docs[0].data();
                const qty = rxItem.qty || 1;
                createBillingItem(productData, 'PHARMACY', qty);
            } else {
                console.warn(`Product with SKU ${rxItem.sku} not found in catalog for billing.`);
            }
        }
      }
  }

  // Internal diagnostics are billed
  if (!isExternal) {
    if (labOrders && labOrders.length > 0) {
      hasPendingLabs = true;
      for (const order of labOrders) {
        const orderRef = db.collection('hospitals').doc(hospitalId).collection('lab_orders').doc();
        batch.set(orderRef, { 
          ...order, 
          orderId: orderRef.id, 
          patientId, 
          patientName, 
          hospitalId, 
          encounterId: encounterRef.id, 
          providerUid: request.auth.uid, 
          providerName: userProfile?.fullName || request.auth.token.name || 'Unknown Staff', 
          unitName: userProfile?.department || 'OPD', 
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
          patientId, 
          patientName, 
          hospitalId, 
          encounterId: encounterRef.id, 
          providerUid: request.auth.uid, 
          providerName: userProfile?.fullName || request.auth.token.name || 'Unknown Staff', 
          unitName: userProfile?.department || 'OPD', 
          orderedAt: admin.firestore.FieldValue.serverTimestamp(), 
          status: 'PENDING' 
        });
        createBillingItem(order, 'IMAGING');
      }
    }
  }
  
  const encounterData = {
    id: encounterRef.id, patientId, hospitalId, patientName, ehrNumber: patientData.ehrNumber, type: encounterType,
    encounterType: encounterType,
    hospitalName: hospitalData?.name,
    ghanaCardId: patientData.ghanaCardId,
    providerUid: request.auth.uid, 
    providerName: userProfile?.fullName || request.auth.token.name || 'Unknown Staff', 
    providerRole: request.auth.token.role || 'UNKNOWN',
    doctorMDC: userProfile?.licenseNumber || 'N/A', // For external print
    vitals: fullVitals,
    items: finalItems, prescription: finalItems, // Support both legacy and new field names
    labOrders: labOrders || [], 
    radiologyOrders: radiologyOrders || [],
    hasPendingLabs, hasPendingScans,
    isExternal: isExternal || false,
    isDispensed: false,
    ...restOfEncounterData
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

  if (!isExternal && !isMerge) {
      const serviceSnap = await db.collection('hospitals').doc(hospitalId).collection('general_services').where('category', '==', 'CONSULTATION').limit(1).get();
      if (!serviceSnap.empty) {
          createBillingItem(serviceSnap.docs[0].data(), 'CONSULTATION');
      }
  }


  try {
    await batch.commit();
    return { success: true, encounterId: encounterRef.id, message: 'Encounter created/updated successfully.' };
  } catch (error) {
    console.error("Encounter creation failed:", error);
    throw new HttpsError('internal', 'Failed to save encounter and billing data.');
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
exports.provisionFullHospital = onCall({ region: "us-central1", cors: true }, async (request) => {
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
    monthlyRateNumeric,
    monthlyRateWords,
  } = request.data;
  
  // 1. THE STANDARDIZED DEFAULT PASSWORD
  const defaultPassword = "password123";
  
  if (!monthlyRateWords || monthlyRateWords.length < 10) {
     throw new HttpsError('invalid-argument', 'You must type the subscription amount in words to authorize.');
  }

  if (!hospitalName || !directorEmail || !mrnPrefix) {
    throw new HttpsError('invalid-argument', 'Missing required fields for hospital provisioning.');
  }
  
  const hospitalRef = db.collection('hospitals').doc(); // Auto-generate ID for the new hospital
  const hospitalId = hospitalRef.id;

  const cleanDirectorEmail = directorEmail.toLowerCase().trim();

  try {
    // Transaction for atomicity
    await db.runTransaction(async (transaction) => {
        // 2. CREATE AUTH ACCOUNT WITH THE DEFAULT
        const directorUserRecord = await admin.auth().createUser({
            email: cleanDirectorEmail,
            password: defaultPassword,
            displayName: directorName,
        });
        
        // 3. Set Custom Claims for Director
        await admin.auth().setCustomUserClaims(directorUserRecord.uid, {
          role: 'DIRECTOR',
          hospitalId: hospitalId
        });

        // 4. SAVE TO FIRESTORE (THE VAULT)
        transaction.set(hospitalRef, {
            hospitalId: hospitalId,
            name: hospitalName,
            region: region,
            directorUid: directorUserRecord.uid,
            directorEmail: cleanDirectorEmail,
            mrnPrefix: mrnPrefix,
            subscriptionPlan: subscriptionPlan,
            agreedRate: monthlyRateNumeric,
            agreedRateWords: monthlyRateWords,
            provisioningSecret: defaultPassword,
            status: 'active',
            isSuspended: false,
            subscriptionStatus: 'ACTIVE',
            mustChangePassword: true, // THIS FLAG IS THE SECURITY GUARD
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

        // 5. UPDATE USER PROFILE WITH THE FLAG
        const userRef = db.collection('users').doc(directorUserRecord.uid);
        transaction.set(userRef, {
          uid: directorUserRecord.uid,
          fullName: directorName,
          email: cleanDirectorEmail,
          role: 'DIRECTOR',
          hospitalId: hospitalId,
          is_active: true,
          mustChangePassword: true, // Double protection
          onboardingComplete: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        const configRef = db.doc('platform_config/summary');
        transaction.update(configRef, {
            totalFacilities: admin.firestore.FieldValue.increment(1),
            [`regionalBreakdown.${region}`]: admin.firestore.FieldValue.increment(1)
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

/**
 * Sends an Email message via a third-party gateway (Resend).
 */
exports.sendClinicalEmail = onCall({ region: "us-central1", cors: true }, async (request) => {
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

/**
 * Creates a Clinical Referral and generates a unique referral number.
 */
exports.createReferral = onCall({ region: "us-central1", cors: true }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'You must be an authenticated staff member.');
  
  const { patientId, patientName, ehrNumber, latestEncounter, ...formData } = request.data;
  const hospitalId = request.auth.token.hospitalId;
  const hospitalRef = db.collection('hospitals').doc(hospitalId);

  try {
    let newRefNumber;
    let newReferralId;

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
        ...formData,
        referralNumber: newRefNumber,
        patientId, patientName, ehrNumber,
        vitalsAtReferral: latestEncounter?.vitals || {},
        medications: latestEncounter?.prescription || [],
        hospitalId,
        referringDoctor: request.auth.token.name,
        status: 'ISSUED',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      transaction.update(hospitalRef, { referralCounter: newCounter });
    });

    return { success: true, referralId: newReferralId, referralNumber: newRefNumber };
  } catch (error) {
    console.error("Referral creation failed:", error);
    throw new HttpsError('internal', error.message);
  }
});


/**
 * A CEO-level security tool to repair a user's roles and hospital assignment.
 */
exports.repairUserIdentity = onCall({ region: "us-central1", cors: true }, async (request) => {
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
    console.error("Identity repair failed:", error);
    throw new HttpsError('internal', error.message);
  }
});

// --------------------------------
// AUTOMATED AUDIT TRIGGERS (CEO SURVEILLANCE)
// --------------------------------

// 1. MONITOR: New Patient Registrations (Clinical Pulse)
exports.auditPatientRegistration = onDocumentCreated("hospitals/{hospitalId}/patients/{patientId}", async (event) => {
  const data = event.data.data();
  if (!data) return null;

  const actor = await admin.auth().getUser(data.registeredBy);
  
  return admin.firestore().collection("global_audit_logs").add({
    type: 'CLINICAL',
    action: 'PATIENT_REGISTERED',
    hospitalId: data.hospitalId || 'Unknown',
    actorId: data.registeredBy,
    actorName: actor.displayName || 'System',
    details: `New EHR created for ${data.firstName} ${data.lastName} (${data.ehrNumber})`,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
});

// 2. MONITOR: Revenue Inflows (Financial Pulse)
exports.auditPayments = onDocumentCreated("hospitals/{hospitalId}/payments/{paymentId}", async (event) => {
  const data = event.data.data();
  if (!data) return null;
  return admin.firestore().collection("global_audit_logs").add({
    type: 'FINANCIAL',
    action: 'PAYMENT_RECEIVED',
    hospitalId: data.hospitalId,
    actorId: data.processedBy,
    actorName: data.processedByName || 'Cashier',
    details: `Revenue Secured: GHS ${data.totalAmount} from ${data.patientName} (Ref: ${data.paymentId})`,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
});

// 3. MONITOR: Critical Hospital Status Changes (Security Pulse)
exports.auditHospitalStatus = onDocumentUpdated("hospitals/{hospitalId}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();

  if (!before || !after) return null;

  if (before.status !== after.status) {
    return admin.firestore().collection("global_audit_logs").add({
      type: 'SECURITY',
      action: 'FACILITY_STATUS_CHANGE',
      hospitalId: event.params.hospitalId,
      actorId: 'SYSTEM',
      actorName: 'App CEO / System Autopilot',
      details: `Hospital status moved from ${before.status} to ${after.status}`,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  }
  return null;
});

// 4. MONITOR: High-Value Procurement (Supply Chain Pulse)
exports.auditPurchaseOrders = onDocumentCreated("hospitals/{hospitalId}/purchase_orders/{poId}", async (event) => {
  const data = event.data.data();
  if (!data) return null;

  const totalValue = (data.items || []).reduce((sum, item) => sum + ((item.price || 0) * (item.quantityOrdered || 0)), 0);

  if (totalValue > 5000) {
    return admin.firestore().collection("global_audit_logs").add({
      type: 'FINANCIAL',
      action: 'LARGE_PO_ISSUED',
      hospitalId: data.hospitalId,
      actorId: data.orderedBy,
      actorName: data.orderedByName || 'Procurement Officer',
      details: `High-value PO issued to ${data.supplierName} for GHS ${totalValue.toLocaleString()}`,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  }
  return null;
});
    
    






