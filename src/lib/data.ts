
import { User, Patient, Appointment, Admission, Bed, Referral, LabResult, ClinicalNote } from './types';

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
    uid: 'pharma1',
    email: 'j.boateng@gammed.com',
    name: 'James Boateng',
    role: 'pharmacist',
    is_active: true,
    created_at: now.toISOString(),
    last_login: now.toISOString(),
  },
  {
    uid: 'labtech1',
    email: 'l.technician@gammed.com',
    name: 'Lab Technician',
    role: 'lab_technician',
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
  {
    uid: 'billing1',
    email: 'b.clerk@gammed.com',
    name: 'Billing Clerk',
    role: 'billing_clerk',
    is_active: true,
    created_at: now.toISOString(),
    last_login: now.toISOString(),
  }
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
    attending_doctor_name: 'Dr. Evelyn Mensah',
    status: 'Admitted',
    created_at: new Date('2024-07-28T10:30:00Z').toISOString(),
    updated_at: new Date('2024-07-28T10:30:00Z').toISOString(),
  },
  {
    admission_id: 'A-002-PREVIOUS',
    patient_id: 'P-123456',
    type: 'Inpatient',
    admission_date: new Date('2024-05-10T10:30:00Z').toISOString(),
    discharge_date: new Date('2024-05-15T14:00:00Z').toISOString(),
    reasonForVisit: 'Chest Pains',
    ward: 'Cardiology',
    bed_id: 'C-102',
    attending_doctor_id: 'doc1',
    attending_doctor_name: 'Dr. Evelyn Mensah',
    status: 'Discharged',
    summary_pdf_url: '/mock-summary.pdf', // Dummy URL for the button to appear
    created_at: new Date('2024-05-10T10:30:00Z').toISOString(),
    updated_at: new Date('2024-05-15T14:00:00Z').toISOString(),
  }
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
        bed_id: 'GW-206',
        wardName: 'General Ward',
        room_number: '20',
        status: 'cleaning',
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
    appointment_date: new Date(new Date().setHours(10, 30, 0, 0)).toISOString(),
    end_time: new Date(new Date().setHours(11, 0, 0, 0)).toISOString(),
    duration: 30,
    type: 'follow-up',
    department: 'Cardiology',
    status: 'confirmed',
    notes: 'Follow-up consultation for hypertension.',
    created_at: now.toISOString(),
  },
   {
    appointment_id: 'AP-002',
    patient_id: 'P-654321',
    patient_name: 'Aba Appiah',
    doctor_id: 'doc1',
    doctor_name: 'Dr. Evelyn Mensah',
    appointment_date: new Date(new Date().setHours(14, 0, 0, 0)).toISOString(),
    end_time: new Date(new Date().setHours(14, 30, 0, 0)).toISOString(),
    duration: 30,
    type: 'consultation',
    department: 'Cardiology',
    status: 'confirmed',
    notes: 'Initial consultation.',
    created_at: now.toISOString(),
  },
];


// Mock Referrals Data
export const mockReferrals: Referral[] = [
  {
    referral_id: 'REF-001',
    referringProvider: 'Korle Bu Polyclinic',
    referralDate: new Date('2024-08-01T10:00:00Z').toISOString(),
    patientDetails: {
      name: 'Ama Serwaa',
      phone: '+233201234567',
      dob: '1988-02-15',
    },
    reasonForReferral: 'Persistent headaches and dizziness, requires neurological assessment.',
    priority: 'Urgent',
    assignedDepartment: 'Neurology',
    status: 'Pending Review',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    referral_id: 'REF-002',
    referringProvider: '37 Military Hospital',
    referralDate: new Date('2024-07-29T14:30:00Z').toISOString(),
    patientDetails: {
      name: 'Kofi Mensah',
      phone: '+233558765432',
      dob: '1975-09-20',
    },
    reasonForReferral: 'Post-operative follow-up for cardiac surgery.',
    priority: 'Routine',
    assignedDepartment: 'Cardiology',
    assignedDoctorId: 'doc1', // Assigned to Dr. Evelyn Mensah
    status: 'Assigned',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
   {
    referral_id: 'REF-003',
    referringProvider: 'Private Clinic',
    referralDate: new Date('2024-07-25T09:00:00Z').toISOString(),
    patientDetails: {
      name: 'Esi Parker',
      phone: '+233249998877',
      dob: '2001-11-10',
    },
    reasonForReferral: 'Scheduled consultation for acne treatment.',
    priority: 'Routine',
    assignedDepartment: 'Dermatology',
    status: 'Completed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

export const mockLabResults: LabResult[] = [
    {
        testId: 'lab-1',
        patientId: 'P-123456',
        patientName: 'Kwame Owusu',
        testName: 'Full Blood Count',
        status: 'Completed',
        result: { 'Hemoglobin': '14.5 g/dL', 'WBC': '7.2 x 10^9/L' },
        orderedByDoctorId: 'doc1',
        labTechnicianId: 'labtech1',
        orderedAt: new Date('2024-07-28T12:00:00Z').toISOString(),
        completedAt: new Date('2024-07-28T16:00:00Z').toISOString(),
    },
    {
        testId: 'lab-2',
        patientId: 'P-654321',
        patientName: 'Aba Appiah',
        testName: 'Lipid Panel',
        status: 'Ordered',
        result: 'Pending',
        orderedByDoctorId: 'doc1',
        orderedAt: new Date('2024-07-29T10:00:00Z').toISOString(),
    },
     {
        testId: 'lab-3',
        patientId: 'P-123456',
        patientName: 'Kwame Owusu',
        testName: 'Thyroid Panel',
        status: 'In Progress',
        result: 'Pending',
        orderedByDoctorId: 'doc1',
        labTechnicianId: 'labtech1',
        orderedAt: new Date('2024-07-30T10:00:00Z').toISOString(),
    }
];

export const mockNotes: ClinicalNote[] = [
    {
        noteId: 'note-1',
        noteType: 'Consultation',
        recordedByUserId: 'doc1',
        noteText: 'Patient admitted for observation due to hypertension. BP at 160/100. Started on Amlodipine 5mg daily.',
        recordedAt: new Date('2024-07-28T11:00:00Z').toISOString()
    },
    {
        noteId: 'note-2',
        noteType: 'Nursing Note',
        recordedByUserId: 'nurse1',
        noteText: 'Patient reports feeling dizzy. BP checked: 155/98. Administered evening dose of medication as prescribed. Patient resting comfortably.',
        recordedAt: new Date('2024-07-28T15:30:00Z').toISOString()
    },
    {
        noteId: 'note-3',
        noteType: 'Consultation',
        recordedByUserId: 'doc1',
        noteText: 'Morning rounds. Patient feels better, no dizziness reported. BP is stable at 140/90. Continue current treatment plan.',
        recordedAt: new Date('2024-07-29T09:15:00Z').toISOString()
    }
]
