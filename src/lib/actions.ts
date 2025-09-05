
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { PatientSchema, BedAllocationSchema, NewPrescriptionSchema, NewDiagnosisSchema, NewLabOrderSchema, FulfillLabRequestSchema, VitalsSchema, CarePlanSchema, LogImmunizationSchema, NewAppointmentSchema, NewWaitingListSchema, NewInvoiceSchema, LogPaymentSchema, NewLedgerEntrySchema, NewStaffClaimSchema, UpdateInventorySchema, ValidateLabResultSchema } from './schemas';
import { Appointment, LabResult, Patient } from './types';
import { allPatients, mockMedicationRecords } from './data';

/**
 * Server Action to register a new patient.
 * This function encapsulates the entire server-side logic for the registration process,
 * making it a secure and robust entry point for the client.
 */
export async function addPatient(values: z.infer<typeof PatientSchema>) {
  console.log('Registering new patient with values:', values);

  /**
   * == Production Implementation Workflow ==
   *
   * This server action demonstrates the secure, two-step process for patient registration
   * that would be used in a production environment. It orchestrates calls to the
   * backend Cloud Functions.
   *
   * CONCEPTUAL CODE:
   * try {
   *   // STEP 1: GENERATE A UNIQUE PATIENT ID
   *   // Call the `generatePatientId` Cloud Function. This function is the sole authority
   *   // for creating IDs, which prevents race conditions and ensures every patient ID
   *   // is unique and correctly formatted.
   *
   *   const generateId = httpsCallable(functions, 'generatePatientId');
   *   const idResult = await generateId();
   *   const newPatientId = idResult.data.patientId;
   *
   *   // STEP 2: SAVE THE PATIENT RECORD
   *   // With the guaranteed unique ID, call the `handlePatientRegistration` Cloud Function
   *   // to perform the final validation and atomic write to the database.
   *
   *   const registerPatient = httpsCallable(functions, 'handlePatientRegistration');
   *   await registerPatient({ patientData: values, patientId: newPatientId });
   *
   *   // STEP 3: RETURN SUCCESS
   *   // Revalidate the path to update the UI and return a success message.
   *   revalidatePath('/dashboard/patients');
   *   return { success: true, message: `Patient registered successfully with ID: ${newPatientId}` };
   *
   * } catch (error) {
   *   // Handle any errors from the Cloud Functions
   *   console.error("Patient registration failed:", error);
   *   return { success: false, message: error.message };
   * }
   */

  // For this prototype, we'll just log it and simulate a delay.
  await new Promise((resolve) => setTimeout(resolve, 1000));
  
  // Revalidate the patients page to show the new patient.
  revalidatePath('/dashboard/patients');

  return { success: true, message: 'Patient registered successfully.' };
}

// In a real app, this would call handlePatientDischarge.
export async function dischargePatient(
    patientId: string, 
    admissionId: string,
    dischargeSummary: string,
    dischargeInstructions: string
) {
    console.log(`Discharging patient: ${patientId} from admission ${admissionId}`);
    console.log('Summary:', dischargeSummary);
    console.log('Instructions:', dischargeInstructions);
    
    // Here you would call your `handlePatientDischarge` Cloud Function
    // The call would look like this:
    // await handlePatientDischarge({ patientId, admissionId, dischargeSummary, dischargeInstructions });
    
    await new Promise((resolve) => setTimeout(resolve, 500));

    revalidatePath(`/dashboard/patients/${patientId}`);
    revalidatePath('/dashboard/patients');
    revalidatePath('/dashboard/beds');

    return { success: true, message: 'Patient discharged successfully.' };
}

export async function addClinicalNote(patientId: string, note: string) {
    console.log(`Adding clinical note for patient ${patientId}: ${note}`);
    // Here you would save the note to the patient's EHR sub-collection in Firestore.
    await new Promise((resolve) => setTimeout(resolve, 500));
    revalidatePath(`/dashboard/patients/${patientId}`);
    revalidatePath(`/dashboard/nursing`);
    return { success: true, message: 'Note added successfully.' };
}

// Placeholder for allocating a bed and admitting a patient. In a real app, this would call handlePatientAdmission.
export async function allocateBed(values: z.infer<typeof BedAllocationSchema>) {
    console.log('Allocating bed and admitting patient:', values);
    
    // In a real app, you would call your `handlePatientAdmission` Cloud Function with these details.
    // const result = await handlePatientAdmission({ ... });
    
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Revalidate all relevant paths to update the UI
    revalidatePath('/dashboard/beds');
    revalidatePath('/dashboard/patients');
    revalidatePath(`/dashboard/patients/${values.patientId}`);
    revalidatePath('/dashboard/nursing');
    
    return { success: true, message: 'Bed allocated and patient admitted successfully.' };
}

export async function transferPatient(patientId: string, currentBedId: string, newBedId: string) {
    console.log(`Transferring patient ${patientId} from bed ${currentBedId} to ${newBedId}`);

    // Here you would implement an atomic transaction, likely in a Cloud Function:
    // 1. Get patient's current admission record.
    // 2. Update admission record's `bed_id` to `newBedId`.
    // 3. Update old bed's status to 'vacant', clear patient info.
    // 4. Update new bed's status to 'occupied', set patient info.

    await new Promise((resolve) => setTimeout(resolve, 1000));

    revalidatePath('/dashboard/beds');
    revalidatePath(`/dashboard/patients/${patientId}`);
    revalidatePath('/dashboard/nursing');

    return { success: true, message: 'Patient transferred successfully' };
}

export async function updateOutpatientStatus(appointmentId: string, newStatus: Appointment['status']) {
    console.log(`Updating appointment ${appointmentId} to status: ${newStatus}`);
    
    // This server action would call the `updateOutpatientStatus` Cloud Function.
    // In this prototype, we'll just simulate the action.
    await new Promise((resolve) => setTimeout(resolve, 500));

    revalidatePath('/dashboard/admin');

    return { success: true, message: `Status updated to ${newStatus}` };
}

/**
 * Server Action to search for patients.
 * This function acts as a bridge to the backend search logic.
 */
export async function searchPatientsAction(query: string): Promise<{
    success: boolean;
    data?: Patient[];
    message?: string;
  }> {
    console.log(`Searching for patients with query: "${query}"`);
  
    /**
     * == Production Implementation Workflow ==
     *
     * In a production environment, this server action would securely call the
     * `searchPatients` Cloud Function, which in turn queries a dedicated
     * search index like Algolia or Elasticsearch.
     *
     * CONCEPTUAL CODE:
     * try {
     *   const search = httpsCallable(functions, 'searchPatients');
     *   const result = await search({ query });
     *   return { success: true, data: result.data as Patient[] };
     * } catch (error) {
     *   console.error("Patient search failed:", error);
     *   return { success: false, message: error.message };
     * }
     */
  
    // For this prototype, we'll simulate a server-side search on the mock data.
    if (!query) {
      return { success: true, data: allPatients };
    }
  
    await new Promise((resolve) => setTimeout(resolve, 300)); // Simulate network latency
  
    const lowercasedQuery = query.toLowerCase();
    const filtered = allPatients.filter(
      (patient) =>
        patient.full_name.toLowerCase().includes(lowercasedQuery) ||
        patient.patient_id.toLowerCase().includes(lowercasedQuery) ||
        patient.contact.primaryPhone.includes(lowercasedQuery)
    );
  
    return { success: true, data: filtered };
}

export async function addPrescription(patientId: string, values: z.infer<typeof NewPrescriptionSchema>) {
    console.log(`Adding prescription for patient ${patientId}:`, values);
    
    // This server action would call a Cloud Function `onNewMedicationPrescribed`
    // which would create a document in the `/patients/{patientId}/medication_history` sub-collection.
    
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    revalidatePath(`/dashboard/patients/${patientId}`);
    
    return { success: true, message: 'Prescription added successfully.' };
}

export async function addDiagnosis(patientId: string, values: z.infer<typeof NewDiagnosisSchema>) {
    console.log(`Adding diagnosis for patient ${patientId}:`, values);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    revalidatePath(`/dashboard/patients/${patientId}`);
    return { success: true, message: 'Diagnosis added successfully.' };
}

export async function orderLabTest(patientId: string, values: z.infer<typeof NewLabOrderSchema>) {
    console.log(`Ordering lab test for patient ${patientId}:`, values);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    revalidatePath(`/dashboard/patients/${patientId}`);
    revalidatePath('/dashboard/lab');
    return { success: true, message: 'Lab test ordered successfully.' };
}

export async function updateLabOrderStatus(testId: string, status: LabResult['status']) {
  console.log(`Updating lab test ${testId} to status: ${status}`);
  // In a real app, this would call the `updateLabOrder` Cloud Function.
  await new Promise((resolve) => setTimeout(resolve, 500));
  revalidatePath('/dashboard/lab');
  return { success: true, message: `Status updated to ${status}` };
}

export async function fulfillLabRequest(
    patientId: string, 
    testId: string,
    values: z.infer<typeof FulfillLabRequestSchema>
) {
    console.log(`Fulfilling lab request ${testId} for patient ${patientId}:`, values);

    // This server action would update the lab result document in Firestore.
    // It would set the status to 'Completed', add the result, and set the completedAt timestamp.
    // This update would then trigger the `onLabResultCompleted` Cloud Function to notify the doctor.

    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    revalidatePath(`/dashboard/lab`);
    revalidatePath(`/dashboard/patients/${patientId}`);
    
    return { success: true, message: 'Lab request fulfilled successfully.' };
}

export async function validateLabResult(
    testId: string,
    values: z.infer<typeof ValidateLabResultSchema>
) {
    console.log(`Validating lab result ${testId} with notes:`, values.validationNotes);

    // This server action would call a Cloud Function to update the lab result document.
    // It would set the status to 'Validated' (or 'Final') and add the validation notes.

    await new Promise((resolve) => setTimeout(resolve, 1000));

    revalidatePath(`/dashboard/lab`);

    return { success: true, message: 'Lab result validated successfully.' };
}

export async function logVitals(patientId: string, values: z.infer<typeof VitalsSchema>): Promise<{
    success: boolean;
    alerts: { severity: 'Critical' | 'Warning' | 'Information', message: string }[];
    message?: string;
}> {
    console.log(`Logging vitals for patient ${patientId}:`, values);
    // In a real app, this would call the `logVitals` Cloud Function.
    // The Cloud Function would then run the `checkVitalSigns` trigger.
    await new Promise((resolve) => setTimeout(resolve, 1000));

    revalidatePath(`/dashboard/nursing`);
    revalidatePath(`/dashboard/patients/${patientId}`);
    revalidatePath(`/dashboard/admin`);

    // ** SIMULATED CDS ENGINE **
    // In a real application, this logic would live in a Firestore Trigger (`checkVitalSigns`).
    // For this prototype, we simulate it here to provide immediate feedback to the UI.
    const generatedAlerts: { severity: 'Critical' | 'Warning' | 'Information', message: string }[] = [];
    
    const [systolic, diastolic] = values.bloodPressure.split('/').map(Number);
    if (systolic > 180 || diastolic > 110) {
        generatedAlerts.push({
            severity: 'Critical',
            message: `Patient's blood pressure is critically high (${values.bloodPressure}). Immediate intervention required.`,
        });
    }

    const temperature = parseFloat(values.temperature);
    if (temperature > 38.5) {
        generatedAlerts.push({
            severity: 'Warning',
            message: `Patient has a high fever (${values.temperature}°C). Monitor and consider antipyretics.`,
        });
    }

    // This return value now includes potential alerts for the UI to display.
    return { success: true, alerts: generatedAlerts };
}

export async function logMedicationAdministration(patientId: string, prescriptionId: string, notes: string) {
    console.log(`Logging medication administration for patient ${patientId}, prescription ${prescriptionId}: ${notes}`);
    // In a real app, this would call the `logMedicationAdministration` Cloud Function,
    // which would create a new document in a sub-collection like `medication_administration_logs`.
    await new Promise((resolve) => setTimeout(resolve, 1000));

    revalidatePath(`/dashboard/nursing`);
    revalidatePath(`/dashboard/patients/${patientId}`);

    return { success: true, message: 'Medication administration logged successfully.' };
}

export async function updateCarePlan(patientId: string, planId: string, values: z.infer<typeof CarePlanSchema>) {
    console.log(`Updating care plan ${planId} for patient ${patientId}:`, values);
    // In a real app, this would call the `updateCarePlan` Cloud Function.
    await new Promise((resolve) => setTimeout(resolve, 1000));

    revalidatePath(`/dashboard/nursing`);
    revalidatePath(`/dashboard/patients/${patientId}`);
    
    return { success: true, message: 'Care plan updated successfully.' };
}


export async function acknowledgeAlert(patientId: string, alertId: string) {
    console.log(`Acknowledging alert ${alertId} for patient ${patientId}.`);
    // This would call a Cloud Function to update the alert document's `isAcknowledged` field to true.
    await new Promise((resolve) => setTimeout(resolve, 500));
    revalidatePath(`/dashboard/patients/${patientId}`);
    revalidatePath(`/dashboard/admin`);
    return { success: true };
}

export async function logImmunization(patientId: string, values: z.infer<typeof LogImmunizationSchema>) {
    console.log(`Logging immunization for patient ${patientId}:`, values);
    // In a real app, this would call the `logImmunization` Cloud Function.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    revalidatePath(`/dashboard/patients/${patientId}`);
    return { success: true, message: 'Immunization logged successfully.' };
}

export async function bookAppointment(values: z.infer<typeof NewAppointmentSchema>) {
  console.log('Booking new appointment with values:', values);
  // In a real app, this would call the `bookAppointment` Cloud Function.
  // That function would handle all the complex availability and conflict checks.
  await new Promise((resolve) => setTimeout(resolve, 1000));

  revalidatePath('/dashboard/appointments');
  revalidatePath('/dashboard/my-practice');

  return { success: true, message: 'Appointment booked successfully.' };
}

export async function addToWaitingList(values: z.infer<typeof NewWaitingListSchema>) {
    console.log('Adding to waiting list with values:', values);
    // This would call the `addToWaitingList` Cloud Function.
    await new Promise((resolve) => setTimeout(resolve, 1000));

    revalidatePath('/dashboard/waiting-lists');
    
    return { success: true, message: 'Patient added to waiting list successfully.' };
}

export async function generateInvoice(patientId: string, values: z.infer<typeof NewInvoiceSchema>) {
    console.log(`Generating invoice for patient ${patientId} with items:`, values);
    // In a real app, this would call the `generateInvoice` Cloud Function.
    await new Promise((resolve) => setTimeout(resolve, 1000));

    revalidatePath(`/dashboard/patients/${patientId}`);
    
    return { success: true, message: 'Invoice generated successfully.' };
}

/**
 * Server Action to trigger the vitals simulation Cloud Function.
 */
export async function streamVitals(patientId: string) {
    console.log(`Server Action: Triggering vitals stream for patient ${patientId}`);
    // In a real app, this would invoke the `streamMockVitals` Cloud Function.
    // For this prototype, we'll just simulate a delay.
    await new Promise(resolve => setTimeout(resolve, 2000));
    revalidatePath(`/dashboard/patients/${patientId}`);
    revalidatePath('/dashboard/nursing');
    return { success: true };
}

export async function logPayment(values: z.infer<typeof LogPaymentSchema>) {
    console.log('Logging payment with values:', values);
    // In a real app, this would call the processPayment Cloud Function.
    await new Promise((resolve) => setTimeout(resolve, 1000));

    revalidatePath('/dashboard/admin');
    revalidatePath('/dashboard/patients');

    return { success: true, message: 'Payment logged successfully.' };
}

export async function postToLedger(values: z.infer<typeof NewLedgerEntrySchema>) {
    console.log('Posting to ledger:', values);
    // In a real app, this would create two new LedgerEntry documents in Firestore,
    // one for the debit and one for the credit, and update the balances on the
    // corresponding LedgerAccount documents within a transaction.
    await new Promise((resolve) => setTimeout(resolve, 1000));

    revalidatePath('/dashboard/admin/chart-of-accounts');
    
    return { success: true, message: 'Transaction posted to ledger successfully.' };
}

export async function submitStaffClaim(values: z.infer<typeof NewStaffClaimSchema>) {
    console.log('Submitting new staff claim:', values);
    // In a real app, this would create a new StaffExpenseClaim document with 'Pending HOD' status
    // and trigger a notification to the user's HOD.
    if (values.attachment) {
        // Concept: Handle file upload to Firebase Storage here.
        // const storageRef = ref(storage, `claims/${values.attachment.name}`);
        // await uploadBytes(storageRef, values.attachment);
        // const downloadURL = await getDownloadURL(storageRef);
        // Save downloadURL with the claim data.
        console.log('Attachment received:', values.attachment.name);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    revalidatePath('/dashboard/my-claims');
    
    return { success: true, message: 'Claim submitted for approval.' };
}

export async function approveStaffClaim(claimId: string) {
    console.log(`Approving staff claim: ${claimId}`);
    // In a real app, this would update the claim document's status to 'Approved'
    // and trigger a notification to the Accounts Payable team.
    await new Promise(resolve => setTimeout(resolve, 500));
    revalidatePath('/dashboard/approvals');
    revalidatePath('/dashboard/admin');
    return { success: true, message: 'Claim approved successfully.' };
}

export async function rejectStaffClaim(claimId: string) {
    console.log(`Rejecting staff claim: ${claimId}`);
    // In a real app, this would update the claim document's status to 'Rejected'
    // and trigger a notification back to the submitting staff member.
    await new Promise(resolve => setTimeout(resolve, 500));
    revalidatePath('/dashboard/approvals');
    revalidatePath('/dashboard/my-claims');
    return { success: true, message: 'Claim rejected successfully.' };
}

export async function updateInventory(values: z.infer<typeof UpdateInventorySchema>) {
    console.log('Updating inventory with values:', values);
    // This server action would call the `updateInventory` Cloud Function,
    // which would perform an atomic write to the inventory item and create a transaction log.
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Revalidate paths to reflect inventory changes
    revalidatePath('/dashboard/pharmacy/inventory');
    revalidatePath('/dashboard/pharmacy');

    return { success: true, message: 'Inventory updated successfully.' };
}

// Simulates the `checkDrugAndAllergyAlerts` Cloud Function
export async function checkPrescriptionSafety(
  patientId: string,
  medicationName: string
): Promise<{
  success: boolean;
  alerts: { type: 'Allergy' | 'Interaction'; severity: 'High' | 'Moderate' | 'Low'; message: string }[];
}> {
  console.log(`Checking safety for patient ${patientId} and medication ${medicationName}`);
  await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate network delay

  const alerts: { type: 'Allergy' | 'Interaction'; severity: 'High'; message: string }[] = [];
  const patient = allPatients.find(p => p.patient_id === patientId);

  // 1. Allergy Check
  if (patient?.allergies?.some(allergy => medicationName.toLowerCase().includes(allergy.toLowerCase()))) {
    alerts.push({
      type: 'Allergy',
      severity: 'High',
      message: `Patient has a known allergy to ${medicationName}.`,
    });
  }
  
  // 2. Interaction Check (simplified)
  // Check if patient is already on Aspirin and is now being prescribed Warfarin
  const activeMedications = mockMedicationRecords.filter(m => m.patientId === patientId && m.status === 'Active');
  if (medicationName.toLowerCase().includes('aspirin')) {
     if (activeMedications.some(m => m.medicationName.toLowerCase().includes('atorvastatin'))) {
         alerts.push({
            type: 'Interaction',
            severity: 'High',
            message: 'Aspirin may interact with the patient\'s existing Atorvastatin prescription.',
        });
     }
  }

  return { success: true, alerts };
}

/**
 * Server Action to simulate a lab machine analyzing a sample.
 */
export async function analyzeSample(testId: string) {
    console.log(`Analyzing sample for lab test ${testId}...`);

    // In a real application, this would not be needed. The equipment would send data to a webhook,
    // triggering the `processEquipmentData` Cloud Function.
    // Here, we simulate that process.
    
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate analysis time

    // This would then trigger the processEquipmentData function.
    // For the prototype, we'll just update the status to 'Draft' to move it to the next queue.
    revalidatePath('/dashboard/lab');

    return { success: true };
}
