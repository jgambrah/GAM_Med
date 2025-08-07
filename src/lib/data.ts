
import { User, Patient, Appointment } from './types';

const now = new Date().toISOString();

// Mock Users for development, allowing easy role switching
export const allUsers: User[] = [
  {
    uid: 'admin1',
    email: 'admin@gammed.com',
    name: 'Admin User',
    role: 'admin',
    is_active: true,
    created_at: now,
    last_login: now,
  },
  {
    uid: 'doc1',
    email: 'e.mensah@gammed.com',
    name: 'Dr. Evelyn Mensah',
    role: 'doctor',
    is_active: true,
    specialty: 'Cardiology',
    department: 'Cardiology',
    created_at: now,
    last_login: now,
  },
  {
    uid: 'nurse1',
    email: 'f.agyepong@gammed.com',
    name: 'Florence Agyepong',
    role: 'nurse',
    is_active: true,
    department: 'General Ward',
    created_at: now,
    last_login: now,
  },
  {
    uid: 'pharma1',
    email: 'j.boateng@gammed.com',
    name: 'James Boateng',
    role: 'pharmacist',
    is_active: true,
    created_at: now,
    last_login: now,
  },
  {
    uid: 'patient1',
    email: 'k.owusu@email.com',
    name: 'Kwame Owusu',
    role: 'patient',
    is_active: true,
    patient_id: 'GM-PT-000001',
    created_at: now,
    last_login: now,
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
