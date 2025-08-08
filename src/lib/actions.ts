
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { PatientSchema, BedAllocationSchema } from './schemas';

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
   * that would be used in a production environment.
   *
   * STEP 1: GENERATE A UNIQUE PATIENT ID
   * The first step is to call the `generatePatientId` Cloud Function. This function is the
   * sole authority for creating IDs, which prevents race conditions and ensures every
   * patient ID is unique and correctly formatted.
   *
   * Example:
   * `const idResult = await callCloudFunction('generatePatientId');`
   * `const newPatientId = idResult.data.patientId;`
   *
   * STEP 2: SAVE THE PATIENT RECORD
   * Once the unique ID is obtained, we combine it with the validated form `values` and
   * other server-generated data (like timestamps) to create the final patient document.
   * This document is then saved to Firestore, using the `newPatientId` as the document ID.
   * This could be done here or in a separate `handlePatientRegistration` function.
   *
   * Example:
   * `const patientData = { ...values, patient_id: newPatientId, ... };`
   * `await db.collection('patients').doc(newPatientId).set(patientData);`
   *
   */

  // For this prototype, we'll just log it and simulate a delay.
  await new Promise((resolve) => setTimeout(resolve, 1000));
  
  // Revalidate the patients page to show the new patient.
  revalidatePath('/dashboard/patients');

  return { success: true, message: 'Patient registered successfully.' };
}

// Placeholder for discharging a patient. In a real app, this would call handlePatientDischarge.
export async function dischargePatient(patientId: string, admissionId: string) {
    console.log(`Discharging patient: ${patientId} from admission ${admissionId}`);
    // Here you would call your `handlePatientDischarge` Cloud Function
    // For now, we simulate success and revalidate the path
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
