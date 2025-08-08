import { User, Patient, Appointment, Admission, Bed } from './types';

const now = new Date();

// Mock Users for development, allowing easy role switching
export const allUsers: User[] = [
  {
    uid: 'admin1',
    email: 'admin@gammed.com',
    name: 'Admin User',
    role: 'admin',
    is_active: true,
    created_at: now.toISOString(),
    last_login: now.toISOString(),
  },
  {
    uid: 'doc1',
    email: 'e.mensah@gammed.com',
    name: 'Dr. Evelyn Mensah',
    role: 'doctor',
    is_active: true,
    specialty: 'Cardiology',
    department: 'Cardiology',
    created_at: now.toISOString(),
    last_login: now.toISOString(),
  },
  {
    uid: 'nurse1',
    email: 'f.agyepong@gammed.com',
    name: 'Florence Agyepong',
    role: 'nurse',
    is_active: true,
    department: 'General Ward',
    created_at: now.toISOString(),
    last_login: now.toISOString(),
  },
  {
    uid: 'pharma1',
    email: 'j.boateng@gammed.com',
    name: 'James Boateng',
    role: 'pharmacist',
    is_active: true,
    created_at: now.toISOString(),
    last_login: now.toISOString(),
  },
  {
    uid: 'patient1',
    email: 'k.owusu@email.com',
    name: 'Kwame Owusu',
    role: 'patient',
    is_active: true,
    patient_id: 'P-123456',
    created_at: now.toISOString(),
    last_login: now.toISOString(),
  },
];

// Mock Patient Data
export const allPatients: Patient[] = [
  {
    patient_id: 'P-123456',
    first_name: 'Kwame',
    last_name: 'Owusu',
    full_name: 'Kwame Owusu',
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
      expiry_date: '2025-12-31',
    },
    is_admitted: true,
    current_admission_id: 'A-001',
    status: 'active',
    created_at: new Date('2023-10-15T09:00:00Z').toISOString(),
    updated_at: now.toISOString(),
  },
];

// Mock Admission Data
export const allAdmissions: Admission[] = [
  {
    admission_id: 'A-001',
    patient_id: 'P-123456',
    type: 'Inpatient',
    admission_date: new Date('2024-07-28T10:30:00Z').toISOString(),
    reason_for_admission: 'Follow-up on hypertension',
    ward: 'Cardiology',
    bed_id: 'C-101',
    attending_doctor_id: 'doc1',
    is_discharged: false,
    created_at: new Date('2024-07-28T10:30:00Z').toISOString(),
  },
];

// Mock Bed Data
export const allBeds: Bed[] = [
    {
        bed_id: 'C-101',
        ward: 'Cardiology',
        room_number: '10',
        status: 'occupied',
        current_patient_id: 'P-123456',
        occupied_since: new Date('2024-07-28T10:30:00Z').toISOString(),
        created_at: now.toISOString()
    },
    {
        bed_id: 'GW-205',
        ward: 'General Ward',
        room_number: '20',
        status: 'vacant',
        last_cleaned: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        created_at: now.toISOString()
    },
    {
        bed_id: 'M-5',
        ward: 'Maternity',
        room_number: '3',
        status: 'maintenance',
        created_at: now.toISOString()
    }
]

// Mock Appointment Data
export const allAppointments: Appointment[] = [
  {
    appointment_id: 'AP-001',
    patient_id: 'P-123456',
    patient_name: 'Kwame Owusu',
    doctor_id: 'doc1',
    doctor_name: 'Dr. Evelyn Mensah',
    appointment_date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
    end_time: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(), // 2 days and 30 minutes from now
    duration: 30,
    type: 'follow-up',
    department: 'Cardiology',
    status: 'confirmed',
    notes: 'Follow-up consultation for hypertension.',
    created_at: now.toISOString(),
  },
];
