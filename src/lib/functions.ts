

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
// == APPOINTMENT & SCHEDULING MANAGEMENT
// =======================================================================================

/**
 * Retrieves a list of available time slots for a specific doctor on a given date.
 *
 * @trigger_type Callable Function (https)
 * @input { doctorId: string, date: string (YYYY-MM-DD) }
 */
/*
exports.getDoctorAvailability = functions.region('europe-west1').https.onCall(async (data, context) => {
    // 1. Auth check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }

    const { doctorId, date } = data;
    
    // 2. Fetch doctor's schedule for the day
    const scheduleQuery = db.collection('doctor_schedules')
        .where('doctorId', '==', doctorId)
        .where('date', '==', date); // date is YYYY-MM-DD

    const scheduleSnapshot = await scheduleQuery.get();

    if (scheduleSnapshot.empty) {
        // No specific schedule for this day, could fall back to a default weekly template or return empty.
        return { availableSlots: [], unavailablePeriods: [] }; 
    }

    const doctorSchedule = scheduleSnapshot.docs[0].data();
    
    // 3. Return the availability data for the front-end to process.
    return { 
        availableSlots: doctorSchedule.availableSlots || [], 
        unavailablePeriods: doctorSchedule.unavailablePeriods || [] 
    };
});
*/

/**
 * Retrieves a list of all available time slots for an entire clinic on a given date.
 *
 * @trigger_type Callable Function (https)
 * @input { clinicId: string, date: string (YYYY-MM-DD) }
 */
/*
exports.getClinicAvailability = functions.region('europe-west1').https.onCall(async (data, context) => {
    // 1. Auth check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }

    const { clinicId, date } = data;
    
    // 2. Fetch all doctors affiliated with the clinic.
    const clinicDoc = await db.collection('clinics').doc(clinicId).get();
    if (!clinicDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Clinic not found.');
    }
    const { affiliatedDoctorIds } = clinicDoc.data();

    // 3. Fetch all schedules for those doctors on the specified date.
    // Firestore 'in' query is limited to 10 items, for more doctors, multiple queries would be needed.
    const schedulesQuery = db.collection('doctor_schedules')
        .where('doctorId', 'in', affiliatedDoctorIds)
        .where('date', '==', date);
    
    const schedulesSnapshot = await schedulesQuery.get();
    
    // 4. Aggregate all available time slots from all schedules.
    let allAvailableSlots = [];
    schedulesSnapshot.forEach(doc => {
        allAvailableSlots.push(...doc.data().availableSlots);
    });

    // 5. Query for all existing appointments for those doctors on that day to find booked slots.
    const appointmentsQuery = db.collection('appointments')
        .where('doctorId', 'in', affiliatedDoctorIds)
        .where('appointment_date', '==', date)
        .where('status', '!=', 'Canceled');
        
    const appointmentsSnapshot = await appointmentsQuery.get();
    const bookedSlots = appointmentsSnapshot.docs.map(doc => doc.data().startTime); // Assuming startTime is a unique identifier for the slot.

    // 6. Filter out the booked slots from the aggregated available slots.
    const finalAvailableSlots = allAvailableSlots.filter(slot => !bookedSlots.includes(slot.start));

    // 7. Return the comprehensive list of available slots for the entire clinic.
    return { availableSlots: finalAvailableSlots };
});
*/


/**
 * Books a new appointment after performing complex availability and conflict checks.
 *
 * @trigger_type Callable Function (https)
 * @input { patientId: string, doctorId: string | null, clinicId: string, startTime: Timestamp, endTime: Timestamp, ... }
 */
/*
exports.bookAppointment = functions.region('europe-west1').https.onCall(async (data, context) => {
    // 1. Auth check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }
    // Add role check (admin, nurse, patient)

    let { patientId, doctorId, clinicId, startTime, endTime, requiredEquipmentIds } = data;
    // Server-side validation of input data here...

    const newAppointmentRef = db.collection('appointments').doc();

    try {
        await db.runTransaction(async (transaction) => {
            const startTimestamp = admin.firestore.Timestamp.fromDate(new Date(startTime));
            
            // 2. Automated Doctor Allocation
            if (!doctorId) {
                if (!clinicId) {
                    throw new Error('You must provide either a doctorId or a clinicId.');
                }
                // Fetch affiliated doctors for the clinic
                const clinicDoc = await transaction.get(db.collection('clinics').doc(clinicId));
                if (!clinicDoc.exists) throw new Error('Clinic not found.');
                const affiliatedDoctorIds = clinicDoc.data().affiliatedDoctorIds;
                
                // Find the first available doctor (simple round-robin or first-available strategy)
                let assignedDoctorId = null;
                for (const docId of affiliatedDoctorIds) {
                    const conflictQuery = db.collection('appointments')
                        .where('doctorId', '==', docId)
                        .where('startTime', '==', startTimestamp)
                        .where('status', '!=', 'Canceled');
                    const conflictSnapshot = await transaction.get(conflictQuery);
                    if (conflictSnapshot.empty) {
                        // This doctor is available, assign them.
                        assignedDoctorId = docId;
                        break; 
                    }
                }
                
                if (!assignedDoctorId) {
                    throw new Error('No doctors are available in this clinic at the selected time.');
                }
                doctorId = assignedDoctorId; // Set the found doctorId for the rest of the transaction.
            }
            
            // 3. Perform a real-time check to ensure the slot hasn't been taken.
            const conflictQuery = db.collection('appointments')
                .where('doctorId', '==', doctorId)
                .where('startTime', '==', startTimestamp)
                .where('status', '!=', 'Canceled');
            
            const conflictSnapshot = await transaction.get(conflictQuery);
            if (!conflictSnapshot.empty) {
                throw new Error('This appointment slot is no longer available. Please select another time.');
            }
            
            // 4. If all checks pass, create the new documents
            const appointmentData = {
                ...data,
                doctorId: doctorId, // Ensure the assigned doctorId is set
                appointmentId: newAppointmentRef.id,
                status: 'Scheduled',
                bookedAt: admin.firestore.FieldValue.serverTimestamp(),
                bookedByUserId: context.auth.uid
            };

            transaction.set(newAppointmentRef, appointmentData);

            // Also create a record in the patient's history
            const patientHistoryRef = db.collection('patients').doc(patientId).collection('appointment_history').doc(newAppointmentRef.id);
            transaction.set(patientHistoryRef, appointmentData);
        });

        // 5. Send notifications
        // await sendConfirmationEmail(patientId, doctorId, startTime);

        console.log(`Appointment ${newAppointmentRef.id} booked successfully.`);
        return { success: true, appointmentId: newAppointmentRef.id };

    } catch (error) {
        console.error('Failed to book appointment:', error);
        throw new functions.https.HttpsError('aborted', 'Could not book appointment.', { message: error.message });
    }
});
*/

/**
 * Cancels an existing appointment.
 *
 * @trigger_type Callable Function (https)
 * @input { appointmentId: string, reason: string }
 */
/*
exports.cancelAppointment = functions.region('europe-west1').https.onCall(async (data, context) => {
    // 1. Auth check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }
    // Add logic to check if user is the patient, the doctor, or an admin

    const { appointmentId, reason } = data;
    const appointmentRef = db.collection('appointments').doc(appointmentId);

    try {
        await db.runTransaction(async (transaction) => {
            const appointmentDoc = await transaction.get(appointmentRef);
            if (!appointmentDoc.exists) throw new Error('Appointment not found.');
            
            const patientId = appointmentDoc.data().patientId;
            const patientHistoryRef = db.collection('patients').doc(patientId).collection('appointment_history').doc(appointmentId);

            // 2. Update status in both locations
            transaction.update(appointmentRef, { status: 'Canceled', cancellationReason: reason });
            transaction.update(patientHistoryRef, { status: 'Canceled', cancellationReason: reason });
        });
        
        // 3. Send cancellation notifications to patient and doctor.
        // await sendCancellationEmail(...);

        console.log(`Appointment ${appointmentId} canceled.`);
        return { success: true };

    } catch (error) {
        console.error('Failed to cancel appointment:', error);
        throw new functions.https.HttpsError('aborted', 'Could not cancel appointment.', { message: error.message });
    }
});
*/

/**
 * Sends reminders for appointments scheduled for the next day.
 *
 * @trigger_type Scheduled (cron job)
 * @schedule 'every day 17:00'
 */
/*
exports.sendAppointmentReminders = functions.region('europe-west1').pubsub
    .schedule('every day 17:00')
    .timeZone('Africa/Accra')
    .onRun(async (context) => {
        const now = new Date();
        const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);

        // 1. Query for appointments happening tomorrow
        const snapshot = await db.collection('appointments')
            .where('startTime', '>=', admin.firestore.Timestamp.fromDate(tomorrowStart))
            .where('startTime', '<', admin.firestore.Timestamp.fromDate(tomorrowEnd))
            .where('status', '==', 'Scheduled')
            .get();

        if (snapshot.empty) {
            console.log('No appointments to send reminders for.');
            return null;
        }

        // 2. Iterate and send reminders
        for (const doc of snapshot.docs) {
            const appointment = doc.data();
            const patientDoc = await db.collection('patients').doc(appointment.patientId).get();
            if (!patientDoc.exists) continue;

            const patientData = patientDoc.data();
            const contactInfo = patientData.contact.primaryPhone; // or email
            
            // Example message construction
            const message = `Hello ${patientData.full_name}, this is a reminder of your appointment with Dr. ${appointment.doctorName} tomorrow at ${new Date(appointment.startTime.seconds * 1000).toLocaleTimeString()}. Please be on time. Call 123-456-7890 to reschedule.`;
            
            // 3. Send SMS/email via a third-party service
            // await sendSms(contactInfo, message);
            console.log(`Sending reminder to ${contactInfo}: ${message}`);
        }

        return null;
    });
*/


// =======================================================================================
// == DOCTOR'S WORKBENCH & SCHEDULE MANAGEMENT
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

// =======================================================================================
// 19. Update Doctor Schedule (Callable Function)
// =======================================================================================
/**
 * Updates a doctor's schedule for a specific day. Can create a new schedule if one doesn't exist.
 *
 * @trigger_type Callable Function (https)
 * @input { doctorId: string, scheduleData: { date: string, availableSlots: object[], unavailablePeriods: object[] } }
 */
/*
exports.updateDoctorSchedule = functions.region('europe-west1').https.onCall(async (data, context) => {
    // 1. Auth check: Allow doctors to edit their own schedule, or admins to edit any schedule.
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    const userRole = userDoc.data()?.role;
    if (userRole !== 'admin' && context.auth.uid !== data.doctorId) {
        throw new functions.https.HttpsError('permission-denied', 'You do not have permission to edit this schedule.');
    }
    
    const { doctorId, scheduleData } = data;
    if (!doctorId || !scheduleData || !scheduleData.date) {
        throw new functions.https.HttpsError('invalid-argument', 'doctorId and scheduleData (with date) are required.');
    }

    // 2. Query for an existing schedule document for that doctor on that day.
    const scheduleQuery = db.collection('doctor_schedules')
        .where('doctorId', '==', doctorId)
        .where('date', '==', scheduleData.date)
        .limit(1);
        
    const scheduleSnapshot = await scheduleQuery.get();
    
    const finalScheduleData = {
        doctorId: doctorId,
        date: scheduleData.date,
        availableSlots: scheduleData.availableSlots || [],
        unavailablePeriods: scheduleData.unavailablePeriods || [],
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (scheduleSnapshot.empty) {
        // 3a. No schedule exists, create a new one.
        finalScheduleData.createdAt = admin.firestore.FieldValue.serverTimestamp();
        await db.collection('doctor_schedules').add(finalScheduleData);
        console.log(`Created new schedule for doctor ${doctorId} on ${scheduleData.date}.`);
    } else {
        // 3b. Schedule exists, update it.
        const scheduleDocRef = scheduleSnapshot.docs[0].ref;
        await scheduleDocRef.update(finalScheduleData);
        console.log(`Updated schedule for doctor ${doctorId} on ${scheduleData.date}.`);
    }

    return { success: true };
});
*/

// =======================================================================================
// 20. Handle Leave Request (Callable Function)
// =======================================================================================
/**
 * Processes a leave request by blocking out unavailability and notifying staff of conflicts.
 *
 * @trigger_type Callable Function (https)
 * @input { doctorId: string, startDate: string, endDate: string, reason: string }
 */
/*
exports.handleLeaveRequest = functions.region('europe-west1').https.onCall(async (data, context) => {
    // 1. Auth check (admin or the doctor themselves)
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    
    const { doctorId, startDate, endDate, reason } = data;
    const leaveStart = new Date(startDate);
    const leaveEnd = new Date(endDate);

    const conflictingAppointments = [];

    // 2. Loop through each day of the leave period
    for (let day = new Date(leaveStart); day <= leaveEnd; day.setDate(day.getDate() + 1)) {
        const dateStr = day.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        
        // 2a. Find and cancel any appointments on this day
        const appointmentsSnapshot = await db.collection('appointments')
            .where('doctorId', '==', doctorId)
            .where('appointmentDate', '==', dateStr)
            .where('status', '!=', 'Canceled')
            .get();
            
        appointmentsSnapshot.forEach(doc => conflictingAppointments.push(doc.data()));
        
        // 2b. Update or create the schedule for the day to mark it as unavailable
        // This is a simplified version; a real implementation would use updateDoctorSchedule logic
        const scheduleSnapshot = await db.collection('doctor_schedules').where('doctorId', '==', doctorId).where('date', '==', dateStr).limit(1).get();
        const leaveBlock = { start: '00:00', end: '23:59', reason: reason };
        if (scheduleSnapshot.empty) {
            await db.collection('doctor_schedules').add({
                doctorId,
                date: dateStr,
                availableSlots: [],
                unavailablePeriods: [leaveBlock],
            });
        } else {
            await scheduleSnapshot.docs[0].ref.update({
                availableSlots: [],
                unavailablePeriods: [leaveBlock]
            });
        }
    }

    // 3. Notify admin/reception staff about the conflicting appointments that need rescheduling
    if (conflictingAppointments.length > 0) {
        // await sendNotificationToRole('admin', {
        //     subject: `Leave Conflict for Dr. ${doctorId}`,
        //     body: `The following ${conflictingAppointments.length} appointments need to be rescheduled...`
        // });
        console.log(`Found ${conflictingAppointments.length} appointments to reschedule.`);
    }

    return { success: true, conflictingAppointmentsCount: conflictingAppointments.length };
});
*/


// =======================================================================================
// == NURSING MODULE FUNCTIONS
// =======================================================================================

// =======================================================================================
// 21. Log Vitals (Callable Function)
// =======================================================================================
/**
 * Records a new set of vital signs for a patient.
 *
 * @trigger_type Callable Function (https)
 * @input { patientId: string, vitalsData: object }
 */
/*
exports.logVitals = functions.region('europe-west1').https.onCall(async (data, context) => {
    // 1. Auth check: Ensure the user is an authenticated nurse or doctor.
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    const userRole = userDoc.data()?.role;
    if (userRole !== 'doctor' && userRole !== 'nurse') {
        throw new functions.https.HttpsError('permission-denied', 'Only clinical staff can log vitals.');
    }

    const { patientId, vitalsData } = data;
    // 2. Server-side validation of vitalsData...

    const newVitalsRef = db.collection('patients').doc(patientId).collection('vitals').doc();

    const finalVitalsData = {
        ...vitalsData,
        vitalId: newVitalsRef.id,
        recordedByUserId: context.auth.uid,
        recordedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await newVitalsRef.set(finalVitalsData);

    // 3. (Optional) Alerting Logic
    // This action is now handled by the `checkVitalSigns` Firestore trigger,
    // which creates a clean separation of concerns.

    console.log(`Vitals logged for patient ${patientId}.`);
    return { success: true };
});
*/

// =======================================================================================
// 22. Log Medication Administration (Callable Function)
// =======================================================================================
/**
 * Creates a log entry confirming that a medication was administered to a patient.
 *
 * @trigger_type Callable Function (https)
 * @input { patientId: string, prescriptionId: string, notes?: string }
 */
/*
exports.logMedicationAdministration = functions.region('europe-west1').https.onCall(async (data, context) => {
    // 1. Auth check: Ensure the user is an authenticated nurse.
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    if (userDoc.data()?.role !== 'nurse') {
        throw new functions.https.HttpsError('permission-denied', 'Only nurses can log medication administration.');
    }

    const { patientId, prescriptionId, notes } = data;

    const prescriptionRef = db.collection('patients').doc(patientId).collection('medication_history').doc(prescriptionId);
    const newLogRef = db.collection('patients').doc(patientId).collection('medication_administration_logs').doc();

    try {
        await db.runTransaction(async (transaction) => {
            const prescriptionDoc = await transaction.get(prescriptionRef);
            if (!prescriptionDoc.exists) {
                throw new Error("Original prescription not found.");
            }
            
            const prescriptionData = prescriptionDoc.data();
            const logData = {
                logId: newLogRef.id,
                prescriptionId: prescriptionId,
                medicationName: prescriptionData.medicationName, // Denormalize for easy display
                dosage: prescriptionData.dosage, // Denormalize for easy display
                administeredByUserId: context.auth.uid,
                administeredAt: admin.firestore.FieldValue.serverTimestamp(),
                notes: notes || null
            };

            transaction.set(newLogRef, logData);
            
            // Optional: Update pharmacy status if needed, though this might be handled by the pharmacy module.
        });
        
        console.log(`Medication administration logged for prescription ${prescriptionId}.`);
        return { success: true };

    } catch (error) {
        console.error('Failed to log medication administration:', error);
        throw new functions.https.HttpsError('aborted', 'Could not save administration log.', { message: error.message });
    }
});
*/

// =======================================================================================
// 23. Update Care Plan (Callable Function)
// =======================================================================================
/**
 * Updates a patient's care plan.
 *
 * @trigger_type Callable Function (https)
 * @input { patientId: string, planId: string, updatedFields: object }
 */
/*
exports.updateCarePlan = functions.region('europe-west1').https.onCall(async (data, context) => {
    // 1. Auth check: Ensure the user is an authenticated nurse or doctor.
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    const userRole = userDoc.data()?.role;
    if (userRole !== 'doctor' && userRole !== 'nurse') {
        throw new functions.https.HttpsError('permission-denied', 'Only clinical staff can update care plans.');
    }

    const { patientId, planId, updatedFields } = data;
    // Server-side validation of updatedFields...

    const carePlanRef = db.collection('patients').doc(patientId).collection('care_plans').doc(planId);

    const finalUpdateData = {
        ...updatedFields,
        updatedByUserId: context.auth.uid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await carePlanRef.update(finalUpdateData);

    console.log(`Care plan ${planId} for patient ${patientId} updated.`);
    return { success: true };
});
*/

// =======================================================================================
// == e-PRESCRIBING & CLINICAL DECISION SUPPORT (CDS)
// =======================================================================================


// =======================================================================================
// 24. Handle e-Prescription (Callable Function) - DEPRECATED in favor of modular approach
// =======================================================================================
/**
 * This monolithic function is now deprecated in favor of a more flexible, two-step process:
 * 1. `performPrescriptionChecks` (CDS): A callable function that provides real-time safety feedback to the UI.
 * 2. `submitPrescriptionToPharmacy`: A callable function that finalizes and saves the prescription after checks are acknowledged.
 */


// =======================================================================================
// 25. Perform Prescription Checks / checkMedicationOrder (Callable CDS Function)
// =======================================================================================
/**
 * Performs all safety checks for a proposed prescription without writing it to the database.
 * This function is called by the UI to get real-time feedback before the doctor finalizes the prescription.
 * It is a core component of the Clinical Decision Support (CDS) system.
 *
 * @trigger_type Callable Function (https)
 * @input { patientId: string, medicationId: string, dosage: string }
 * @returns {Promise<{warnings: string[]}>} An object containing an array of warning strings.
 */
/*
exports.performPrescriptionChecks = functions.region('europe-west1').https.onCall(async (data, context) => {
    // 1. Auth check
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    // Role check to ensure only doctors can perform this.
    
    const { patientId, medicationId, dosage } = data;
    const warnings = [];

    // 2. Fetch necessary data in parallel for efficiency
    const patientRef = db.collection('patients').doc(patientId);
    const medicationRef = db.collection('medications').doc(medicationId);
    const activeMedsQuery = patientRef.collection('medication_history').where('status', '==', 'Active');
    
    const [patientDoc, medicationDoc, activeMedsSnapshot] = await Promise.all([
        patientRef.get(),
        medicationRef.get(),
        activeMedsQuery.get()
    ]);
    
    if (!patientDoc.exists || !medicationDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Patient or medication data not found.');
    }
    
    const patientData = patientDoc.data();
    const newMedData = medicationDoc.data();

    // 3. --- SAFETY CHECKS ---
    
    // a) Drug-Allergy Interaction (DAI) Check
    const patientAllergies = patientData.allergies || [];
    if (newMedData.allergens.some(allergen => patientAllergies.includes(allergen))) {
        warnings.push(`High-risk allergy: Patient is allergic to a component in ${newMedData.brandName}.`);
    }

    // b) Drug-Drug Interaction (DDI) Check
    // This is a simplified example. A real implementation requires a comprehensive interaction database.
    const activeMedications = activeMedsSnapshot.docs.map(doc => doc.data());
    for (const activeMed of activeMedications) {
        if (newMedData.knownInteractions.includes(activeMed.medicationId)) {
            warnings.push(`Interaction warning: ${newMedData.brandName} may interact with ${activeMed.medicationName}.`);
        }
    }
    
    // c) Dosage Check
    // A simplified check against the 'adult' standard dosage.
    if (dosage !== newMedData.standardDosages.adult) {
        warnings.push(`Dosage check: The prescribed dosage of "${dosage}" differs from the standard adult dosage of "${newMedData.standardDosages.adult}".`);
    }
    
    // 4. Return the aggregated warnings to the front-end
    return { warnings };
});
*/

// =======================================================================================
// 26. Submit Prescription To Pharmacy (Callable Function)
// =======================================================================================
/**
 * Finalizes and saves a prescription after safety checks have been performed and acknowledged.
 * This function performs an atomic write to multiple locations in Firestore.
 *
 * @trigger_type Callable Function (https)
 * @input { prescriptionData: object } The complete data for the new prescription.
 */
/*
exports.submitPrescriptionToPharmacy = functions.region('europe-west1').https.onCall(async (data, context) => {
    // 1. Auth check
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    // Role check to ensure only doctors can submit.

    const { prescriptionData } = data;
    if (!prescriptionData) throw new functions.https.HttpsError('invalid-argument', 'Prescription data is required.');
    
    // 2. Prepare references for the atomic transaction
    const patientId = prescriptionData.patientId;
    const patientRef = db.collection('patients').doc(patientId);
    const newPrescriptionRef = db.collection('prescriptions').doc(); // Top-level collection
    const patientHistoryRef = patientRef.collection('medication_history').doc(newPrescriptionRef.id);
    
    try {
        await db.runTransaction(async (transaction) => {
            const now = admin.firestore.FieldValue.serverTimestamp();
            
            // 3. Prepare the final data objects
            const finalPrescriptionData = {
                ...prescriptionData,
                prescriptionId: newPrescriptionRef.id,
                prescribedByDoctorId: context.auth.uid,
                status: 'Pending Pharmacy',
                prescribedAt: now
            };

            const historyData = { ...finalPrescriptionData, status: 'Active' }; // EHR status is 'Active'
            
            // 4. Set both documents within the transaction
            transaction.set(newPrescriptionRef, finalPrescriptionData);
            transaction.set(patientHistoryRef, historyData);
            
            // NOTE: A separate Firestore Trigger on the 'prescriptions' collection
            // would then create the order in the 'pharmacy_queue' for total decoupling.
        });

        console.log(`Prescription ${newPrescriptionRef.id} submitted for patient ${patientId}.`);
        return { success: true, prescriptionId: newPrescriptionRef.id };

    } catch (error) {
        console.error('Prescription submission transaction failed:', error);
        throw new functions.https.HttpsError('aborted', 'Failed to save prescription.', { message: error.message });
    }
});
*/

// =======================================================================================
// 27. checkVitalSigns (CDS Firestore Trigger)
// =======================================================================================
/**
 * A CDS engine component that automatically evaluates vital signs against predefined rules.
 *
 * @trigger_type Firestore Trigger (onCreate)
 * @document /patients/{patientId}/vitals/{vitalId}
 */
/*
exports.checkVitalSigns = functions.region('europe-west1').firestore
    .document('/patients/{patientId}/vitals/{vitalId}')
    .onCreate(async (snapshot, context) => {
        const { patientId } = context.params;
        const newVitalsData = snapshot.data();

        // 1. Fetch all active clinical rules for vitals
        const rulesSnapshot = await db.collection('clinical_rules')
            .where('trigger_type', '==', 'vitals_update')
            .where('isActive', '==', true)
            .get();

        if (rulesSnapshot.empty) {
            console.log('No active vitals rules to evaluate.');
            return null;
        }

        const alertsToCreate = [];

        // 2. Evaluate each rule against the new vitals data
        rulesSnapshot.forEach(ruleDoc => {
            const rule = ruleDoc.data();
            let allConditionsMet = true;

            for (const condition of rule.conditions) {
                const vitalValue = parseFloat(newVitalsData[condition.key]);
                if (isNaN(vitalValue)) {
                    allConditionsMet = false;
                    break;
                }

                switch (condition.operator) {
                    case '>': if (!(vitalValue > condition.value)) allConditionsMet = false; break;
                    case '<': if (!(vitalValue < condition.value)) allConditionsMet = false; break;
                    // ... other operators
                    default: allConditionsMet = false; break;
                }
                if (!allConditionsMet) break;
            }

            // 3. If all conditions for a rule are met, prepare an alert
            if (allConditionsMet) {
                alertsToCreate.push({
                    ruleId: rule.ruleId,
                    severity: rule.severity,
                    alert_message: rule.alert_message,
                    triggeredByUserId: newVitalsData.recordedByUserId,
                    triggeredAt: admin.firestore.FieldValue.serverTimestamp(),
                    isAcknowledged: false,
                });
            }
        });

        // 4. Create all triggered alerts in a single batch write
        if (alertsToCreate.length > 0) {
            const batch = db.batch();
            const alertsRef = db.collection('patients').doc(patientId).collection('alerts');
            
            alertsToCreate.forEach(alertData => {
                const newAlertRef = alertsRef.doc();
                batch.set(newAlertRef, alertData);
            });
            
            await batch.commit();
            console.log(`Created ${alertsToCreate.length} alerts for patient ${patientId}.`);
            
            // 5. Send notifications (e.g., to the attending doctor)
            // await sendNotificationForAlerts(patientId, alertsToCreate);
        }

        return null;
    });
*/


// =======================================================================================
// 28. checkLabResults (CDS Firestore Trigger)
// =======================================================================================
/**
 * A CDS engine component that automatically evaluates lab results against predefined rules.
 *
 * @trigger_type Firestore Trigger (onUpdate)
 * @document /patients/{patientId}/lab_results/{testId}
 */
/*
exports.checkLabResults = functions.region('europe-west1').firestore
    .document('/patients/{patientId}/lab_results/{testId}')
    .onUpdate(async (change, context) => {
        const { patientId } = context.params;
        const newData = change.after.data();
        const oldData = change.before.data();

        // 1. Trigger condition: Only run if status changed to 'Completed'.
        if (newData.status !== 'Completed' || oldData.status === 'Completed') {
            return null;
        }

        // 2. Fetch all active clinical rules for lab results
        const rulesSnapshot = await db.collection('clinical_rules')
            .where('trigger_type', '==', 'lab_result')
            .where('isActive', '==', true)
            .get();

        if (rulesSnapshot.empty) {
            console.log('No active lab result rules to evaluate.');
            return null;
        }

        // ... Logic similar to checkVitalSigns:
        // 3. Loop through rules, evaluate conditions against lab result data (newData.result).
        // 4. If conditions are met, create alert documents in /patients/{patientId}/alerts.
        // 5. Send notifications to the ordering doctor (newData.orderedByDoctorId).

        console.log(`Evaluated lab results for patient ${patientId}.`);
        return null;
    });
*/


// =======================================================================================
// == IMMUNIZATION MODULE FUNCTIONS
// =======================================================================================

// =======================================================================================
// 29. Log Immunization (Callable Function)
// =======================================================================================
/**
 * Logs a new immunization record and calculates the next due date based on the vaccine's schedule.
 *
 * @trigger_type Callable Function (https)
 * @input { patientId: string, vaccineId: string, doseNumber: number, administeredAt: Timestamp }
 */
/*
exports.logImmunization = functions.region('europe-west1').https.onCall(async (data, context) => {
    // 1. Auth check
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }
    // Add role check for 'doctor' or 'nurse'

    const { patientId, vaccineId, doseNumber, administeredAt } = data;
    if (!patientId || !vaccineId || !doseNumber || !administeredAt) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required immunization data.');
    }

    const vaccineRef = db.collection('vaccine_catalog').doc(vaccineId);
    const newImmunizationRef = db.collection('patients').doc(patientId).collection('immunizations').doc();

    try {
        const vaccineDoc = await vaccineRef.get();
        if (!vaccineDoc.exists) {
            throw new Error('Vaccine not found in catalog.');
        }
        const vaccineData = vaccineDoc.data();
        const schedule = vaccineData.schedule;

        // 2. Calculate next due date
        let nextDueDate = null;
        const nextDoseInfo = schedule.find(dose => dose.dose === doseNumber + 1);
        if (nextDoseInfo) {
            const administeredDate = new Date(administeredAt._seconds * 1000);
            const dueDate = new Date(administeredDate);
            if(nextDoseInfo.intervalMonths) {
                dueDate.setMonth(dueDate.getMonth() + nextDoseInfo.intervalMonths);
            }
            if(nextDoseInfo.intervalYears) {
                dueDate.setFullYear(dueDate.getFullYear() + nextDoseInfo.intervalYears);
            }
            nextDueDate = admin.firestore.Timestamp.fromDate(dueDate);
        }

        // 3. Create the immunization record
        const immunizationData = {
            immunizationId: newImmunizationRef.id,
            vaccineName: vaccineData.name,
            doseNumber,
            administeredAt: admin.firestore.Timestamp.fromMillis(administeredAt._seconds * 1000),
            nextDueDate,
            administeredByUserId: context.auth.uid,
            notes: ''
        };

        await newImmunizationRef.set(immunizationData);
        
        console.log(`Immunization logged for patient ${patientId}. Next dose due: ${nextDueDate?.toDate()}`);
        return { success: true, immunizationId: newImmunizationRef.id };

    } catch (error) {
        console.error('Failed to log immunization:', error);
        throw new functions.https.HttpsError('internal', 'Could not save immunization record.', { message: error.message });
    }
});
*/

// =======================================================================================
// 30. Send Immunization Reminders (Scheduled Function)
// =======================================================================================
/**
 * A scheduled function that runs daily to send reminders for upcoming immunizations.
 *
 * @trigger_type Scheduled (cron job)
 * @schedule 'every day 08:00'
 */
/*
exports.sendImmunizationReminders = functions.region('europe-west1').pubsub
    .schedule('every day 08:00')
    .onRun(async (context) => {
        const today = new Date();
        const reminderStartDate = admin.firestore.Timestamp.fromDate(today);
        
        const reminderEndDate = new Date();
        reminderEndDate.setDate(today.getDate() + 7); // Remind for vaccines due in the next 7 days
        const reminderEndDateTimestamp = admin.firestore.Timestamp.fromDate(reminderEndDate);

        // 1. Query for all upcoming immunizations across all patients
        // This requires a composite index on `nextDueDate`.
        const snapshot = await db.collectionGroup('immunizations')
            .where('nextDueDate', '>=', reminderStartDate)
            .where('nextDueDate', '<=', reminderEndDateTimestamp)
            .get();
        
        if (snapshot.empty) {
            console.log('No upcoming immunization reminders to send.');
            return null;
        }

        const remindersToSend = [];
        snapshot.forEach(doc => {
            const immunization = doc.data();
            remindersToSend.push({
                patientId: doc.ref.parent.parent.id,
                vaccineName: immunization.vaccineName,
                nextDueDate: immunization.nextDueDate.toDate().toLocaleDateString('en-GB')
            });
        });

        // 2. Process each reminder
        for (const reminder of remindersToSend) {
            try {
                // Fetch patient's contact details
                const patientDoc = await db.collection('patients').doc(reminder.patientId).get();
                if (!patientDoc.exists) continue;

                const patientData = patientDoc.data();
                const contactInfo = patientData.contact.primaryPhone || patientData.contact.email;
                if (!contactInfo) continue;

                const message = `Reminder: The next dose of ${reminder.vaccineName} for ${patientData.full_name} is due on ${reminder.nextDueDate}. Please schedule an appointment.`;

                // 3. Send notification (e.g., via SMS, Email, or FCM)
                // await sendSms(contactInfo, message);
                console.log(`Sending reminder to ${contactInfo}: ${message}`);

            } catch (error) {
                console.error(`Failed to send reminder for patient ${reminder.patientId}:`, error);
            }
        }
        
        return null;
    });
*/


// =======================================================================================
// == OPERATING THEATRE (OT) MANAGEMENT
// =======================================================================================

// =======================================================================================
// 31. Book OT Session (Callable Function)
// =======================================================================================
/**
 * Books a new OT session after performing complex multi-resource availability checks.
 *
 * @trigger_type Callable Function (https)
 * @input { patientId, otRoomId, leadSurgeonId, teamIds, requiredEquipmentIds, startTime, endTime }
 */
/*
exports.bookOtSession = functions.region('europe-west1').https.onCall(async (data, context) => {
    // 1. Auth check: Ensure the user is an OT coordinator or lead surgeon.
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    // Add role check...

    const { patientId, otRoomId, leadSurgeonId, teamIds, requiredEquipmentIds, startTime, endTime } = data;
    const startTimestamp = admin.firestore.Timestamp.fromDate(new Date(startTime));
    const endTimestamp = admin.firestore.Timestamp.fromDate(new Date(endTime));
    
    const newOtSessionRef = db.collection('ot_sessions').doc();

    try {
        await db.runTransaction(async (transaction) => {
            // --- CONFLICT CHECKS ---
            
            // a) Check OT Room availability
            const otRoomConflictQuery = db.collection('ot_sessions')
                .where('otRoomId', '==', otRoomId)
                .where('startTime', '<', endTimestamp)
                .where('endTime', '>', startTimestamp);
            const otRoomConflictSnapshot = await transaction.get(otRoomConflictQuery);
            if (!otRoomConflictSnapshot.empty) {
                throw new Error(`Operating Theatre ${otRoomId} is already booked at this time.`);
            }

            // b) Check Surgical Team availability (lead surgeon + team)
            const allTeamIds = [leadSurgeonId, ...teamIds];
            for (const memberId of allTeamIds) {
                const teamConflictQuery = db.collection('ot_sessions')
                    .where('teamIds', 'array-contains', memberId)
                    .where('startTime', '<', endTimestamp)
                    .where('endTime', '>', startTimestamp);
                const teamConflictSnapshot = await transaction.get(teamConflictQuery);
                if (!teamConflictSnapshot.empty) {
                    // Fetch user's name for a more helpful error message
                    const userDoc = await transaction.get(db.collection('users').doc(memberId));
                    throw new Error(`Team member ${userDoc.data()?.name || memberId} is unavailable.`);
                }
            }
            
            // c) Check Equipment availability (simplified example)
            // A real implementation would be more complex.
            if (requiredEquipmentIds && requiredEquipmentIds.length > 0) {
                 const equipmentConflictQuery = db.collection('ot_sessions')
                    .where('requiredEquipmentIds', 'array-contains-any', requiredEquipmentIds)
                    .where('startTime', '<', endTimestamp)
                    .where('endTime', '>', startTimestamp);
                 const equipmentConflictSnapshot = await transaction.get(equipmentConflictQuery);
                 if(!equipmentConflictSnapshot.empty) {
                     throw new Error('One or more required pieces of equipment are unavailable.');
                 }
            }

            // d) CDS Check: Pre-operative checklist (conceptual)
            // const preOpChecklistRef = db.collection('patients').doc(patientId).collection('checklists').doc('pre_op');
            // const checklistDoc = await transaction.get(preOpChecklistRef);
            // if (!checklistDoc.exists || !checklistDoc.data().isComplete) {
            //     // This would return a soft error or warning to the UI, not throw an exception,
            //     // allowing the booking but flagging the issue.
            //     console.warn(`Patient ${patientId} is missing pre-operative clearance.`);
            // }

            // --- CREATE SESSION ---
            const sessionData = {
                ...data,
                sessionId: newOtSessionRef.id,
                status: 'Scheduled',
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            };
            transaction.set(newOtSessionRef, sessionData);
        });

        console.log(`OT Session ${newOtSessionRef.id} booked successfully.`);
        return { success: true, sessionId: newOtSessionRef.id };

    } catch (error) {
        console.error('Failed to book OT session:', error);
        throw new functions.https.HttpsError('aborted', 'Could not book OT session.', { message: error.message });
    }
});
*/

// =======================================================================================
// 32. Send OT Session Reminders (Scheduled Function)
// =======================================================================================
/**
 * A scheduled function that runs to send reminders for upcoming surgical procedures.
 *
 * @trigger_type Scheduled (cron job)
 * @schedule 'every 15 minutes' or similar frequent interval
 */
/*
exports.otSessionReminders = functions.region('europe-west1').pubsub
    .schedule('every 15 minutes')
    .onRun(async (context) => {
        const now = admin.firestore.Timestamp.now();
        const twentyFourHoursFromNow = admin.firestore.Timestamp.fromMillis(now.toMillis() + 24 * 60 * 60 * 1000);
        
        // 1. Query for sessions starting in the next 24 hours that haven't had a reminder sent.
        const snapshot = await db.collection('ot_sessions')
            .where('startTime', '>=', now)
            .where('startTime', '<=', twentyFourHoursFromNow)
            .where('status', '==', 'Scheduled')
            .where('isReminderSent', '==', false) // Use a flag to prevent duplicate reminders
            .get();

        if (snapshot.empty) {
            console.log('No OT session reminders to send.');
            return null;
        }

        for (const doc of snapshot.docs) {
            const session = doc.data();
            const allTeamIds = [session.leadSurgeonId, ...session.teamIds];

            // 2. Send notifications to all team members
            // await sendNotificationToUsers(allTeamIds, {
            //     title: 'Surgical Procedure Reminder',
            //     body: `Procedure "${session.procedureName}" is scheduled for ${session.startTime.toDate().toLocaleString()}.`
            // });

            // 3. Notify the patient's ward
            // const patientDoc = await db.collection('patients').doc(session.patientId).get();
            // if(patientDoc.data()?.is_admitted) {
            //     const wardId = patientDoc.data().current_ward_id;
            //     await sendNotificationToWard(wardId, `Prepare patient ${patientDoc.data().full_name} for surgery.`);
            // }

            // 4. Update the session document to prevent re-sending reminders
            await doc.ref.update({ isReminderSent: true });
            
            console.log(`Sent reminders for OT Session ${doc.id}`);
        }
        
        return null;
    });
*/

// =======================================================================================
// == RESOURCE SCHEDULING
// =======================================================================================

// =======================================================================================
// 33. Book Resource (Callable Function)
// =======================================================================================
/**
 * A central, generic function for booking any shared resource.
 *
 * @trigger_type Callable Function (https)
 * @input { resourceId: string, startTime: Timestamp, endTime: Timestamp, reason: string, relatedAppointmentId?: string }
 */
/*
exports.bookResource = functions.region('europe-west1').https.onCall(async (data, context) => {
    // 1. Auth check
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');

    const { resourceId, startTime, endTime, reason, relatedAppointmentId } = data;
    const startTimestamp = admin.firestore.Timestamp.fromDate(new Date(startTime));
    const endTimestamp = admin.firestore.Timestamp.fromDate(new Date(endTime));
    
    const resourceRef = db.collection('resources').doc(resourceId);
    const newBookingRef = db.collection('resource_bookings').doc();

    try {
        await db.runTransaction(async (transaction) => {
            // --- CONFLICT CHECKS ---
            
            // a) Check for existing bookings
            const conflictQuery = db.collection('resource_bookings')
                .where('resourceId', '==', resourceId)
                .where('startTime', '<', endTimestamp)
                .where('endTime', '>', startTimestamp)
                .where('status', '==', 'Confirmed');
            
            const conflictSnapshot = await transaction.get(conflictQuery);
            if (!conflictSnapshot.empty) {
                throw new Error(`Resource ${resourceId} is already booked at this time.`);
            }

            // b) Check if booking is within operating hours (simplified example)
            // const resourceDoc = await transaction.get(resourceRef);
            // if (!resourceDoc.exists || !resourceDoc.data().isBookable) {
            //     throw new Error(`Resource ${resourceId} is not bookable.`);
            // }
            // Add logic here to parse operatingHours and check if the booking falls within them.
            
            // --- CREATE BOOKING ---
            const bookingData = {
                bookingId: newBookingRef.id,
                resourceId,
                bookedByUserId: context.auth.uid,
                startTime: startTimestamp,
                endTime: endTimestamp,
                reason,
                relatedAppointmentId,
                status: 'Confirmed'
            };
            
            transaction.set(newBookingRef, bookingData);
        });

        console.log(`Resource ${resourceId} booked successfully with ID ${newBookingRef.id}.`);
        return { success: true, bookingId: newBookingRef.id };

    } catch (error) {
        console.error('Failed to book resource:', error);
        throw new functions.https.HttpsError('aborted', 'Could not book resource.', { message: error.message });
    }
});
*/

// =======================================================================================
// 34. Check Resource Availability (Callable Function)
// =======================================================================================
/**
 * Fetches all bookings for a specific resource within a given date range.
 *
 * @trigger_type Callable Function (https)
 * @input { resourceId: string, startDate: string, endDate: string }
 * @returns {Promise<object[]>} A promise that resolves to an array of booking objects.
 */
/*
exports.checkResourceAvailability = functions.region('europe-west1').https.onCall(async (data, context) => {
    // 1. Auth check
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');

    const { resourceId, startDate, endDate } = data;
    
    // 2. Query for bookings within the date range
    const bookingsQuery = db.collection('resource_bookings')
        .where('resourceId', '==', resourceId)
        .where('startTime', '>=', admin.firestore.Timestamp.fromDate(new Date(startDate)))
        .where('startTime', '<=', admin.firestore.Timestamp.fromDate(new Date(endDate)))
        .where('status', '==', 'Confirmed');
        
    const snapshot = await bookingsQuery.get();
    
    // 3. Return the array of booking documents
    const bookings = snapshot.docs.map(doc => doc.data());
    return { bookings };
});
*/
    



