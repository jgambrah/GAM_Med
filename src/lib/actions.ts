'use server';

import {generateSmsReminder} from '@/ai/flows/generateSmsReminder';
import type {Appointment, User, Patient} from './types';
import {allPatients} from './data';
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

  // In a real app, this would be a query like:
  // const q = query(collection(db, "patients"), where("patientId", ">=", prefix), where("patientId", "<", prefix + "z"));
  // For mock data, we filter the array.
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
    address: { street: values.address, city: 'Accra', region: 'Greater Accra' }, // Mocked city/region
    emergencyContact: {
        name: values.emergencyContactName,
        relationship: values.emergencyContactRelationship,
        phone: values.emergencyContactPhone
    },
    isAdmitted: values.admissionStatus === "Inpatient",
    // In a real scenario, you'd create an admission record if they are inpatient
    // currentAdmissionId: values.admissionStatus === "Inpatient" ? "some-new-id" : undefined, 
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // In a real app, this would be a call to `setDoc(doc(db, "patients", newPatientId), newPatient)`
  console.log('Registering new patient with server action:', newPatient);
  allPatients.push(newPatient); // Mocking the data update

  return {
    success: true,
    message: `${newPatient.fullName} has been registered with ID ${newPatient.patientId}.`,
    patientId: newPatient.patientId,
  };
}
