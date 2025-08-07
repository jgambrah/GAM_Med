
import { User, Patient, Appointment, Admission } from './types';

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
    patient_id: 'P-123456',
    created_at: now,
    last_login: now,
  },
];

// Mock Patient Data
export const allPatients: Patient[] = [
  {
    patient_id: 'P-123456',
    full_name: 'Kwame Owusu',
    first_name: 'Kwame',
    last_name: 'Owusu',
    dob: '1985-05-20',
    gender: 'Male',
    contact: {
      phone_number: '+233241234567',
      email: 'k.owusu@email.com',
      address: {
        street: '123 Osu Oxford Street',
        city: 'Accra',
        region: 'Greater Accra',
      },
    },
    emergency_contact: {
      name: 'Adwoa Owusu',
      relationship: 'Spouse',
      phone_number: '+233204123789',
    },
    insurance: {
      provider_name: 'NHIS',
      policy_number: '87654321',
      expiry_date: '2025-12-31'
    },
    status: 'active',
    created_at: new Date().toISOString(),
  },
];

// Mock Admission Data
export const allAdmissions: Admission[] = [
    {
        admission_id: 'A-001',
        admission_date: new Date().toISOString(),
        ward: 'Cardiology',
        bed_number: 'C-101',
        reason_for_admission: 'Follow-up on hypertension',
        attending_doctor_id: 'doc1',
        discharge_date: null,
        created_at: new Date().toISOString(),
    }
];


// Mock Appointment Data
export const allAppointments: Appointment[] = [
    {
        appointmentId: 'GM-APPT-000001',
        patientId: 'P-123456',
        doctorId: 'doc1',
        department: 'Cardiology',
        appointmentDateTime: new Date(new Date().getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
        reason: 'Follow-up consultation for hypertension.',
        status: 'Scheduled',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }
]
