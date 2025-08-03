'use server';

import {generateSmsReminder} from '@/ai/flows/generateSmsReminder';
import type {Admission, Appointment, Bed, Patient, User, OutpatientStatus} from './types';
import {allAdmissions, allBeds, allPatients, allAppointments} from './data';
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
 * Conceptual `generatePatientId` Function (as a Server Action helper)
 * Generates a unique patient ID based on the current date.
 * @returns {string} A new unique patient ID (e.g., P-240821-0001).
 */
async function generatePatientId(): Promise<string> {
  const today = new Date();
  const datePrefix = today.toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD
  const prefix = `P-${datePrefix}`;

  // In a real app, this would query Firestore:
  // const q = query(collection(db, "patients"), where("patientId", ">=", prefix), orderBy("patientId", "desc"), limit(1));
  // const querySnapshot = await getDocs(q);
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

/**
 * Conceptual `onPatientRegister` Logic (as part of `registerPatientAction`)
 * Handles creating a patient record and triggering follow-up actions.
 */
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

  // In a real Firestore app, this would be a single atomic `setDoc` operation.
  console.log(
    '[Simulated] Registering new patient with server action:',
    newPatient
  );
  allPatients.push(newPatient);

  // Follow-up actions that would be part of a Firestore Trigger:
  console.log(
    `[Simulated] Firebase Auth user creation logic would go here for ${newPatient.patientId}.`
  );
  console.log(
    `[Simulated] Sending welcome notification to ${newPatient.contact.primaryPhone}.`
  );
  console.log(
    `[Simulated] Creating default EHR sub-collection for ${newPatient.patientId}.`
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

/**
 * Conceptual `handlePatientAdmission` Function (as a Server Action)
 * Handles the logic for admitting a patient.
 */
export async function admitPatientAction(
  values: z.infer<typeof admissionFormSchema>
) {
  console.log('[Simulated] Running admitPatientAction for:', values);

  // In a real app, this would be a Firestore transaction
  try {
    const {patientId, ward, bedId, reasonForAdmission, attendingDoctorId} =
      values;

    // 1. Find patient and bed
    const patientIndex = allPatients.findIndex(p => p.patientId === patientId);
    if (patientIndex === -1) throw new Error('Patient not found.');

    const bedIndex = allBeds.findIndex(b => b.bedId === bedId);
    if (bedIndex === -1) throw new Error('Bed not found.');
    if (allBeds[bedIndex].status !== 'vacant')
      throw new Error('Selected bed is not vacant.');

    // 2. Generate new admission ID
    const newAdmissionId = await generateAdmissionId();

    // 3. Create new admission record
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
    console.log('[Simulated] Created new admission record:', newAdmission);

    // 4. Update patient record
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
    };
  } catch (error: any) {
    console.error('Error in admitPatientAction:', error);
    return {
      success: false,
      message: error.message || 'An unexpected error occurred during admission.',
    };
  }
}

/**
 * Conceptual `handlePatientDischarge` Function (as a Server Action)
 * Handles the logic for discharging a patient.
 */
export async function dischargePatientAction(
  patientId: string,
  admissionId: string,
  dischargeDetails: {
    diagnosisAtDischarge: string;
    summaryOfTreatment: string;
    medicationsOnDischarge: string;
  }
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

    const {bedId} = allAdmissions[admissionIndex];
    if (!bedId) throw new Error('No bed assigned to this admission.');

    const bedIndex = allBeds.findIndex(b => b.bedId === bedId);
    if (bedIndex === -1) throw new Error('Assigned bed not found.');

    // In a real app, these three updates would be in a single atomic batch write.
    // const batch = writeBatch(db);
    // batch.update(patientRef, { isAdmitted: false, currentAdmissionId: null });
    // batch.update(admissionRef, { ... });
    // batch.update(bedRef, { status: 'vacant', currentPatientId: null });
    // await batch.commit();

    // 1. Update patient
    allPatients[patientIndex].isAdmitted = false;
    allPatients[patientIndex].currentAdmissionId = undefined;
    allPatients[patientIndex].updatedAt = new Date();
    console.log(`[Simulated] Updated patient ${patientId} to discharged.`);

    // 2. Update admission record
    allAdmissions[admissionIndex].status = 'Discharged';
    allAdmissions[admissionIndex].dischargeDate = new Date();
    allAdmissions[admissionIndex].dischargeSummary = {
        diagnosisOnDischarge: dischargeDetails.diagnosisAtDischarge,
        treatmentProvided: dischargeDetails.summaryOfTreatment,
        conditionAtDischarge: 'Stable', // Mocked for now
        medicationAtDischarge: dischargeDetails.medicationsOnDischarge.split(',').map(name => ({ name: name.trim(), dosage: "As prescribed", instructions: "As instructed" })),
        followUpInstructions: "Follow up with specialist in 2 weeks." // Mocked
    }
    allAdmissions[admissionIndex].isSummaryFinalized = true; // Finalize on discharge for now
    
    console.log(`[Simulated] Updated admission ${admissionId} with full discharge summary.`);

    // 3. Update bed status
    allBeds[bedIndex].status = 'cleaning';
    allBeds[bedIndex].currentPatientId = undefined;
    allBeds[bedIndex].occupiedSince = undefined;
    console.log(`[Simulated] Updated bed ${bedId} to vacant.`);

    // 4. Trigger follow-up actions (simulated)
    console.log(
      `[Simulated] Triggering generation of discharge summary for admission ${admissionId}.`
    );
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
        
        // Update appointment status
        allAppointments[appointmentIndex].status = newStatus;
        console.log(`[Simulated] Updated appointment ${appointmentId} status to ${newStatus}.`);


        if (newStatus === 'Completed') {
            const patientIndex = allPatients.findIndex(p => p.patientId === appointment.patientId);
            if (patientIndex !== -1) {
                allPatients[patientIndex].lastVisitDate = new Date();
                allPatients[patientIndex].updatedAt = new Date();
                console.log(`[Simulated] Updated patient ${appointment.patientId} lastVisitDate.`);
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
