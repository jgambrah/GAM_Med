
import type { User, Patient, Appointment, Bed, Admission, Referral } from './types';

export const allUsers: User[] = [
  { id: 'doc1', name: 'Dr. Evelyn Mensah', email: 'e.mensah@medflow.gh', role: 'Doctor', avatarUrl: 'https://placehold.co/100x100/E3F2FD/333?text=EM' },
  { id: 'doc2', name: 'Dr. Kofi Anan', email: 'k.anan@medflow.gh', role: 'Doctor', avatarUrl: 'https://placehold.co/100x100/E3F2FD/333?text=KA' },
  { id: 'pat1', name: 'Kwame Osei', email: 'k.osei@email.com', role: 'Patient', avatarUrl: 'https://placehold.co/100x100/E3F2FD/333?text=KO' },
  { id: 'adm1', name: 'Afi Johnson', email: 'a.johnson@medflow.gh', role: 'Admin', avatarUrl: 'https://placehold.co/100x100/E3F2FD/333?text=AJ' },
  { id: 'nur1', name: 'Grace Adjei', email: 'g.adjei@medflow.gh', role: 'Nurse', avatarUrl: 'https://placehold.co/100x100/E3F2FD/333?text=GA' },
  { id: 'pha1', name: 'Ben Carter', email: 'b.carter@medflow.gh', role: 'Pharmacist', avatarUrl: 'https://placehold.co/100x100/E3F2FD/333?text=BC' },
  { id: 'bil1', name: 'Esi Annan', email: 'e.annan@medflow.gh', role: 'BillingClerk', avatarUrl: 'https://placehold.co/100x100/E3F2FD/333?text=EA' },
  { id: 'hou1', name: 'Kojo Williams', email: 'k.williams@medflow.gh', role: 'Housekeeping', avatarUrl: 'https://placehold.co/100x100/E3F2FD/333?text=KW' },
];

const now = new Date();

export const allPatients: Patient[] = [
  {
    patientId: 'P-240821-0001',
    title: 'Mr',
    firstName: 'Kwame',
    lastName: 'Osei',
    fullName: 'Kwame Osei',
    dob: new Date('1985-05-20'),
    gender: 'Male',
    contact: { primaryPhone: '+233241234567', email: 'k.osei@email.com' },
    address: { street: '123 Anum Street', city: 'Accra', region: 'Greater Accra', country: 'Ghana' },
    emergencyContact: { name: 'Adwoa Osei', relationship: 'Spouse', phone: '+233247654321' },
    insurance: { providerName: 'NHIS', policyNumber: '12345678', isActive: true, expiryDate: new Date('2025-12-31') },
    isAdmitted: true,
    currentAdmissionId: 'ADM-0001',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  },
  {
    patientId: 'P-240821-0002',
    title: 'Ms',
    firstName: 'Ama',
    lastName: 'Serwaa',
    fullName: 'Ama Serwaa',
    dob: new Date('1992-11-15'),
    gender: 'Female',
    contact: { primaryPhone: '+233209876543' },
    address: { street: '456 Palm Avenue', city: 'Kumasi', region: 'Ashanti', country: 'Ghana' },
    emergencyContact: { name: 'Kofi Serwaa', relationship: 'Brother', phone: '+233203456789' },
    isAdmitted: false,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  },
    {
    patientId: 'P-240821-0003',
    title: 'Mr',
    firstName: 'Femi',
    lastName: 'Adebayo',
    fullName: 'Femi Adebayo',
    dob: new Date('1978-01-30'),
    gender: 'Male',
    contact: { primaryPhone: '+233555550101', email: 'f.adebayo@email.com' },
    address: { street: '789 Baobab Lane', city: 'Takoradi', region: 'Western', country: 'Ghana' },
    emergencyContact: { name: 'Sade Adebayo', relationship: 'Wife', phone: '+233555550102' },
    isAdmitted: true,
    currentAdmissionId: 'ADM-0002',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  },
];


export const allAdmissions: Admission[] = [
    {
        admissionId: 'ADM-0001',
        patientId: 'P-240821-0001',
        type: 'Inpatient',
        admissionDate: new Date('2024-07-20T10:00:00Z'),
        reasonForVisit: 'Chest Pains',
        ward: 'Cardiology',
        bedId: 'C-101',
        attendingDoctorId: 'doc1',
        status: 'Admitted',
        createdAt: new Date('2024-07-20T10:00:00Z'),
        updatedAt: new Date('2024-07-20T10:00:00Z'),
    },
    {
        admissionId: 'ADM-0002',
        patientId: 'P-240821-0003',
        type: 'Inpatient',
        admissionDate: new Date('2024-07-22T14:30:00Z'),
        reasonForVisit: 'Severe Migraine',
        ward: 'Neurology',
        bedId: 'N-203',
        attendingDoctorId: 'doc1',
        status: 'Admitted',
        createdAt: new Date('2024-07-22T14:30:00Z'),
        updatedAt: new Date('2024-07-22T14:30:00Z'),
    },
];

export const allBeds: Bed[] = [
    {
        bedId: 'C-101',
        wardName: 'Cardiology',
        roomNumber: '101',
        status: 'occupied',
        currentPatientId: 'P-240821-0001',
        currentAdmissionId: 'ADM-0001',
        occupiedSince: new Date('2024-07-20T10:00:00Z'),
        cleaningNeeded: false,
        createdAt: now,
        updatedAt: now,
    },
    {
        bedId: 'C-102',
        wardName: 'Cardiology',
        roomNumber: '101',
        status: 'cleaning',
        cleaningNeeded: true,
        createdAt: now,
        updatedAt: now,
    },
    {
        bedId: 'N-203',
        wardName: 'Neurology',
        roomNumber: '203',
        status: 'occupied',
        currentPatientId: 'P-240821-0003',
        currentAdmissionId: 'ADM-0002',
        occupiedSince: new Date('2024-07-22T14:30:00Z'),
        cleaningNeeded: false,
        createdAt: now,
        updatedAt: now,
    },
     {
        bedId: 'N-204',
        wardName: 'Neurology',
        roomNumber: '204',
        status: 'maintenance',
        cleaningNeeded: true,
        createdAt: now,
        updatedAt: now,
    },
     {
        bedId: 'G-101',
        wardName: 'General',
        roomNumber: 'G1',
        status: 'vacant',
        cleaningNeeded: false,
        createdAt: now,
        updatedAt: now,
    },
      {
        bedId: 'G-102',
        wardName: 'General',
        roomNumber: 'G1',
        status: 'vacant',
        cleaningNeeded: false,
        createdAt: now,
        updatedAt: now,
    }
];


const today = new Date();
const tomorrow = new Date();
tomorrow.setDate(today.getDate() + 1);

const todayAt10 = new Date(today.setHours(10, 0, 0, 0));
const todayAt1130 = new Date(today.setHours(11, 30, 0, 0));
const tomorrowAt9 = new Date(tomorrow.setHours(9, 0, 0, 0));

export const allAppointments: Appointment[] = [
  {
    appointmentId: 'app1',
    patientId: 'P-240821-0001',
    patientName: 'Kwame Osei',
    attendingDoctorId: 'doc1',
    doctorName: 'Dr. Evelyn Mensah',
    appointmentDateTime: todayAt10,
    reasonForVisit: 'Follow-up consultation',
    status: 'Scheduled',
    createdAt: now,
    updatedAt: now,
  },
  {
    appointmentId: 'app2',
    patientId: 'P-240821-0002',
    patientName: 'Ama Serwaa',
    attendingDoctorId: 'doc1',
    doctorName: 'Dr. Evelyn Mensah',
    appointmentDateTime: todayAt1130,
    reasonForVisit: 'Annual Checkup',
    status: 'Scheduled',
    createdAt: now,
    updatedAt: now,
  },
  {
    appointmentId: 'app3',
    patientId: 'P-240821-0003',
    patientName: 'Femi Adebayo',
    attendingDoctorId: 'doc2',
    doctorName: 'Dr. Kofi Anan',
    appointmentDateTime: tomorrowAt9,
    reasonForVisit: 'Initial Consultation',
    status: 'Scheduled',
createdAt: now,
    updatedAt: now,
  },
];


export const allReferrals: Referral[] = [
    {
        referralId: 'REF-240723-0001',
        patientDetails: {
            fullName: 'Yaa Asantewaa',
            dob: new Date('1988-08-08'),
            contactPhone: '0201122334',
        },
        referringProvider: {
            name: '37 Military Hospital'
        },
        reasonForReferral: 'Patient requires specialized cardiac evaluation following persistent palpitations and shortness of breath.',
        referredToDepartment: 'Cardiology',
        status: 'Pending',
        referralDate: new Date('2024-07-23T09:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        referralId: 'REF-240724-0002',
        patientDetails: {
            fullName: 'Ebo Taylor',
            dob: new Date('1956-03-12'),
            contactPhone: '0249876543',
        },
        referringProvider: {
            name: 'Korle Bu Teaching Hospital'
        },
        reasonForReferral: 'Urgent neurological consult for persistent headaches and blurred vision.',
        referredToDepartment: 'Neurology',
        status: 'Assigned',
        assignedToDoctorId: 'doc1',
        doctorName: 'Dr. Evelyn Mensah',
        referralDate: new Date('2024-07-24T11:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
    }
];
