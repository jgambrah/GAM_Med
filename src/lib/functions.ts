

/**
 * @fileoverview This file contains the conceptual TypeScript code for key Firebase Cloud Functions.
 * These functions represent the secure, server-side backend logic for the GamMed ERP system.
 *
 * NOTE: This is a blueprint for architectural planning. The actual implementation would require a
 * Firebase Functions project setup with the Firebase Admin SDK, deployed separately from the Next.js app.
 */

// import * as functions from 'firebase-functions';
// import * as admin from 'firebase-admin';
// admin.initializeApp();
// const db = admin.firestore();

// =======================================================================================
// 1. Generate Unique Patient ID (Callable Function)
// =======================================================================================
/**
 * Generates a unique, sequential patient ID (UPID) to serve as the primary key.
 * This function is the sole authority for creating new patient IDs, ensuring no duplicates.
 * Format: P-YYMMDD-XXXX (e.g., P-240808-0001)
 *
 * @trigger_type Callable Function (https)
 * @invocation This should be called from a secure backend environment (like a server action)
 *             right before creating a new patient document in Firestore.
 *   (Example from a Next.js server action)
 *   const generateId = httpsCallable(functions, 'generatePatientId');
 *   const result = await generateId();
 *   const newPatientId = result.data.patientId;
 */
/*
exports.generatePatientId = functions.region('europe-west1').https.onCall(async (data, context) => {
  // 1. Authentication & Authorization Check: Ensure only authorized staff can generate IDs.
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }
  const userDoc = await db.collection('users').doc(context.auth.uid).get();
  const userRole = userDoc.data()?.role;
  if (userRole !== 'admin' && userRole !== 'nurse') {
    throw new functions.https.HttpsError('permission-denied', 'User does not have permission to register patients.');
  }

  // 2. Generate Date-based Prefix for the ID (using a specific timezone if needed)
  const today = new Date(); // Consider using a library for reliable timezone handling
  const year = today.getFullYear().toString().slice(-2);
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  const prefix = `P-${year}${month}${day}-`;

  // 3. Find the last ID for the current day to determine the next sequence number.
  // This query must be efficient. An index on the patient_id (document ID) is automatic and fast.
  const patientsRef = db.collection('patients');
  const snapshot = await patientsRef.where(admin.firestore.FieldPath.documentId(), '>=', prefix)
                                    .where(admin.firestore.FieldPath.documentId(), '<', prefix + 'z')
                                    .orderBy(admin.firestore.FieldPath.documentId(), 'desc')
                                    .limit(1)
                                    .get();

  let newSequenceNumber = 1;
  if (!snapshot.empty) {
    const lastId = snapshot.docs[0].id;
    const lastNumber = parseInt(lastId.split('-')[2], 10);
    newSequenceNumber = lastNumber + 1;
  }

  // 4. Construct the new, unique patient ID.
  const newPatientId = prefix + newSequenceNumber.toString().padStart(4, '0');

  // 5. Return the ID to the calling client.
  return { patientId: newPatientId };
});
*/

// =======================================================================================
// 2. Handle Patient Registration (Callable Function)
// =======================================================================================
/**
 * Creates the patient record in the database. In a production app, this would be combined
 * with the ID generation into a single function to ensure the entire process is atomic.
 *
 * @trigger_type Callable Function (https)
 * @input { patientData: object, patientId: string }
 */
/*
exports.handlePatientRegistration = functions.region('europe-west1').https.onCall(async (data, context) => {
    // 1. Authentication & Authorization Check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    const userRole = userDoc.data()?.role;
    if (userRole !== 'admin' && userRole !== 'nurse') {
        throw new functions.https.HttpsError('permission-denied', 'User does not have permission to register patients.');
    }

    const { patientData, patientId } = data;
    if (!patientData || !patientId) {
        throw new functions.https.HttpsError('invalid-argument', 'Patient data and ID are required.');
    }
    
    // 2. Server-side validation (e.g., using Zod or another library)
    // const validationResult = PatientSchema.safeParse(patientData);
    // if (!validationResult.success) {
    //   throw new functions.https.HttpsError('invalid-argument', 'Patient data is invalid.');
    // }

    const patientRef = db.collection('patients').doc(patientId);
    
    try {
        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(patientRef);
            if (doc.exists) {
                throw new Error(`Patient document with ID ${patientId} already exists.`);
            }

            const now = admin.firestore.FieldValue.serverTimestamp();
            const finalPatientData = {
                ...patientData,
                patient_id: patientId, // Ensure the ID is stored in the document body as well
                createdAt: now,
                updatedAt: now,
                isAdmitted: false,
                status: 'active'
            };

            // Optional: Create a corresponding user in Firebase Auth for a patient portal
            // if (patientData.contact.email) {
            //   const userRecord = await admin.auth().createUser({ email: patientData.contact.email, ... });
            //   await db.collection('users').doc(userRecord.uid).set({ ... });
            // }

            transaction.set(patientRef, finalPatientData);
        });

        console.log(`Successfully created patient ${patientId}`);
        return { success: true, patientId: patientId };

    } catch (error) {
        console.error('Patient registration transaction failed:', error);
        throw new functions.https.HttpsError('aborted', 'Failed to create patient record.', { message: error.message });
    }
});
*/


// =======================================================================================
// 3. Handle Patient Admission (Callable Function)
// =======================================================================================
/**
 * Handles the logic for admitting a patient in a single, atomic transaction.
 * This ensures data consistency across 'patients', 'beds', and the 'admissions' sub-collection.
 *
 * @trigger_type Callable Function (https)
 * @input { patientId: string, bedId: string, reasonForAdmission: string, attendingDoctorId: string }
 */
/*
exports.handlePatientAdmission = functions.region('europe-west1').https.onCall(async (data, context) => {
    // 1. Authentication & Authorization Check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }
    // Add role check here (e.g., admin, nurse, doctor) to ensure only authorized users can admit patients.
    
    const { patientId, bedId, reasonForVisit, attendingDoctorId } = data;
    if (!patientId || !bedId || !reasonForVisit || !attendingDoctorId) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required admission details.');
    }

    const patientRef = db.collection('patients').doc(patientId);
    const bedRef = db.collection('beds').doc(bedId);
    const newAdmissionRef = patientRef.collection('admissions').doc(); // Auto-generate ID

    try {
        await db.runTransaction(async (transaction) => {
            // 2. Read documents within the transaction
            const bedDoc = await transaction.get(bedRef);
            const patientDoc = await transaction.get(patientRef);
            
            // 3. Pre-condition checks to ensure data integrity before writing.
            if (!patientDoc.exists) throw new Error('Patient record not found.');
            if (patientDoc.data()?.is_admitted) throw new Error('Patient is already admitted.');
            if (!bedDoc.exists || bedDoc.data()?.status !== 'vacant') {
                throw new Error('Bed is not available or does not exist.');
            }
            
            const now = admin.firestore.FieldValue.serverTimestamp();
            const admissionData = {
                admission_id: newAdmissionRef.id,
                patient_id: patientId,
                type: 'Inpatient',
                admission_date: now,
                reasonForVisit: reasonForVisit,
                ward: bedDoc.data()?.wardName, // Get ward from bed data
                bed_id: bedId,
                attending_doctor_id: attendingDoctorId,
                status: 'Admitted',
                created_at: now,
                updated_at: now
            };

            // 4. Perform all writes atomically. If any of these fail, all will be rolled back.
            transaction.set(newAdmissionRef, admissionData);
            transaction.update(patientRef, {
                is_admitted: true,
                current_admission_id: newAdmissionRef.id,
                updated_at: now,
            });
            transaction.update(bedRef, {
                status: 'occupied',
                current_patient_id: patientId,
                occupied_since: now,
                cleaningNeeded: false,
                updated_at: now,
            });
        });

        console.log(`Successfully admitted patient ${patientId} to bed ${bedId}`);
        return { success: true, admissionId: newAdmissionRef.id };

    } catch (error) {
        console.error('Admission transaction failed:', error);
        throw new functions.https.HttpsError('aborted', 'Failed to admit patient.', { message: error.message });
    }
});
*/

// =======================================================================================
// 4. Handle Patient Discharge (Legacy - Superseded by new workflow)
// =======================================================================================
/**
 * This function is now superseded by the more robust two-step process:
 * 1. `finalizeDischargeSummary` (clinical sign-off)
 * 2. `processPatientDischarge` (administrative finalization)
 */


// =======================================================================================
// 5. Update Outpatient Status (Legacy - Superseded by setAppointmentStatus)
// =======================================================================================
/**
 * This function is now superseded by `setAppointmentStatus` which provides more granular
 * control over the appointment lifecycle from the Doctor's Workbench.
 */
/*
exports.updateOutpatientStatus = functions.region('europe-west1').https.onCall(async (data, context) => { ... });
*/

// =======================================================================================
// 6. Finalize Discharge Summary (Callable Function - Step 1 of Discharge)
// =======================================================================================
/**
 * This is the first step in the discharge process, handled by clinical staff.
 * It atomically saves the final medical summary and moves the admission into a 'Pending Discharge' state.
 *
 * @trigger_type Callable Function (https)
 * @input { patientId: string, admissionId: string, dischargeSummaryData: object, dischargeByDoctorId: string }
 */
/*
exports.finalizeDischargeSummary = functions.region('europe-west1').https.onCall(async (data, context) => {
    // 1. Authentication & Authorization Check
    if (!context.auth || context.auth.uid !== data.dischargeByDoctorId) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated as the discharging doctor.');
    }
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    const userRole = userDoc.data()?.role;
    if (userRole !== 'doctor') {
        throw new functions.https.HttpsError('permission-denied', 'Only doctors can finalize a discharge summary.');
    }
    
    const { patientId, admissionId, dischargeSummaryData } = data;
    if (!patientId || !admissionId || !dischargeSummaryData) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required data.');
    }

    const admissionRef = db.collection('patients').doc(patientId).collection('admissions').doc(admissionId);
    
    try {
        await db.runTransaction(async (transaction) => {
            const admissionDoc = await transaction.get(admissionRef);
            if (!admissionDoc.exists || admissionDoc.data()?.status !== 'Admitted') {
                throw new Error('Admission record not found or not in a state that can be finalized.');
            }

            transaction.update(admissionRef, {
                dischargeSummary: dischargeSummaryData,
                dischargeByDoctorId: context.auth.uid,
                status: 'Pending Discharge', // Move to the next stage
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        });

        console.log(`Discharge summary for admission ${admissionId} finalized.`);
        return { success: true };

    } catch (error) {
        console.error('Finalize summary transaction failed:', error);
        throw new functions.https.HttpsError('aborted', 'Could not finalize the summary.', { message: error.message });
    }
});
*/

// =======================================================================================
// 7. Process Patient Discharge (Callable Function - Step 2 of Discharge)
// =======================================================================================
/**
 * This is the final administrative step in the discharge process.
 * It updates all related records (patient, bed, admission) atomically.
 *
 * @trigger_type Callable Function (https)
 * @input { patientId: string, admissionId: string }
 */
/*
exports.processPatientDischarge = functions.region('europe-west1').https.onCall(async (data, context) => {
    // 1. Authentication & Authorization Check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }
     const userDoc = await db.collection('users').doc(context.auth.uid).get();
    const userRole = userDoc.data()?.role;
    if (userRole !== 'admin' && userRole !== 'billing_clerk') {
        throw new functions.https.HttpsError('permission-denied', 'User does not have permission to process discharges.');
    }

    const { patientId, admissionId } = data;

    const patientRef = db.collection('patients').doc(patientId);
    const admissionRef = patientRef.collection('admissions').doc(admissionId);
    
    try {
        await db.runTransaction(async (transaction) => {
            const admissionDoc = await transaction.get(admissionRef);
            if (!admissionDoc.exists || admissionDoc.data()?.status !== 'Pending Discharge') {
                throw new Error('Admission record is not ready for final discharge.');
            }

            const bedId = admissionDoc.data()?.bed_id;
            const now = admin.firestore.FieldValue.serverTimestamp();
            
            // ** BILLING INTEGRATION (CONCEPTUAL) **
            // Here you would call a utility function to finalize the bill.
            // const finalBillId = await generateFinalBill(transaction, patientId, admissionId);
            const finalBillId = `B-${admissionId}`; // Placeholder

            // 2. Update the admission document
            transaction.update(admissionRef, {
                status: 'Discharged',
                dischargeDate: now,
                isSummaryFinalized: true,
                finalBillId: finalBillId,
                updatedAt: now,
            });

            // 3. Update the main patient document
            transaction.update(patientRef, {
                is_admitted: false,
                current_admission_id: null,
                updatedAt: now,
            });

            // 4. Update the bed document
            if (bedId) {
                const bedRef = db.collection('beds').doc(bedId);
                transaction.update(bedRef, {
                    status: 'cleaning',
                    current_patient_id: null,
                    occupied_since: null,
                    cleaningNeeded: true,
                    updatedAt: now,
                });
            }
        });

        console.log(`Successfully discharged patient ${patientId}`);
        return { success: true };

    } catch (error) {
        console.error('Discharge processing transaction failed:', error);
        throw new functions.https.HttpsError('aborted', 'Failed to process discharge.', { message: error.message });
    }
});
*/

// =======================================================================================
// 8. Generate Discharge Summary PDF (Firestore Trigger)
// =======================================================================================
/**
 * Automatically generates a PDF of the discharge summary when an admission is marked as 'Discharged'.
 *
 * @trigger_type Firestore Trigger (onUpdate)
 * @document /patients/{patientId}/admissions/{admissionId}
 */
/*
exports.generateDischargeSummaryPDF = functions.region('europe-west1').firestore
    .document('/patients/{patientId}/admissions/{admissionId}')
    .onUpdate(async (change, context) => {
        const newData = change.after.data();
        const oldData = change.before.data();

        // 1. Condition: Only run if status changed to 'Discharged' and PDF URL is not already set.
        if (newData.status === 'Discharged' && oldData.status !== 'Discharged' && !newData.summaryPDF_URL) {
            console.log(`Generating PDF for admission ${context.params.admissionId}`);
            
            // 2. PDF Generation Logic (using a service or library like Puppeteer)
            // const pdfBuffer = await createPdfFromData(newData);
            const pdfBuffer = Buffer.from('This is a dummy PDF.'); // Placeholder
            
            const filePath = `summaries/${context.params.patientId}/${context.params.admissionId}.pdf`;
            const bucket = admin.storage().bucket();
            const file = bucket.file(filePath);

            await file.save(pdfBuffer, {
                metadata: { contentType: 'application/pdf' },
            });

            // 3. Get a signed URL (or just save the path) and update the document.
            const url = await file.getSignedUrl({
                action: 'read',
                expires: '03-09-2491' // A very long expiry date
            });

            await change.after.ref.update({ summaryPDF_URL: url[0] });

            // 4. ** NOTIFICATION (CONCEPTUAL) **
            // Send an email or SMS to the patient with a link to their portal.
            // const patientDoc = await db.collection('patients').doc(context.params.patientId).get();
            // if (patientDoc.data()?.contact.email) {
            //     await sendNotification(patientDoc.data().contact.email, 'Your discharge summary is ready.');
            // }

            console.log(`PDF generated and URL saved for ${context.params.admissionId}`);
        }
        return null;
    });
*/

// =======================================================================================
// 9. Search Patients (Callable Function)
// =======================================================================================
/**
 * Performs a search for patients using a dedicated search index for performance.
 *
 * @trigger_type Callable Function (https)
 * @input { query: string } The search query string.
 * @returns {Promise<object[]>} A promise that resolves to an array of patient objects.
 *
 * ARCHITECTURAL NOTE:
 * This function acts as a secure backend for the patient search UI. It would integrate
 * with a service like Algolia or Elasticsearch, which is kept in sync with the
 * 'patients' Firestore collection (e.g., via a Firestore trigger). This architecture
 * offloads complex queries from Firestore, providing a much faster and more powerful
 * search experience that supports full-text search, typo tolerance, and custom ranking.
 */
/*
exports.searchPatients = functions.region('europe-west1').https.onCall(async (data, context) => {
    // 1. Authentication check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to search for patients.');
    }
    // Optional: Add role-based access control here if needed.

    const { query } = data;
    if (typeof query !== 'string' || query.length < 2) {
        throw new functions.https.HttpsError('invalid-argument', 'A search query of at least 2 characters is required.');
    }

    // 2. Integration with a search service (e.g., Algolia)
    // const algoliaClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);
    // const index = algoliaClient.initIndex('patients');
    // const { hits } = await index.search(query, {
    //     attributesToRetrieve: ['patient_id', 'full_name', 'dob', 'gender', 'contact', 'is_admitted'],
    //     hitsPerPage: 20
    // });

    // 3. Return the search results
    // return hits;

    // For this prototype, we return an empty array as we can't connect to a real search service.
    return [];
});
*/

// =======================================================================================
// 10. Process Incoming Referral (Callable Function)
// =======================================================================================
/**
 * Handles the creation of a new referral record and initiates the necessary workflows.
 *
 * @trigger_type Callable Function (https)
 * @input { referralData: object } The referral data from the front-end form.
 */
/*
exports.processIncomingReferral = functions.region('europe-west1').https.onCall(async (data, context) => {
    // 1. Authentication & Authorization Check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }
    // Add role check (admin, nurse, triage_officer)
    
    const { referralData } = data;
    // 2. Server-side validation of referralData against a Zod schema.

    // 3. Check for existing patient
    let existingPatientId = null;
    const phone = referralData.patientDetails.phone;
    if (phone) {
        const snapshot = await db.collection('patients').where('contact.primaryPhone', '==', phone).limit(1).get();
        if (!snapshot.empty) {
            existingPatientId = snapshot.docs[0].id;
        }
    }

    const referralRef = db.collection('referrals').doc();

    try {
        const now = admin.firestore.FieldValue.serverTimestamp();
        const finalReferralData = {
            ...referralData,
            referral_id: referralRef.id,
            patientId: existingPatientId, // Store link to existing patient if found
            status: 'Pending Review',
            created_at: now,
            updated_at: now,
        };

        await referralRef.set(finalReferralData);

        // 4. ** NOTIFICATION WORKFLOW (CONCEPTUAL) **
        // Send a notification to the triage team (e.g., users with 'triage_officer' role).
        // await sendNotificationToRole('triage_officer', `New referral for ${referralData.patientDetails.name} needs review.`);
        
        console.log(`Successfully created referral ${referralRef.id}`);
        return { success: true, referralId: referralRef.id };

    } catch (error) {
        console.error('Referral creation failed:', error);
        throw new functions.https.HttpsError('internal', 'Could not create referral.');
    }
});
*/

// =======================================================================================
// 11. On Referral Assignment (Firestore Trigger)
// =======================================================================================
/**
 * Triggers a notification when a referral is assigned to a specific doctor.
 *
 * @trigger_type Firestore Trigger (onUpdate)
 * @document /referrals/{referralId}
 */
/*
exports.onReferralAssignment = functions.region('europe-west1').firestore
    .document('/referrals/{referralId}')
    .onUpdate(async (change, context) => {
        const newData = change.after.data();
        const oldData = change.before.data();
        
        // 1. Condition: Execute only if assignedToDoctorId was null/undefined and now has a value.
        if (newData.assignedToDoctorId && !oldData.assignedToDoctorId) {
            const doctorId = newData.assignedToDoctorId;
            const patientName = newData.patientDetails.name;
            const reason = newData.reasonForReferral;
            
            console.log(`Referral ${context.params.referralId} assigned to doctor ${doctorId}.`);

            // 2. Get doctor's details (e.g., for their notification preference or device token)
            // const doctorDoc = await db.collection('users').doc(doctorId).get();
            // const doctorData = doctorDoc.data();
            
            // 3. Send notification (FCM, Email, etc.)
            // await sendNotification(doctorData.email, {
            //     subject: 'New Referral Assignment',
            //     body: `You have been assigned a new referral for patient ${patientName}. Reason: ${reason}`
            // });

            console.log(`Notification sent to doctor ${doctorId}.`);
        }
        
        return null;
    });
*/


// =======================================================================================
// 12. Link Referral To Appointment (Callable Function)
// =======================================================================================
/**
 * Atomically links a referral to a newly created appointment.
 *
 * @trigger_type Callable Function (https)
 * @input { referralId: string, appointmentId: string }
 */
/*
exports.linkReferralToAppointment = functions.region('europe-west1').https.onCall(async (data, context) => {
    // 1. Auth check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }
    // Add role check (admin, nurse, scheduling_clerk)

    const { referralId, appointmentId } = data;
    if (!referralId || !appointmentId) {
        throw new functions.https.HttpsError('invalid-argument', 'referralId and appointmentId are required.');
    }

    const referralRef = db.collection('referrals').doc(referralId);
    const appointmentRef = db.collection('appointments').doc(appointmentId);
    
    try {
        await db.runTransaction(async (transaction) => {
            const referralDoc = await transaction.get(referralRef);
            if (!referralDoc.exists) {
                throw new Error('Referral not found.');
            }
            
            // 2. Perform atomic updates
            transaction.update(referralRef, {
                status: 'Scheduled',
                appointmentId: appointmentId,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            
            // This assumes the appointment document already exists.
            transaction.update(appointmentRef, {
                referralId: referralId,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        });
        
        console.log(`Successfully linked referral ${referralId} to appointment ${appointmentId}.`);
        return { success: true };

    } catch (error) {
        console.error('Linking referral to appointment failed:', error);
        throw new functions.https.HttpsError('aborted', 'Could not link records.', { message: error.message });
    }
});
*/

// =======================================================================================
// 13. On New Medication Prescribed (Firestore Trigger - EHR/Pharmacy Integration)
// =======================================================================================
/**
 * Triggers when a new medication is added to a patient's EHR, creating a corresponding
 * order in the pharmacy module's work queue.
 *
 * @trigger_type Firestore Trigger (onCreate)
 * @document /patients/{patientId}/medication_history/{prescriptionId}
 */
/*
exports.onNewMedicationPrescribed = functions.region('europe-west1').firestore
    .document('/patients/{patientId}/medication_history/{prescriptionId}')
    .onCreate(async (snapshot, context) => {
        const { patientId, prescriptionId } = context.params;
        const prescriptionData = snapshot.data();

        // 1. Prepare data for the pharmacy work queue
        const pharmacyOrder = {
            ...prescriptionData, // Copy all relevant prescription details
            patientId: patientId,
            ehrPrescriptionId: prescriptionId, // Link back to the original EHR record
            status: 'Pending Fulfillment',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // 2. Create a new document in the central pharmacy work queue collection.
        // This decouples the EHR from the pharmacy's internal workflow.
        await db.collection('pharmacy_orders').add(pharmacyOrder);

        console.log(`Pharmacy order created for patient ${patientId}, prescription ${prescriptionId}.`);
        return null;
    });
*/


// =======================================================================================
// 14. On New Lab Test Ordered (Firestore Trigger - EHR/Lab Integration)
// =======================================================================================
/**
 * Triggers when a new lab test is ordered in a patient's EHR, creating a request
 * in the laboratory module's work queue.
 *
 * @trigger_type Firestore Trigger (onCreate)
 * @document /patients/{patientId}/lab_results/{testId}
 */
/*
exports.onNewLabTestOrdered = functions.region('europe-west1').firestore
    .document('/patients/{patientId}/lab_results/{testId}')
    .onCreate(async (snapshot, context) => {
        const { patientId, testId } = context.params;
        const testOrderData = snapshot.data();

        // 1. Prepare data for the lab's work queue.
        const labRequest = {
            patientId: patientId,
            ehrTestId: testId,
            testName: testOrderData.testName,
            orderedByDoctorId: testOrderData.orderedByDoctorId,
            status: 'New Request', // Initial status for the lab's workflow
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        // 2. Create the document in the lab's request queue.
        await db.collection('lab_requests').add(labRequest);
        
        console.log(`Lab request created for patient ${patientId}, test ${testId}.`);
        return null;
    });
*/

// =======================================================================================
// 15. On Lab Result Completed (Firestore Trigger - Notification)
// =======================================================================================
/**
 * Triggers a notification to the ordering doctor when a lab result is finalized.
 *
 * @trigger_type Firestore Trigger (onUpdate)
 * @document /patients/{patientId}/lab_results/{testId}
 */
/*
exports.onLabResultCompleted = functions.region('europe-west1').firestore
    .document('/patients/{patientId}/lab_results/{testId}')
    .onUpdate(async (change, context) => {
        const newData = change.after.data();
        const oldData = change.before.data();
        
        // 1. Condition: Only run if status changed to 'Completed'.
        if (newData.status === 'Completed' && oldData.status !== 'Completed') {
            const { patientId } = context.params;
            const doctorId = newData.orderedByDoctorId;
            
            // 2. Get patient and doctor details for the notification.
            // const patientDoc = await db.collection('patients').doc(patientId).get();
            // const patientName = patientDoc.data()?.full_name || 'A patient';

            const notificationMessage = {
                title: 'Lab Result Ready',
                body: `The result for the ${newData.testName} test for ${patientName} is now available for review.`
            };
            
            // 3. Send notification (e.g., FCM to a specific device token, email, etc.)
            // await sendNotificationToUser(doctorId, notificationMessage);
            
            console.log(`Notification sent to doctor ${doctorId} for completed lab test.`);
        }
        
        return null;
    });
*/

// =======================================================================================
// == DOCTOR'S WORKBENCH FUNCTIONS
// =======================================================================================

// =======================================================================================
// 16. Set Appointment Status (Callable Function)
// =======================================================================================
/**
 * Updates the status of an appointment from the Doctor's Workbench.
 *
 * @trigger_type Callable Function (https)
 * @input { appointmentId: string, status: 'In Progress' | 'Completed' | 'Canceled' }
 */
/*
exports.setAppointmentStatus = functions.region('europe-west1').https.onCall(async (data, context) => {
    // 1. Auth check: Ensure the user is an authenticated doctor.
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    if (userDoc.data()?.role !== 'doctor') {
      throw new functions.https.HttpsError('permission-denied', 'Only a doctor can update appointment status.');
    }

    const { appointmentId, status } = data;
    if (!appointmentId || !status) {
      throw new functions.https.HttpsError('invalid-argument', 'appointmentId and status are required.');
    }

    const appointmentRef = db.collection('appointments').doc(appointmentId);

    try {
        await db.runTransaction(async (transaction) => {
            const appointmentDoc = await transaction.get(appointmentRef);
            if (!appointmentDoc.exists) throw new Error('Appointment not found.');
            
            // Security check: Ensure the doctor updating the appointment is the one assigned to it.
            if (appointmentDoc.data()?.attendingDoctorId !== context.auth.uid) {
                throw new functions.https.HttpsError('permission-denied', 'You are not assigned to this appointment.');
            }

            // Update the appointment status
            transaction.update(appointmentRef, {
                status: status,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // If the appointment is completed, update the patient's lastVisitDate.
            if (status === 'Completed') {
                const patientId = appointmentDoc.data()?.patientId;
                if (patientId) {
                    const patientRef = db.collection('patients').doc(patientId);
                    transaction.update(patientRef, {
                        lastVisitDate: admin.firestore.FieldValue.serverTimestamp(),
                    });
                }
            }
        });

        console.log(`Appointment ${appointmentId} status updated to ${status}.`);
        return { success: true };
    } catch (error) {
        console.error(`Failed to update status for appointment ${appointmentId}:`, error);
        throw new functions.https.HttpsError('aborted', 'Could not update appointment status.', { message: error.message });
    }
});
*/

// =======================================================================================
// 17. Write Prescription (Callable Function)
// =======================================================================================
/**
 * Creates a new medication record in the patient's EHR and a corresponding order in the pharmacy queue.
 *
 * @trigger_type Callable Function (https)
 * @input { patientId: string, medicationName: string, dosage: string, frequency: string, instructions: string }
 */
/*
exports.writePrescription = functions.region('europe-west1').https.onCall(async (data, context) => {
    // 1. Auth check: Ensure the user is an authenticated doctor.
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    if (userDoc.data()?.role !== 'doctor') {
        throw new functions.https.HttpsError('permission-denied', 'Only doctors can write prescriptions.');
    }
    
    const { patientId, medicationName, dosage, frequency, instructions } = data;
    // Server-side validation of input data here...

    const newPrescriptionRef = db.collection('patients').doc(patientId).collection('medication_history').doc();
    const newPharmacyOrderRef = db.collection('pharmacy_orders').doc(); // Create in central queue
    
    try {
        await db.runTransaction(async (transaction) => {
            const now = admin.firestore.FieldValue.serverTimestamp();
            
            // Data for the EHR
            const ehrPrescriptionData = {
                prescriptionId: newPrescriptionRef.id,
                medicationName,
                dosage,
                frequency,
                instructions,
                prescribedByDoctorId: context.auth.uid,
                prescribedAt: now,
                status: 'Active'
            };

            // Data for the Pharmacy Module work queue
            const pharmacyOrderData = {
                ...ehrPrescriptionData,
                orderId: newPharmacyOrderRef.id,
                patientId,
                status: 'Pending Fulfillment',
            };
            
            transaction.set(newPrescriptionRef, ehrPrescriptionData);
            transaction.set(newPharmacyOrderRef, pharmacyOrderData);
        });

        console.log(`Prescription ${newPrescriptionRef.id} created for patient ${patientId}.`);
        return { success: true, prescriptionId: newPrescriptionRef.id };

    } catch (error) {
        console.error('Failed to write prescription:', error);
        throw new functions.https.HttpsError('aborted', 'Could not save prescription.', { message: error.message });
    }
});
*/

// =======================================================================================
// 18. Order Lab Test (Callable Function)
// =======================================================================================
/**
 * Creates a new lab test record in the patient's EHR and a corresponding request in the lab queue.
 *
 * @trigger_type Callable Function (https)
 * @input { patientId: string, testName: string, notes: string }
 */
/*
exports.orderLabTest = functions.region('europe-west1').https.onCall(async (data, context) => {
    // 1. Auth check: Ensure the user is an authenticated doctor.
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    if (userDoc.data()?.role !== 'doctor') {
        throw new functions.https.HttpsError('permission-denied', 'Only doctors can order lab tests.');
    }

    const { patientId, testName, notes } = data;
    // Server-side validation of input data here...

    const newLabResultRef = db.collection('patients').doc(patientId).collection('lab_results').doc();
    const newLabRequestRef = db.collection('lab_requests').doc();
    
    try {
        await db.runTransaction(async (transaction) => {
            const now = admin.firestore.FieldValue.serverTimestamp();
            const patientDoc = await transaction.get(db.collection('patients').doc(patientId));
            if (!patientDoc.exists) throw new Error("Patient not found");

            // Data for the EHR
            const ehrLabResultData = {
                testId: newLabResultRef.id,
                patientId,
                testName,
                notes,
                status: 'Ordered',
                orderedByDoctorId: context.auth.uid,
                orderedAt: now,
            };

            // Data for the Lab Module work queue
            const labRequestData = {
                requestId: newLabRequestRef.id,
                ehrTestId: newLabResultRef.id,
                patientId,
                patientName: patientDoc.data()?.full_name, // Denormalize for display in lab UI
                testName,
                notes,
                status: 'New Request',
                orderedByDoctorId: context.auth.uid,
                orderedAt: now,
            };

            transaction.set(newLabResultRef, ehrLabResultData);
            transaction.set(newLabRequestRef, labRequestData);
        });

        console.log(`Lab test ${newLabResultRef.id} ordered for patient ${patientId}.`);
        return { success: true, testId: newLabResultRef.id };

    } catch (error) {
        console.error('Failed to order lab test:', error);
        throw new functions.https.HttpsError('aborted', 'Could not save lab order.', { message: error.message });
    }
});
*/
```