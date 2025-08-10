
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { PatientSchema, BedAllocationSchema, NewPrescriptionSchema, NewDiagnosisSchema, NewLabOrderSchema, NewVitalsSchema } from './schemas';
import { Appointment, Patient } from './types';
import { allPatients } from './data';

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
    return { success: true, message: 'Lab test ordered successfully.' };
}

export async function addVitals(patientId: string, values: z.infer<typeof NewVitalsSchema>) {
    console.log(`Adding vitals for patient ${patientId}:`, values);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    revalidatePath(`/dashboard/patients/${patientId}`);
    return { success: true, message: 'Vitals recorded successfully.' };
}
