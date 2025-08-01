'use server';

import {generateSmsReminder} from '@/ai/flows/generateSmsReminder';
import type {Appointment, User, Patient, Admission, Bed} from './types';
import {allPatients, allAdmissions, allBeds} from './data';
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
  reasonForAdmission: z.string().min(3, "Reason is too short."),
  ward: z.string().min(3, "Ward is required."),
  bedId: z.string().min(1, "Bed selection is required."),
  attendingDoctorId: z.string().min(1, "Doctor selection is required."),
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

/**
 * Generates a unique patient ID.
 * In a real application, this would query the Firestore database.
 * For now, it simulates this by checking the mock data.
 * @returns {string} A new unique patient ID.
 */
async function generatePatientId(): Promise<string> {
  const today = new Date();
  const datePrefix = today.toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD
  const prefix = `P-${datePrefix}`;

  const patientsToday = allPatients.filter(p => p.patientId.startsWith(prefix));

  const highestId = patientsToday.reduce((max, p) => {
    const currentNum = parseInt(p.patientId.split('-')[2], 10);
    return currentNum > max ? currentNum : max;
  }, 0);

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
    dob: values.dateOfBirth,
    gender: values.gender as "Male" | "Female" | "Other",
    contact: { phone: values.phone, email: values.email },
    address: { street: values.address, city: 'Accra', region: 'Greater Accra' },
    emergencyContact: {
        name: values.emergencyContactName,
        relationship: values.emergencyContactRelationship,
        phone: values.emergencyContactPhone
    },
    isAdmitted: values.admissionStatus === "Inpatient",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  console.log('[Simulated] Registering new patient with server action:', newPatient);
  allPatients.push(newPatient);

  console.log(`[Simulated] Firebase Auth user creation logic would go here for ${newPatient.patientId}.`);
  console.log(`[Simulated] Sending welcome notification to ${newPatient.contact.phone}.`);
  console.log(`[Simulated] Creating default EHR sub-collection for ${newPatient.patientId}.`);
  
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

  // In a real app, this would be a Firestore transaction
  try {
    const { patientId, ward, bedId, reasonForAdmission, attendingDoctorId } = values;

    // 1. Find patient and bed
    const patientIndex = allPatients.findIndex(p => p.patientId === patientId);
    if (patientIndex === -1) throw new Error("Patient not found.");
    
    const bedIndex = allBeds.findIndex(b => b.bedId === bedId);
    if (bedIndex === -1) throw new Error("Bed not found.");
    if (allBeds[bedIndex].status !== 'vacant') throw new Error("Selected bed is not vacant.");

    // 2. Generate new admission ID
    const newAdmissionId = await generateAdmissionId();
    
    // 3. Create new admission record
    const newAdmission: Admission = {
        admissionId: newAdmissionId,
        patientId,
        type: 'Inpatient',
        admissionDate: new Date(),
        reasonForAdmission,
        ward,
        bedId,
        attendingDoctorId,
        isDischarged: false,
        createdAt: new Date(),
    };
    allAdmissions.push(newAdmission);
    console.log('[Simulated] Created new admission record:', newAdmission);


    // 4. Update patient document
    allPatients[patientIndex].isAdmitted = true;
    allPatients[patientIndex].currentAdmissionId = newAdmissionId;
    allPatients[patientIndex].updatedAt = new Date();
    console.log('[Simulated] Updated patient record:', allPatients[patientIndex]);


    // 5. Update bed document
    allBeds[bedIndex].status = 'occupied';
    allBeds[bedIndex].currentPatientId = patientId;
    allBeds[bedIndex].occupiedSince = new Date();
    console.log('[Simulated] Updated bed record:', allBeds[bedIndex]);

    return {
      success: true,
      message: `Patient admitted successfully with Admission ID: ${newAdmissionId}`,
      admissionId: newAdmissionId,
    }

  } catch (error: any) {
    console.error("Error in admitPatientAction:", error);
    return {
      success: false,
      message: error.message || "An unexpected error occurred during admission.",
    }
  }
}

export async function dischargePatientAction(
  patientId: string,
  admissionId: string
) {
  console.log(`[Simulated] Running dischargePatientAction for patient ${patientId} and admission ${admissionId}`);

  try {
    const patientIndex = allPatients.findIndex(p => p.patientId === patientId);
    if (patientIndex === -1) throw new Error("Patient not found.");
    
    const admissionIndex = allAdmissions.findIndex(a => a.admissionId === admissionId);
    if (admissionIndex === -1) throw new Error("Admission record not found.");
    
    const { bedId } = allAdmissions[admissionIndex];
    if (!bedId) throw new Error("No bed assigned to this admission.");

    const bedIndex = allBeds.findIndex(b => b.bedId === bedId);
    if (bedIndex === -1) throw new Error("Assigned bed not found.");

    // 1. Update patient
    allPatients[patientIndex].isAdmitted = false;
    allPatients[patientIndex].currentAdmissionId = undefined;
    allPatients[patientIndex].updatedAt = new Date();
    console.log(`[Simulated] Updated patient ${patientId} to discharged.`);

    // 2. Update admission record
    allAdmissions[admissionIndex].isDischarged = true;
    allAdmissions[admissionIndex].dischargeDate = new Date();
    console.log(`[Simulated] Updated admission ${admissionId} to discharged.`);

    // 3. Update bed status
    allBeds[bedIndex].status = 'vacant';
    allBeds[bedIndex].currentPatientId = undefined;
    allBeds[bedIndex].occupiedSince = undefined;
    console.log(`[Simulated] Updated bed ${bedId} to vacant.`);

    // 4. Trigger follow-up actions
    console.log(`[Simulated] Triggering generation of discharge summary for admission ${admissionId}.`);
    console.log(`[Simulated] Triggering final bill generation for admission ${admissionId}.`);

    return {
      success: true,
      message: `Patient ${allPatients[patientIndex].fullName} has been discharged.`
    };

  } catch (error: any) {
    console.error("Error in dischargePatientAction:", error);
    return {
      success: false,
      message: error.message || "An unexpected error occurred during discharge.",
    };
  }
}
