import type { User, Patient, Appointment } from './types';

export const allUsers: User[] = [
  { id: 'doc1', name: 'Dr. Evelyn Mensah', email: 'e.mensah@medflow.gh', role: 'Doctor', avatarUrl: 'https://placehold.co/100x100/E3F2FD/333?text=EM' },
  { id: 'pat1', name: 'Kwame Osei', email: 'k.osei@email.com', role: 'Patient', avatarUrl: 'https://placehold.co/100x100/E3F2FD/333?text=KO' },
  { id: 'adm1', name: 'Afi Johnson', email: 'a.johnson@medflow.gh', role: 'Admin', avatarUrl: 'https://placehold.co/100x100/E3F2FD/333?text=AJ' },
  { id: 'nur1', name: 'Grace Adjei', email: 'g.adjei@medflow.gh', role: 'Nurse', avatarUrl: 'https://placehold.co/100x100/E3F2FD/333?text=GA' },
  { id: 'pha1', name: 'Ben Carter', email: 'b.carter@medflow.gh', role: 'Pharmacist', avatarUrl: 'https://placehold.co/100x100/E3F2FD/333?text=BC' },
];

export const allPatients: Patient[] = [
  {
    id: 'pat1',
    name: 'Kwame Osei',
    dateOfBirth: '1985-05-20',
    gender: 'Male',
    contact: { phone: '024-123-4567' },
    address: '123 Anum Street, Accra',
    emergencyContact: { name: 'Adwoa Osei', phone: '024-765-4321', relationship: 'Spouse' },
    bloodGroup: 'O+',
    allergies: ['Penicillin'],
  },
  {
    id: 'pat2',
    name: 'Ama Serwaa',
    dateOfBirth: '1992-11-15',
    gender: 'Female',
    contact: { phone: '020-987-6543' },
    address: '456 Palm Avenue, Kumasi',
    emergencyContact: { name: 'Kofi Serwaa', phone: '020-345-6789', relationship: 'Brother' },
    bloodGroup: 'A-',
    allergies: ['None'],
  },
  {
    id: 'pat3',
    name: 'Femi Adebayo',
    dateOfBirth: '1978-01-30',
    gender: 'Male',
    contact: { phone: '055-555-0101' },
    address: '789 Baobab Lane, Takoradi',
    emergencyContact: { name: 'Sade Adebayo', phone: '055-555-0102', relationship: 'Wife' },
    bloodGroup: 'B+',
    allergies: ['Dust', 'Pollen'],
  },
];

const today = new Date();
const tomorrow = new Date();
tomorrow.setDate(today.getDate() + 1);

export const allAppointments: Appointment[] = [
  {
    id: 'app1',
    patientId: 'pat1',
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
    patientId: 'pat2',
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
    patientId: 'pat3',
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
