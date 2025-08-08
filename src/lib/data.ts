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
    title: 'Mr',
    first_name: 'Kwame',
    last_name: 'Owusu',
    full_name: 'Kwame Owusu',
    ghanaCardId: 'GHA-123456789-0',
    dob: '1985-05-20',
    gender: 'Male',
    maritalStatus: 'Married',
    occupation: 'Software Engineer',
    contact: {
      primaryPhone: '+233241234567',
      email: 'k.owusu@email.com',
      address: {
        street: '123 Osu Oxford Street',
        city: 'Accra',
        region: 'Greater Accra',
        country: 'Ghana',
      },
    },
    emergency_contact: {
      name: 'Adwoa Owusu',
      relationship: 'Spouse',
      phone: '+233204123789',
    },
    insurance: {
      provider_name: 'NHIS',
      policy_number: '87654321',
      isActive: true,
      expiry_date: '2025-12-31',
    },
    medicalHistory: {
      allergies: ['Penicillin'],
      preExistingConditions: ['Hypertension'],
    },
    is_admitted: true,
    current_admission_id: 'A-001',
    status: 'active',
    lastVisitDate: new Date('2024-07-28T10:30:00Z').toISOString(),
    created_at: new Date('2023-10-15T09:00:00Z').toISOString(),
    updated_at: now.toISOString(),
  },
   {
    patient_id: 'P-654321',
    title: 'Ms',
    first_name: 'Aba',
    last_name: 'Appiah',
    full_name: 'Aba Appiah',
    dob: '1992-11-02',
    gender: 'Female',
    maritalStatus: 'Single',
    contact: {
      primaryPhone: '+233209876543',
      email: 'a.appiah@email.com',
      address: {
        street: '456 Spintex Road',
        city: 'Tema',
        region: 'Greater Accra',
        country: 'Ghana'
      },
    },
    emergency_contact: {
      name: 'Kofi Appiah',
      relationship: 'Brother',
      phone: '+233276543210',
    },
    is_admitted: false,
    status: 'active',
    created_at: new Date('2024-01-20T14:00:00Z').toISOString(),
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
    reasonForVisit: 'Follow-up on hypertension',
    ward: 'Cardiology',
    bed_id: 'C-101',
    attending_doctor_id: 'doc1',
    status: 'Admitted',
    is_discharged: false, // Legacy field, can be derived from status
    created_at: new Date('2024-07-28T10:30:00Z').toISOString(),
    updated_at: new Date('2024-07-28T10:30:00Z').toISOString(),
  },
];

// Mock Bed Data
export const allBeds: Bed[] = [
    {
        bed_id: 'C-101',
        wardName: 'Cardiology',
        room_number: '10',
        status: 'occupied',
        current_patient_id: 'P-123456',
        occupied_since: new Date('2024-07-28T10:30:00Z').toISOString(),
        cleaningNeeded: false,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
    },
    {
        bed_id: 'GW-205',
        wardName: 'General Ward',
        room_number: '20',
        status: 'vacant',
        cleaningNeeded: true,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
    },
    {
        bed_id: 'M-5',
        wardName: 'Maternity',
        room_number: '3',
        status: 'maintenance',
        cleaningNeeded: false,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
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
