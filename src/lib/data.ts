import type { User, Patient, Appointment, Bed, Admission } from './types';

export const allUsers: User[] = [
  { id: 'doc1', name: 'Dr. Evelyn Mensah', email: 'e.mensah@medflow.gh', role: 'Doctor', avatarUrl: 'https://placehold.co/100x100/E3F2FD/333?text=EM' },
  { id: 'pat1', name: 'Kwame Osei', email: 'k.osei@email.com', role: 'Patient', avatarUrl: 'https://placehold.co/100x100/E3F2FD/333?text=KO' },
  { id: 'adm1', name: 'Afi Johnson', email: 'a.johnson@medflow.gh', role: 'Admin', avatarUrl: 'https://placehold.co/100x100/E3F2FD/333?text=AJ' },
  { id: 'nur1', name: 'Grace Adjei', email: 'g.adjei@medflow.gh', role: 'Nurse', avatarUrl: 'https://placehold.co/100x100/E3F2FD/333?text=GA' },
  { id: 'pha1', name: 'Ben Carter', email: 'b.carter@medflow.gh', role: 'Pharmacist', avatarUrl: 'https://placehold.co/100x100/E3F2FD/333?text=BC' },
];

const now = new Date();

export const allPatients: Patient[] = [
  {
    patientId: 'P-250801-0001',
    firstName: 'Kwame',
    lastName: 'Osei',
    fullName: 'Kwame Osei',
    dob: '1985-05-20',
    gender: 'Male',
    contact: { phone: '+233241234567', email: 'k.osei@email.com' },
    address: { street: '123 Anum Street', city: 'Accra', region: 'Greater Accra' },
    emergencyContact: { name: 'Adwoa Osei', relationship: 'Spouse', phone: '+233247654321' },
    insurance: { providerName: 'NHIS', policyNumber: '12345678', expiryDate: new Date('2025-12-31') },
    isAdmitted: true,
    currentAdmissionId: 'ADM-0001',
    createdAt: now,
    updatedAt: now,
  },
  {
    patientId: 'P-250801-0002',
    firstName: 'Ama',
    lastName: 'Serwaa',
    fullName: 'Ama Serwaa',
    dob: '1992-11-15',
    gender: 'Female',
    contact: { phone: '+233209876543' },
    address: { street: '456 Palm Avenue', city: 'Kumasi', region: 'Ashanti' },
    emergencyContact: { name: 'Kofi Serwaa', relationship: 'Brother', phone: '+233203456789' },
    isAdmitted: false,
    createdAt: now,
    updatedAt: now,
  },
    {
    patientId: 'P-250801-0003',
    firstName: 'Femi',
    lastName: 'Adebayo',
    fullName: 'Femi Adebayo',
    dob: '1978-01-30',
    gender: 'Male',
    contact: { phone: '+233555550101', email: 'f.adebayo@email.com' },
    address: { street: '789 Baobab Lane', city: 'Takoradi', region: 'Western' },
    emergencyContact: { name: 'Sade Adebayo', relationship: 'Wife', phone: '+233555550102' },
    isAdmitted: true,
    currentAdmissionId: 'ADM-0002',
    createdAt: now,
    updatedAt: now,
  },
];


export const allAdmissions: Admission[] = [
    {
        admissionId: 'ADM-0001',
        patientId: 'P-250801-0001',
        type: 'Inpatient',
        admissionDate: new Date('2024-07-20T10:00:00Z'),
        reasonForAdmission: 'Chest Pains',
        ward: 'Cardiology',
        bedId: 'C-101',
        attendingDoctorId: 'doc1',
        isDischarged: false,
        createdAt: new Date('2024-07-20T10:00:00Z'),
    },
    {
        admissionId: 'ADM-0002',
        patientId: 'P-250801-0003',
        type: 'Inpatient',
        admissionDate: new Date('2024-07-22T14:30:00Z'),
        reasonForAdmission: 'Severe Migraine',
        ward: 'Neurology',
        bedId: 'N-203',
        attendingDoctorId: 'doc1',
        isDischarged: false,
        createdAt: new Date('2024-07-22T14:30:00Z'),
    },
];

export const allBeds: Bed[] = [
    {
        bedId: 'C-101',
        ward: 'Cardiology',
        roomNumber: '101',
        status: 'occupied',
        currentPatientId: 'P-250801-0001',
        occupiedSince: new Date('2024-07-20T10:00:00Z'),
        lastCleaned: new Date('2024-07-20T08:00:00Z'),
        createdAt: now,
    },
    {
        bedId: 'C-102',
        ward: 'Cardiology',
        roomNumber: '101',
        status: 'vacant',
        lastCleaned: new Date('2024-07-24T09:00:00Z'),
        createdAt: now,
    },
    {
        bedId: 'N-203',
        ward: 'Neurology',
        roomNumber: '203',
        status: 'occupied',
        currentPatientId: 'P-250801-0003',
        occupiedSince: new Date('2024-07-22T14:30:00Z'),
        lastCleaned: new Date('2024-07-22T12:00:00Z'),
        createdAt: now,
    },
     {
        bedId: 'N-204',
        ward: 'Neurology',
        roomNumber: '204',
        status: 'maintenance',
        lastCleaned: new Date('2024-07-23T11:00:00Z'),
        createdAt: now,
    }
];


const today = new Date();
const tomorrow = new Date();
tomorrow.setDate(today.getDate() + 1);

export const allAppointments: Appointment[] = [
  {
    id: 'app1',
    patientId: 'P-250801-0001',
    patientName: 'Kwame Osei',
    doctorId: 'doc1',
    doctorName: 'Evelyn Mensah',
    department: 'Cardiology',
    date: today.toISOString().split('T')[0],
    time: '10:00 AM',
    reason: 'Follow-up consultation',
    status: 'Scheduled',
  },
  {
    id: 'app2',
    patientId: 'P-250801-0002',
    patientName: 'Ama Serwaa',
    doctorId: 'doc1',
    doctorName: 'Evelyn Mensah',
    department: 'Cardiology',
    date: today.toISOString().split('T')[0],
    time: '11:30 AM',
    reason: 'Annual Checkup',
    status: 'Scheduled',
  },
  {
    id: 'app3',
    patientId: 'P-250801-0003',
    patientName: 'Femi Adebayo',
    doctorId: 'doc1',
    doctorName: 'Evelyn Mensah',
    department: 'Cardiology',
    date: tomorrow.toISOString().split('T')[0],
    time: '09:00 AM',
    reason: 'Initial Consultation',
    status: 'Scheduled',
  },
];
