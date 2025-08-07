
import { User, Patient, Appointment } from './types';

// Mock Users for development, allowing easy role switching
export const allUsers: User[] = [
  {
    uid: 'admin1',
    email: 'admin@gammed.com',
    displayName: 'Admin User',
    role: 'Admin',
  },
  {
    uid: 'doc1',
    email: 'e.mensah@gammed.com',
    displayName: 'Dr. Evelyn Mensah',
    role: 'Doctor',
    specialty: 'Cardiology',
    department: 'Cardiology',
  },
  {
    uid: 'nurse1',
    email: 'f.agyepong@gammed.com',
    displayName: 'Florence Agyepong',
    role: 'Nurse',
    department: 'General Ward',
  },
  {
    uid: 'pharma1',
    email: 'j.boateng@gammed.com',
    displayName: 'James Boateng',
    role: 'Pharmacist',
  },
  {
    uid: 'patient1',
    email: 'k.owusu@email.com',
    displayName: 'Kwame Owusu',
    role: 'Patient',
  },
];

// Mock Patient Data
export const allPatients: Patient[] = [
  {
    patientId: 'GM-PT-000001',
    ghanaCardId: 'GHA-123456789-0',
    primaryContact: {
      phone: '0244123456',
      email: 'k.owusu@email.com',
    },
    personalDetails: {
      firstName: 'Kwame',
      lastName: 'Owusu',
      dateOfBirth: '1985-05-20',
      gender: 'Male',
    },
    address: {
      street: '123 Osu Oxford Street',
      city: 'Accra',
      region: 'Greater Accra',
    },
    emergencyContact: {
      name: 'Adwoa Owusu',
      phone: '0204123789',
      relationship: 'Spouse',
    },
    insuranceDetails: {
      provider: 'NHIS',
      policyNumber: '87654321',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Mock Appointment Data
export const allAppointments: Appointment[] = [
    {
        appointmentId: 'GM-APPT-000001',
        patientId: 'GM-PT-000001',
        doctorId: 'doc1',
        department: 'Cardiology',
        appointmentDateTime: new Date(new Date().getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
        reason: 'Follow-up consultation for hypertension.',
        status: 'Scheduled',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }
]
