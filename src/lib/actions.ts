'use server';

import {generateSmsReminder} from '@/ai/flows/generateSmsReminder';
import type {Admission, Appointment, Bed, Patient, User, DischargeSummary} from './types';
import {allAdmissions, allBeds, allPatients, allAppointments, allUsers} from './data';
import {z} from 'zod';

const patientFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  dateOfBirth: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: 'Invalid date format.',
  }),
  gender: z.enum(['Male', 'Female', 'Other']),
  phone: z.string().min(10, 'Phone number is too short.'),
  email: z.string().email('Invalid email address.').optional().or(z.literal('')),
  address: z.string().min(5, 'Address is too short.'),
  emergencyContactName: z.string().min(2, 'Contact name is too short.'),
  emergencyContactPhone: z.string().min(10, 'Contact phone is too short.'),
  emergencyContactRelationship: z.string().min(2, 'Relationship is too short.'),
  bloodGroup: z.string().min(1, 'Blood group is required.'),
  allergies: z.string().optional(),
  admissionStatus: z.enum(['Inpatient', 'Outpatient']),
  bed: z.string().optional(),
});

const admissionFormSchema = z.object({
  patientId: z.string(),
  reasonForAdmission: z.string().min(3, 'Reason is too short.'),
  ward: z.string().min(3, 'Ward is required.'),
  bedId: z.string().min(1, 'Bed selection is required.'),
  attendingDoctorId: z.string().min(1, 'Doctor selection is required.'),
});

const updateOutpatientStatusSchema = z.object({
    appointmentId: z.string(),
    newStatus: z.enum(['Scheduled', 'In Progress', 'Completed', 'Cancelled']),
});

const dischargeSummarySchema = z.object({
    diagnosisOnDischarge: z.string().min(3, "Diagnosis is required."),
    treatmentProvided: z.string().min(10, "Treatment summary is required."),
    conditionAtDischarge: z.string().min(3, "Condition is required."),
    medicationAtDischarge: z.array(z.object({
        name: z.string(),
        dosage: z.string(),
        instructions: z.string(),
    })),
    followUpInstructions: z.string().min(10, "Follow-up instructions are required."),
});


export async function getSmsReminderAction(
  role: User['role'],
  userName: string,
  appointments: Appointment[]
) {
  try {
    const sms = await generateSmsReminder({
      role,
      userName,
      appointments: appointments.map(a => ({
        id: a.id,
        patientName: a.patientName,
        doctorName: a.doctorName,
        date: a.date,
        time: a.time,
        reason: a.reason,
        status: a.status,
      })),
    });
    return {success: true, message: sms};
  } catch (error) {
    console.error('Error running generateSmsReminder flow:', error);
    return {
      success: false,
      message: 'Failed to generate reminder. Please try again later.',
    };
  }
}

async function generatePatientId(): Promise<string> {
  const today = new Date();
  const datePrefix = today.toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD
  const prefix = `P-${datePrefix}`;
  const patientsToday = allPatients.filter(p => p.patientId.startsWith(prefix));
  let highestId = 0;
  if (patientsToday.length > 0) {
    const lastPatientId = patientsToday
      .sort((a, b) => a.patientId.localeCompare(b.patientId))
      .pop()!.patientId;
    highestId = parseInt(lastPatientId.split('-')[2], 10);
  }
  const nextId = (highestId + 1).toString().padStart(4, '0');
  return `${prefix}-${nextId}`;
}

export async function registerPatientAction(
  values: z.infer<typeof patientFormSchema>
) {
  const newPatientId = await generatePatientId();
  const [firstName, ...lastNameParts] = values.name.split(' ');
  const lastName = lastNameParts.join(' ');
  const newPatient: Patient = {
    patientId: newPatientId,
    firstName: firstName,
    lastName: lastName,
    fullName: values.name,
    dob: new Date(values.dateOfBirth),
    gender: values.gender as 'Male' | 'Female' | 'Other',
    contact: {primaryPhone: values.phone, email: values.email},
    address: {
      street: values.address,
      city: 'Accra',
      region: 'Greater Accra',
      country: 'Ghana',
    },
    emergencyContact: {
      name: values.emergencyContactName,
      relationship: values.emergencyContactRelationship,
      phone: values.emergencyContactPhone,
    },
    isAdmitted: values.admissionStatus === 'Inpatient',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  console.log(
    '[Simulated] Registering new patient with server action:',
    newPatient
  );
  allPatients.push(newPatient);
  console.log(
    `[Simulated] Firebase Auth user creation logic would go here for ${newPatient.patientId}.`
  );

  return {
    success: true,
    message: `${newPatient.fullName} has been registered with ID ${newPatient.patientId}.`,
    patientId: newPatient.patientId,
  };
}

async function generateAdmissionId(): Promise<string> {
  const prefix = 'ADM';
  const nextId = (allAdmissions.length + 1).toString().padStart(4, '0');
  return `${prefix}-${nextId}`;
}

export async function admitPatientAction(
  values: z.infer<typeof admissionFormSchema>
) {
  console.log('[Simulated] Running admitPatientAction for:', values);
  try {
    const {patientId, ward, bedId, reasonForAdmission, attendingDoctorId} =
      values;
    const patientIndex = allPatients.findIndex(p => p.patientId === patientId);
    if (patientIndex === -1) throw new Error('Patient not found.');

    const bedIndex = allBeds.findIndex(b => b.bedId === bedId);
    if (bedIndex === -1) throw new Error('Bed not found.');
    if (allBeds[bedIndex].status !== 'vacant')
      throw new Error('Selected bed is not vacant.');

    const newAdmissionId = await generateAdmissionId();
    const newAdmission: Admission = {
      admissionId: newAdmissionId,
      patientId,
      type: 'Inpatient',
      admissionDate: new Date(),
      reasonForVisit: reasonForAdmission,
      ward,
      bedId,
      attendingDoctorId,
      status: 'Admitted',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    allAdmissions.push(newAdmission);

    allPatients[patientIndex].isAdmitted = true;
    allPatients[patientIndex].currentAdmissionId = newAdmissionId;
    allPatients[patientIndex].updatedAt = new Date();

    allBeds[bedIndex].status = 'occupied';
    allBeds[bedIndex].currentPatientId = patientId;
    allBeds[bedIndex].occupiedSince = new Date();

    return {
      success: true,
      message: `Patient admitted successfully with Admission ID: ${newAdmissionId}`,
      admissionId: newAdmissionId,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'An unexpected error occurred during admission.',
    };
  }
}

/**
 * Doctor-facing action to finalize the clinical summary.
 * This sets the status to 'Pending Discharge', signaling to other departments.
 */
export async function finalizeDischargeSummaryAction(
  admissionId: string,
  dischargeSummary: DischargeSummary,
  dischargeByDoctorId: string
) {
  console.log(`[Simulated] Finalizing discharge summary for admission ${admissionId}`);
  try {
    const admissionIndex = allAdmissions.findIndex(a => a.admissionId === admissionId);
    if (admissionIndex === -1) throw new Error('Admission record not found.');

    // In a real app, this would be a single atomic transaction.
    allAdmissions[admissionIndex].status = 'Pending Discharge';
    allAdmissions[admissionIndex].dischargeSummary = dischargeSummary;
    allAdmissions[admissionIndex].dischargeByDoctorId = dischargeByDoctorId;
    allAdmissions[admissionIndex].isSummaryFinalized = true; // Set the flag here
    allAdmissions[admissionIndex].updatedAt = new Date();
    
    console.log('[Simulated] Updated admission record:', allAdmissions[admissionIndex]);
    
    // Simulate notifying billing department
    console.log(`[Simulated] Notifying billing department for admission ${admissionId}.`);

    return {
      success: true,
      message: 'Discharge summary finalized. Patient is pending financial clearance.',
    };
  } catch (error: any) {
    console.error('Error in finalizeDischargeSummaryAction:', error);
    return {
      success: false,
      message: error.message || 'An unexpected error occurred.',
    };
  }
}


/**
 * Admin-facing action to complete the discharge process after clinical
 * and financial clearance.
 */
export async function dischargePatientAction(
  patientId: string,
  admissionId: string
) {
  console.log(
    `[Simulated] Running dischargePatientAction for patient ${patientId} and admission ${admissionId}`
  );

  try {
    const patientIndex = allPatients.findIndex(p => p.patientId === patientId);
    if (patientIndex === -1) throw new Error('Patient not found.');

    const admissionIndex = allAdmissions.findIndex(
      a => a.admissionId === admissionId
    );
    if (admissionIndex === -1) throw new Error('Admission record not found.');
    // This is the key check for the two-step workflow.
    if (!allAdmissions[admissionIndex].isSummaryFinalized || allAdmissions[admissionIndex].status !== 'Pending Discharge') {
        throw new Error('Discharge summary must be finalized before discharging.');
    }

    const {bedId} = allAdmissions[admissionIndex];
    if (!bedId) throw new Error('No bed assigned to this admission.');

    const bedIndex = allBeds.findIndex(b => b.bedId === bedId);
    if (bedIndex === -1) throw new Error('Assigned bed not found.');

    // Update patient
    allPatients[patientIndex].isAdmitted = false;
    allPatients[patientIndex].currentAdmissionId = undefined;
    allPatients[patientIndex].updatedAt = new Date();
    allPatients[patientIndex].lastVisitDate = new Date();

    // Update admission record
    allAdmissions[admissionIndex].status = 'Discharged';
    allAdmissions[admissionIndex].dischargeDate = new Date();
    
    // Update bed status
    allBeds[bedIndex].status = 'cleaning';
    allBeds[bedIndex].currentPatientId = undefined;
    allBeds[bedIndex].occupiedSince = undefined;

    console.log(
      `[Simulated] Triggering final bill generation for admission ${admissionId}.`
    );

    return {
      success: true,
      message: `Patient ${allPatients[patientIndex].fullName} has been discharged.`,
    };
  } catch (error: any) {
    console.error('Error in dischargePatientAction:', error);
    return {
      success: false,
      message: error.message || 'An unexpected error occurred during discharge.',
    };
  }
}

export async function updateOutpatientStatusAction(
    values: z.infer<typeof updateOutpatientStatusSchema>
) {
    console.log('[Simulated] Running updateOutpatientStatusAction with:', values);

    try {
        const { appointmentId, newStatus } = values;

        const appointmentIndex = allAppointments.findIndex(a => a.id === appointmentId);
        if (appointmentIndex === -1) {
            throw new Error("Appointment not found.");
        }

        const appointment = allAppointments[appointmentIndex];
        
        allAppointments[appointmentIndex].status = newStatus;

        if (newStatus === 'Completed') {
            const patientIndex = allPatients.findIndex(p => p.patientId === appointment.patientId);
            if (patientIndex !== -1) {
                allPatients[patientIndex].lastVisitDate = new Date();
                allPatients[patientIndex].updatedAt = new Date();
            }
        }
        
        return {
            success: true,
            message: `Appointment status updated to ${newStatus}.`,
        };

    } catch (error: any) {
        console.error('Error in updateOutpatientStatusAction:', error);
        return {
            success: false,
            message: error.message || 'An unexpected error occurred.',
        };
    }
}
