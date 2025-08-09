
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
// 5. Update Outpatient Status (Callable Function)
// =======================================================================================
/**
 * Handles status updates for an outpatient visit (e.g., check-in, consultation complete).
 * This is a simpler, non-transactional update.
 *
 * @trigger_type Callable Function (https)
 * @input { patientId: string, admissionId: string, newStatus: string }
 */
/*
exports.updateOutpatientStatus = functions.region('europe-west1').https.onCall(async (data, context) => {
    // 1. Authentication & Authorization Check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }
    // Add role check here.

    const { patientId, admissionId, newStatus } = data;
    if (!patientId || !admissionId || !newStatus) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required details.');
    }
    
    const validStatuses = ['In Progress', 'Completed', 'Canceled'];
    if (!validStatuses.includes(newStatus)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid status provided.');
    }

    const admissionRef = db.collection('patients').doc(patientId).collection('admissions').doc(admissionId);
    
    try {
        await admissionRef.update({ 
            status: newStatus,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });

        // If the visit is complete, update the last visit date on the main patient record.
        if (newStatus === 'Completed') {
            const patientRef = db.collection('patients').doc(patientId);
            await patientRef.update({
                lastVisitDate: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        
        return { success: true };

    } catch (error) {
        console.error('Failed to update outpatient status:', error);
        throw new functions.https.HttpsError('internal', 'Could not update outpatient status.');
    }
});
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
