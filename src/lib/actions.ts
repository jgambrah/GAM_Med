'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { PatientSchema, BedAllocationSchema, NewPrescriptionSchema, NewDiagnosisSchema, NewLabOrderSchema, FulfillLabRequestSchema, VitalsSchema, CarePlanSchema, LogImmunizationSchema, NewAppointmentSchema, NewWaitingListSchema, NewInvoiceSchema, LogPaymentSchema, NewLedgerEntrySchema, NewStaffClaimSchema, UpdateInventorySchema, ValidateLabResultSchema, NewRadOrderSchema, RadiologyReportSchema, LeaveRequestSchema, NewAssetSchema } from './schemas';
import { Appointment, LabResult, Patient } from './types';
import { allPatients, mockMedicationRecords } from './data';
import { sendWelcomeEmail } from './mail-service';

/**
 * Server Action to register a new patient.
 * Uses the composite ID pattern: {hospitalId}_MRN{mrn}
 */
export async function addPatient(values: z.infer<typeof PatientSchema>) {
  const customId = `${values.hospitalId}_MRN${values.mrn.trim().toUpperCase()}`;
  console.log(`Server Action: Registering new patient with custom ID ${customId} for hospital ${values.hospitalId}.`);

  await new Promise((resolve) => setTimeout(resolve, 1000));
  
  revalidatePath('/dashboard/patients');

  return { success: true, message: 'Patient registered successfully.' };
}

/**
 * Sends a welcome email to a newly invited staff member.
 * This is a server action to keep the Resend API key secure.
 */
export async function sendStaffInvitationEmail(data: {
    email: string;
    name: string;
    hospitalName: string;
    role: string;
}) {
    const tempPass = "WelcomeGamMed123!"; // Static for prototype, would be generated in prod
    return await sendWelcomeEmail(data.email, data.name, data.hospitalName, tempPass, data.role);
}

export async function dischargePatient(
    patientId: string, 
    admissionId: string,
    dischargeSummary: string,
    dischargeInstructions: string
) {
    console.log(`Server Action: Discharging patient ${patientId}.`);
    
    await new Promise((resolve) => setTimeout(resolve, 500));

    revalidatePath(`/dashboard/patients/${patientId}`);
    revalidatePath('/dashboard/patients');
    revalidatePath('/dashboard/beds');

    return { success: true, message: 'Patient discharged successfully.' };
}

export async function addClinicalNote(patientId: string, note: string) {
    console.log(`Server Action: Adding clinical note for patient ${patientId}.`);
    await new Promise((resolve) => setTimeout(resolve, 500));
    revalidatePath(`/dashboard/patients/${patientId}`);
    revalidatePath(`/dashboard/nursing`);
    return { success: true, message: 'Note added successfully.' };
}

export async function allocateBed(values: z.infer<typeof BedAllocationSchema>) {
    console.log(`Server Action: Admitting patient ${values.patientId} to bed ${values.bedId} in hospital ${values.hospitalId}.`);
    
    await new Promise((resolve) => setTimeout(resolve, 1000));

    revalidatePath('/dashboard/beds');
    revalidatePath('/dashboard/patients');
    revalidatePath(`/dashboard/patients/${values.patientId}`);
    revalidatePath('/dashboard/nursing');
    
    return { success: true, message: 'Bed allocated and patient admitted successfully.' };
}

export async function transferPatient(patientId: string, currentBedId: string, newBedId: string) {
    console.log(`Server Action: Transferring patient ${patientId} from bed ${currentBedId} to ${newBedId}.`);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    revalidatePath('/dashboard/beds');
    revalidatePath(`/dashboard/patients/${patientId}`);
    revalidatePath('/dashboard/nursing');

    return { success: true, message: 'Patient transferred successfully' };
}

export async function updateOutpatientStatus(appointmentId: string, newStatus: Appointment['status']) {
    console.log(`Server Action: Updating appointment ${appointmentId} to status: ${newStatus}.`);
    
    await new Promise((resolve) => setTimeout(resolve, 500));

    revalidatePath('/dashboard/admin');

    return { success: true, message: `Status updated to ${newStatus}` };
}

export async function addPrescription(patientId: string, values: z.infer<typeof NewPrescriptionSchema>) {
    console.log(`Server Action: Creating new prescription for patient ${patientId} in hospital ${values.hospitalId}.`);
    
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    revalidatePath(`/dashboard/patients/${patientId}`);
    
    return { success: true, message: 'Prescription added successfully.' };
}

export async function requestPrescriptionRefill(patientId: string, prescriptionId: string) {
    console.log(`Server Action: Processing refill request for patient ${patientId}.`);

    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    revalidatePath(`/dashboard/my-records`);
    revalidatePath(`/dashboard`);
    
    return { success: true, message: 'Refill request submitted successfully.' };
}


export async function addDiagnosis(patientId: string, values: z.infer<typeof NewDiagnosisSchema>) {
    console.log(`Server Action: Adding diagnosis for patient ${patientId} in hospital ${values.hospitalId}.`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    revalidatePath(`/dashboard/patients/${patientId}`);
    return { success: true, message: 'Diagnosis added successfully.' };
}

export async function orderLabTest(patientId: string, patientName: string, values: z.infer<typeof NewLabOrderSchema>) {
    console.log(`Server Action: Ordering lab test for patient ${patientId} (${patientName}) in hospital ${values.hospitalId}.`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    revalidatePath(`/dashboard/patients/${patientId}`);
    revalidatePath('/dashboard/lab');
    return { success: true, message: 'Lab test ordered successfully.' };
}

export async function orderImagingStudy(patientId: string, patientName: string, values: z.infer<typeof NewRadOrderSchema>) {
    console.log(`Server Action: Ordering imaging study for patient ${patientId} (${patientName}) in hospital ${values.hospitalId}.`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    revalidatePath(`/dashboard/patients/${patientId}`);
    revalidatePath('/dashboard/radiology');
    return { success: true, message: 'Imaging study ordered successfully.' };
}

export async function submitRadiologyReport(orderId: string, values: z.infer<typeof RadiologyReportSchema>) {
    console.log(`Server Action: Submitting radiology report for order ${orderId} in hospital ${values.hospitalId}.`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    revalidatePath('/dashboard/radiology');
    return { success: true, message: 'Radiology report submitted successfully.' };
}

export async function updateLabOrderStatus(testId: string, status: LabResult['status']) {
  console.log(`Server Action: Updating lab test ${testId} to status: ${status}.`);
  await new Promise((resolve) => setTimeout(resolve, 500));
  revalidatePath('/dashboard/lab');
  return { success: true, message: `Status updated to ${status}` };
}

export async function fulfillLabRequest(
    patientId: string, 
    testId: string,
    values: z.infer<typeof FulfillLabRequestSchema>
) {
    console.log(`Server Action: Fulfilling lab request ${testId} for patient ${patientId} in hospital ${values.hospitalId}.`);

    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    revalidatePath(`/dashboard/lab`);
    revalidatePath(`/dashboard/patients/${patientId}`);
    
    return { success: true, message: 'Lab request fulfilled successfully.' };
}

export async function validateLabResult(
    testId: string,
    values: z.infer<typeof ValidateLabResultSchema>
) {
    console.log(`Server Action: Validating lab result ${testId} in hospital ${values.hospitalId}.`);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    revalidatePath(`/dashboard/lab`);

    return { success: true, message: 'Lab result validated successfully.' };
}

export async function logVitals(patientId: string, values: z.infer<typeof VitalsSchema>): Promise<{
    success: boolean;
    alerts: { severity: 'Critical' | 'Warning' | 'Information', message: string }[];
    message?: string;
}> {
    console.log(`Server Action: Logging vitals for patient ${patientId} in hospital ${values.hospitalId}.`);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    revalidatePath(`/dashboard/nursing`);
    revalidatePath(`/dashboard/patients/${patientId}`);
    revalidatePath(`/dashboard/admin`);

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

    return { success: true, alerts: generatedAlerts };
}

export async function logMedicationAdministration(patientId: string, prescriptionId: string, notes: string) {
    console.log(`Server Action: Logging medication administration for patient ${patientId}.`);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    revalidatePath(`/dashboard/nursing`);
    revalidatePath(`/dashboard/patients/${patientId}`);

    return { success: true, message: 'Medication administration logged successfully.' };
}

export async function updateCarePlan(patientId: string, planId: string, values: z.infer<typeof CarePlanSchema>) {
    console.log(`Server Action: Updating care plan ${planId} for patient ${patientId} in hospital ${values.hospitalId}.`);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    revalidatePath(`/dashboard/nursing`);
    revalidatePath(`/dashboard/patients/${patientId}`);
    
    return { success: true, message: 'Care plan updated successfully.' };
}


export async function acknowledgeAlert(patientId: string, alertId: string) {
    console.log(`Server Action: Acknowledging alert ${alertId} for patient ${patientId}.`);
    await new Promise((resolve) => setTimeout(resolve, 500));
    revalidatePath(`/dashboard/patients/${patientId}`);
    revalidatePath(`/dashboard/admin`);
    return { success: true };
}

export async function logImmunization(patientId: string, values: z.infer<typeof LogImmunizationSchema>) {
    console.log(`Server Action: Logging immunization for patient ${patientId} in hospital ${values.hospitalId}.`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    revalidatePath(`/dashboard/patients/${patientId}`);
    return { success: true, message: 'Immunization logged successfully.' };
}

export async function bookAppointment(values: z.infer<typeof NewAppointmentSchema>) {
  console.log(`Server Action: Booking new appointment for hospital ${values.hospitalId}.`);
  if (values.isVirtual) {
      console.log('This is a virtual appointment. A telemedicine link would be generated and sent.');
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));

  revalidatePath('/dashboard/appointments');
  revalidatePath('/dashboard/my-practice');

  return { success: true, message: 'Appointment booked successfully.' };
}

export async function cancelAppointment(appointmentId: string) {
  console.log(`Server Action: Canceling appointment ${appointmentId}.`);

  await new Promise((resolve) => setTimeout(resolve, 500));

  revalidatePath('/dashboard/appointments');
  revalidatePath('/dashboard/my-practice');

  return { success: true, message: 'Appointment canceled successfully.' };
}

export async function submitLeaveRequest(values: z.infer<typeof LeaveRequestSchema>) {
    console.log(`Server Action: Submitting leave request for hospital ${values.hospitalId}.`);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    revalidatePath('/dashboard/my-leave');
    revalidatePath('/dashboard/approvals');
    revalidatePath('/dashboard/my-schedule');

    return { success: true, message: 'Leave request submitted successfully.' };
}

export async function addToWaitingList(values: z.infer<typeof NewWaitingListSchema>) {
    console.log(`Server Action: Adding to waiting list for hospital ${values.hospitalId}.`);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    revalidatePath('/dashboard/waiting-lists');
    
    return { success: true, message: 'Patient added to waiting list successfully.' };
}

export async function generateInvoice(patientId: string, values: z.infer<typeof NewInvoiceSchema>) {
    console.log(`Server Action: Generating invoice for patient ${patientId} in hospital ${values.hospitalId}.`);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    revalidatePath(`/dashboard/patients/${patientId}`);
    
    return { success: true, message: 'Invoice generated successfully.' };
}

export async function streamVitals(patientId: string) {
    console.log(`Server Action: Triggering vitals stream for patient ${patientId}`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    revalidatePath(`/dashboard/patients/${patientId}`);
    revalidatePath('/dashboard/nursing');
    return { success: true };
}

export async function logPayment(values: z.infer<typeof LogPaymentSchema>) {
    console.log(`Server Action: Logging payment for hospital ${values.hospitalId}.`);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    revalidatePath('/dashboard/admin');
    revalidatePath('/dashboard/patients');

    return { success: true, message: 'Payment logged successfully.' };
}

export async function submitStaffClaim(values: z.infer<typeof NewStaffClaimSchema>) {
    console.log(`Server Action: Submitting new staff claim for hospital ${values.hospitalId}.`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    revalidatePath('/dashboard/my-claims');
    
    return { success: true, message: 'Claim submitted for approval.' };
}

export async function approveStaffClaim(claimId: string) {
    console.log(`Server Action: Approving staff claim ${claimId}.`);
    await new Promise(resolve => setTimeout(resolve, 500));
    revalidatePath('/dashboard/approvals');
    revalidatePath('/dashboard/admin');
    return { success: true, message: 'Claim approved successfully.' };
}

export async function rejectStaffClaim(claimId: string, reason: string) {
    console.log(`Server Action: Rejecting staff claim ${claimId} for reason: ${reason}.`);
    await new Promise(resolve => setTimeout(resolve, 500));
    revalidatePath('/dashboard/approvals');
    revalidatePath('/dashboard/my-claims');
    return { success: true, message: 'Claim rejected successfully.' };
}

export async function updateInventory(values: z.infer<typeof UpdateInventorySchema>) {
    console.log(`Server Action: Updating inventory for item ${values.itemId} in hospital ${values.hospitalId}.`);

    await new Promise((resolve) => setTimeout(resolve, 500));

    revalidatePath('/dashboard/pharmacy/inventory');
    revalidatePath('/dashboard/pharmacy');

    return { success: true, message: 'Inventory updated successfully.' };
}

export async function checkPrescriptionSafety(
  patientId: string,
  medicationName: string
): Promise<{
  success: boolean;
  alerts: { type: 'Allergy' | 'Interaction'; severity: 'High' | 'Moderate' | 'Low'; message: string }[];
}> {
  console.log(`Server Action: Checking safety for patient ${patientId} and medication ${medicationName}.`);
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const alerts: { type: 'Allergy' | 'Interaction'; severity: 'High'; message: string }[] = [];
  const patient = allPatients.find(p => p.patient_id === patientId);

  if (patient?.allergies?.some(allergy => medicationName.toLowerCase().includes(allergy.toLowerCase()))) {
    alerts.push({
      type: 'Allergy',
      severity: 'High',
      message: `Patient has a known allergy to ${medicationName}.`,
    });
  }
  
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

export async function analyzeSample(testId: string): Promise<{ success: boolean, message?: string }> {
    console.log(`Server Action: Analyzing sample for lab test ${testId}.`);
    
    await new Promise((resolve) => setTimeout(resolve, 2000)); 

    revalidatePath('/dashboard/lab');

    return { success: true, message: 'Analysis complete.' };
}

export async function postToLedger(values: z.infer<typeof NewLedgerEntrySchema>) {
    console.log(`Server Action: Posting transaction to ledger for hospital ${values.hospitalId}.`);
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    revalidatePath('/dashboard/admin/reports');
    revalidatePath('/dashboard/admin/chart-of-accounts');
    
    return { success: true, message: 'Transaction posted to ledger.' };
}

/**
 * Updates the oxygen level for a specific tank.
 * If the level falls below 20%, it triggers a critical facility alert.
 */
export async function updateOxygenLevel(tankId: string, hospitalId: string, newLevel: number) {
    console.log(`Server Action: Updating oxygen level for tank ${tankId} to ${newLevel}%`);
    
    await new Promise(resolve => setTimeout(resolve, 500));

    revalidatePath('/dashboard/inventory/equipment');
    revalidatePath('/dashboard/nursing');

    const alerts = [];
    if (newLevel < 20) {
        alerts.push({
            severity: 'Critical' as const,
            message: `CRITICAL: Oxygen Tank ${tankId} is at ${newLevel}%. Refill required immediately.`,
            type: 'Resource' as const
        });
    }

    return { success: true, alerts };
}
