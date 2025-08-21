

import { User, Patient, Appointment, Admission, Bed, Referral, LabResult, ClinicalNote, VitalsLog, CarePlan, MedicationRecord, PatientAlert, ImmunizationRecord, Vaccine, Resource, ResourceBooking, WaitingListEntry, Invoice, Claim, FinancialTransaction, Prescription } from './types';

const now = new Date('2024-08-16T10:15:00.000Z');

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
    uid: 'doc2',
    email: 'k.asante@gammed.com',
    name: 'Dr. Kofi Asante',
    role: 'doctor',
    is_active: true,
    specialty: 'Neurology',
    department: 'Neurology',
    created_at: now.toISOString(),
    last_login: now.toISOString(),
  },
  {
    uid: 'nurse1',
    email: 'f.agyepong@gammed.com',
    name: 'Florence Agyepong',
    role: 'nurse',
    is_active: true,
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
  },
  {
    uid: 'reception1',
    email: 'r.staff@gammed.com',
    name: 'Receptionist',
    role: 'receptionist',
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
    allergies: ['Penicillin'],
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
    is_admitted: true,
    current_admission_id: 'A-003',
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
  },
  {
    admission_id: 'A-003',
    patient_id: 'P-654321',
    type: 'Inpatient',
    admission_date: new Date('2024-08-01T10:30:00Z').toISOString(),
    reasonForVisit: 'Pre-operative assessment',
    ward: 'General Ward',
    bed_id: 'GW-208',
    attending_doctor_id: 'doc1',
    attending_doctor_name: 'Dr. Evelyn Mensah',
    status: 'Admitted',
    created_at: new Date('2024-08-01T10:30:00Z').toISOString(),
    updated_at: new Date('2024-08-01T10:30:00Z').toISOString(),
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
        bed_id: 'GW-208',
        wardName: 'General Ward',
        room_number: '21',
        status: 'occupied',
        current_patient_id: 'P-654321',
        occupied_since: new Date('2024-08-01T10:30:00Z').toISOString(),
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
    appointment_date: new Date('2024-08-16T10:30:00.000Z').toISOString(),
    end_time: new Date('2024-08-16T11:00:00.000Z').toISOString(),
    duration: 30,
    type: 'follow-up',
    department: 'Cardiology',
    status: 'confirmed',
    isBilled: false,
    notes: 'Follow-up consultation for hypertension.',
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  },
   {
    appointment_id: 'AP-002',
    patient_id: 'P-654321',
    patient_name: 'Aba Appiah',
    doctor_id: 'doc1',
    doctor_name: 'Dr. Evelyn Mensah',
    appointment_date: new Date('2024-08-16T14:00:00.000Z').toISOString(),
    end_time: new Date('2024-08-16T14:30:00.000Z').toISOString(),
    duration: 30,
    type: 'consultation',
    department: 'Cardiology',
    status: 'confirmed',
    isBilled: false,
    notes: 'Initial consultation.',
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
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
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
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
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
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
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
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
        isBilled: false,
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
        isBilled: false,
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
        isBilled: false,
    }
];

export const mockNotes: ClinicalNote[] = [
    {
        noteId: 'note-1',
        patientId: 'P-123456',
        noteType: 'Consultation',
        recordedByUserId: 'doc1',
        noteText: 'Patient admitted for observation due to hypertension. BP at 160/100. Started on Amlodipine 5mg daily.',
        recordedAt: new Date('2024-07-28T11:00:00Z').toISOString()
    },
    {
        noteId: 'note-2',
        patientId: 'P-123456',
        noteType: 'Nursing Note',
        recordedByUserId: 'nurse1',
        noteText: 'Patient reports feeling dizzy. BP checked: 155/98. Administered evening dose of medication as prescribed. Patient resting comfortably.',
        recordedAt: new Date('2024-07-28T15:30:00Z').toISOString()
    },
    {
        noteId: 'note-3',
        patientId: 'P-123456',
        noteType: 'Consultation',
        recordedByUserId: 'doc1',
        noteText: 'Morning rounds. Patient feels better, no dizziness reported. BP is stable at 140/90. Continue current treatment plan.',
        recordedAt: new Date('2024-07-29T09:15:00Z').toISOString()
    }
];

export const mockVitalsLog: VitalsLog[] = [
    {
        vitalId: 'vitals-1',
        patientId: 'P-123456',
        bloodPressure: '155/98',
        heartRate: '88',
        temperature: '37.1',
        respiratoryRate: '18',
        oxygenSaturation: '97',
        recordedByUserId: 'nurse1',
        recordedAt: new Date('2024-07-28T15:30:00Z').toISOString(),
    },
    {
        vitalId: 'vitals-2',
        patientId: 'P-123456',
        bloodPressure: '142/90',
        heartRate: '82',
        temperature: '36.8',
        respiratoryRate: '16',
        oxygenSaturation: '98',
        recordedByUserId: 'nurse1',
        recordedAt: new Date('2024-07-29T08:00:00Z').toISOString(),
    },
     {
        vitalId: 'vitals-3',
        patientId: 'P-123456',
        bloodPressure: '180/105', // Critically high BP
        heartRate: '110',
        temperature: '38.6', // Fever
        respiratoryRate: '22',
        oxygenSaturation: '94',
        recordedByUserId: 'nurse1',
        recordedAt: new Date('2024-08-16T08:15:00.000Z').toISOString(), // 2 hours before `now`
    }
];

export const mockCarePlans: CarePlan[] = [
    {
        planId: 'plan-1',
        patientId: 'P-123456',
        title: 'Hypertension Management',
        goal: 'Maintain BP below 140/90. Educate patient on diet and exercise. Ensure medication adherence.',
        interventions: 'Daily BP monitoring. Low sodium diet consultation. Administer Amlodipine 5mg daily. Encourage 30 mins of walking daily.',
        status: 'Active',
        createdBy: 'doc1',
        createdAt: new Date('2024-07-28T11:30:00Z').toISOString(),
        updatedBy: 'nurse1',
        updatedAt: new Date('2024-07-29T08:05:00Z').toISOString(),
    },
    {
        planId: 'plan-2',
        patientId: 'P-654321',
        title: 'Pre-Operative Care',
        goal: 'Ensure patient is medically stable for surgery. Manage anxiety. Provide pre-op education.',
        interventions: 'Monitor vital signs every 4 hours. Provide information booklet on the procedure. Administer pre-medication as ordered.',
        status: 'Active',
        createdBy: 'doc1',
        createdAt: new Date('2024-08-01T11:00:00Z').toISOString(),
        updatedBy: 'doc1',
        updatedAt: new Date('2024-08-01T11:00:00Z').toISOString(),
    }
];

export const mockPrescriptions: Prescription[] = [
    {
        prescriptionId: 'med-1',
        patientId: 'P-123456',
        patientName: 'Kwame Owusu',
        medicationId: 'amlodipine',
        medicationName: 'Amlodipine',
        dosage: '5mg',
        form: 'Tablet',
        frequency: 'Once daily',
        duration: '30 days',
        quantity: 30,
        route: 'Oral',
        instructions: 'Take in the morning with food.',
        prescribedByDoctorId: 'doc1',
        prescribedByDoctorName: 'Dr. Evelyn Mensah',
        prescribedAt: new Date('2024-07-28T11:05:00Z').toISOString(),
        status: 'Pending Pharmacy'
    },
    {
        prescriptionId: 'med-2',
        patientId: 'P-123456',
        patientName: 'Kwame Owusu',
        medicationId: 'atorvastatin',
        medicationName: 'Atorvastatin',
        dosage: '20mg',
        form: 'Tablet',
        frequency: 'Once daily at bedtime',
        duration: '90 days',
        quantity: 90,
        route: 'Oral',
        instructions: '',
        prescribedByDoctorId: 'doc1',
        prescribedByDoctorName: 'Dr. Evelyn Mensah',
        prescribedAt: new Date('2024-07-28T11:05:00Z').toISOString(),
        status: 'Pending Pharmacy'
    },
    {
        prescriptionId: 'med-3',
        patientId: 'P-654321',
        patientName: 'Aba Appiah',
        medicationId: 'paracetamol',
        medicationName: 'Paracetamol',
        dosage: '1g',
        form: 'Tablet',
        frequency: 'PRN for pain',
        duration: 'As needed',
        quantity: 20,
        route: 'Oral',
        instructions: 'Do not exceed 4g in 24 hours.',
        prescribedByDoctorId: 'doc1',
        prescribedByDoctorName: 'Dr. Evelyn Mensah',
        prescribedAt: new Date('2024-08-01T11:05:00Z').toISOString(),
        status: 'Pending Pharmacy'
    }
];

export const mockAlerts: PatientAlert[] = [
    {
        alertId: 'alert-1',
        patientId: 'P-123456',
        ruleId: 'vital-bp-high',
        severity: 'Critical',
        alert_message: 'Patient\'s systolic blood pressure is critically high (180). Immediate intervention required.',
        triggeredByUserId: 'nurse1',
        triggeredAt: new Date('2024-08-16T08:15:00.000Z').toISOString(),
        isAcknowledged: false,
    },
    {
        alertId: 'alert-2',
        patientId: 'P-123456',
        ruleId: 'vital-temp-high',
        severity: 'Warning',
        alert_message: 'Patient has a fever (38.6°C). Monitor and consider antipyretics.',
        triggeredByUserId: 'nurse1',
        triggeredAt: new Date('2024-08-16T08:15:00.000Z').toISOString(),
        isAcknowledged: true,
        acknowledgedByUserId: 'doc1'
    }
];

export const mockVaccineCatalog: Vaccine[] = [
    {
        vaccineId: 'BCG',
        name: 'Bacillus Calmette-Guérin (BCG)',
        schedule: [{ dose: 1, intervalMonths: 0 }],
        brandNames: ['BCG Vaccine'],
    },
    {
        vaccineId: 'MMR',
        name: 'Measles, Mumps, Rubella (MMR)',
        schedule: [{ dose: 1, intervalMonths: 12 }, { dose: 2, intervalYears: 6 }],
        brandNames: ['M-M-R II', 'Priorix'],
    },
    {
        vaccineId: 'TETANUS',
        name: 'Tetanus Toxoid',
        schedule: [
            { dose: 1, intervalMonths: 0 },
            { dose: 2, intervalMonths: 1 },
            { dose: 3, intervalMonths: 6 },
            { dose: 4, intervalYears: 10 },
        ],
        brandNames: ['Tetanus Diphtheria (Td)'],
    }
];

export const mockImmunizationRecords: ImmunizationRecord[] = [
    {
        immunizationId: 'imm-1',
        patientId: 'P-123456',
        vaccineName: 'Tetanus',
        doseNumber: 1,
        administeredAt: new Date('2023-01-10T10:00:00Z').toISOString(),
        nextDueDate: new Date('2023-02-10T10:00:00Z').toISOString(),
        administeredByUserId: 'nurse1',
    },
    {
        immunizationId: 'imm-2',
        patientId: 'P-123456',
        vaccineName: 'Tetanus',
        doseNumber: 2,
        administeredAt: new Date('2023-02-15T10:00:00Z').toISOString(),
        nextDueDate: new Date('2023-08-15T10:00:00Z').toISOString(),
        administeredByUserId: 'nurse1',
        notes: 'Administered in left deltoid.'
    }
];

export const mockResources: Resource[] = [
  {
    resourceId: 'mri-1',
    name: 'MRI Scanner 1',
    type: 'Equipment',
    department: 'Radiology',
    location: 'Radiology Wing, Basement',
    operatingHours: { 'Mon-Fri': '08:00-20:00', 'Sat': '09:00-17:00' },
    isBookable: true,
  },
  {
    resourceId: 'proc-room-1',
    name: 'Procedure Room 1',
    type: 'Room',
    department: 'General Surgery',
    location: 'Outpatient Clinic, 2nd Floor',
    operatingHours: { 'Mon-Fri': '09:00-17:00' },
    isBookable: true,
  },
  {
    resourceId: 'consult-room-5',
    name: 'Consultation Room 5',
    type: 'Room',
    department: 'Cardiology',
    location: 'Cardiology Clinic',
    operatingHours: { 'Mon-Fri': '09:00-17:00' },
    isBookable: true,
  },
];

export const mockResourceBookings: ResourceBooking[] = [
    {
        bookingId: 'booking-1',
        resourceId: 'proc-room-1',
        bookedByUserId: 'doc1',
        startTime: '2024-08-16T10:00:00Z',
        endTime: '2024-08-16T11:00:00Z',
        status: 'Confirmed',
        reason: 'Minor skin lesion removal',
        relatedAppointmentId: 'AP-XYZ'
    },
    {
        bookingId: 'booking-2',
        resourceId: 'proc-room-1',
        bookedByUserId: 'doc2',
        startTime: '2024-08-16T14:00:00Z',
        endTime: '2024-08-16T15:30:00Z',
        status: 'Confirmed',
        reason: 'Biopsy sample collection',
        relatedAppointmentId: 'AP-ABC'
    }
];

export const mockWaitingList: WaitingListEntry[] = [
    {
        waitinglistId: 'wl-1',
        patientId: 'P-789012', // A new patient not in the main list
        requestedService: 'Cardiology Consultation',
        priority: 'Urgent',
        dateAdded: new Date('2024-08-15T10:00:00Z').toISOString(),
        status: 'Active',
        notes: 'Patient reports increased chest pain.'
    },
    {
        waitinglistId: 'wl-2',
        patientId: 'P-345678', // A new patient
        requestedService: 'Knee Surgery',
        requestedServiceId: 'OT-3',
        priority: 'Routine',
        dateAdded: new Date('2024-08-10T14:00:00Z').toISOString(),
        status: 'Active',
    }
];

export const mockInvoices: Invoice[] = [
    {
        invoiceId: 'INV-001',
        patientId: 'P-123456',
        patientName: 'Kwame Owusu',
        issueDate: new Date('2024-07-29T18:00:00Z').toISOString(),
        dueDate: new Date('2024-08-28T18:00:00Z').toISOString(),
        billedItems: [{ serviceType: 'Consultation', linkedServiceId: 'A-001', billingCode: 'A001', price: 250.00 }],
        totalAmount: 250.00,
        amountDue: 0.00,
        status: 'Paid',
    },
    {
        invoiceId: 'INV-002',
        patientId: 'P-654321',
        patientName: 'Aba Appiah',
        issueDate: new Date('2024-08-01T18:00:00Z').toISOString(),
        dueDate: new Date('2024-08-31T18:00:00Z').toISOString(),
        billedItems: [{ serviceType: 'Pre-op Assessment', linkedServiceId: 'A-003', billingCode: 'A005', price: 150.00 }],
        totalAmount: 150.00,
        amountDue: 150.00,
        status: 'Pending Payment',
    },
];

export const mockClaims: Claim[] = [
    {
        claimId: 'CLM-001',
        invoiceId: 'INV-001',
        patientId: 'P-123456',
        patientName: 'Kwame Owusu',
        insuranceProviderId: 'NHIS',
        submissionDate: new Date('2024-07-30T10:00:00Z').toISOString(),
        status: 'Paid',
        payoutAmount: 200.00,
    },
    {
        claimId: 'CLM-002',
        invoiceId: 'INV-003', // For an invoice not in the main list for demo
        patientId: 'P-789012',
        patientName: 'Ama Serwaa',
        insuranceProviderId: 'Glico',
        submissionDate: new Date('2024-08-05T11:00:00Z').toISOString(),
        status: 'Denied',
        denialReason: 'Service not covered under policy.',
    },
];

export const mockPayments: FinancialTransaction[] = [
    {
        paymentId: 'PAY-001',
        invoiceId: 'INV-001',
        amount: 200.00,
        paymentMethod: 'Insurance Payout',
        paymentDate: new Date('2024-08-10T14:00:00Z').toISOString(),
        transactionId: 'CLMPAY-555',
    },
    {
        paymentId: 'PAY-002',
        invoiceId: 'INV-001',
        amount: 50.00,
        paymentMethod: 'Mobile Money',
        paymentDate: new Date('2024-08-11T09:00:00Z').toISOString(),
        transactionId: 'MOMO-ABC123',
    },
];

export const mockMedicationRecords: MedicationRecord[] = [
    {
        prescriptionId: 'med-1',
        patientId: 'P-123456',
        patientName: 'Kwame Owusu',
        medicationName: 'Amlodipine',
        dosage: '5mg',
        frequency: 'Once daily',
        instructions: 'Take in the morning with food.',
        prescribedByDoctorId: 'doc1',
        prescribedByDoctorName: 'Dr. Evelyn Mensah',
        prescribedAt: new Date('2024-07-28T11:05:00Z').toISOString(),
        status: 'Active'
    },
    {
        prescriptionId: 'med-2',
        patientId: 'P-123456',
        patientName: 'Kwame Owusu',
        medicationName: 'Atorvastatin',
        dosage: '20mg',
        frequency: 'Once daily at bedtime',
        instructions: '',
        prescribedByDoctorId: 'doc1',
        prescribedByDoctorName: 'Dr. Evelyn Mensah',
        prescribedAt: new Date('2024-07-28T11:05:00Z').toISOString(),
        status: 'Active'
    }
];

