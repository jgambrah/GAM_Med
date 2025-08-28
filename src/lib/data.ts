

import { User, Patient, Appointment, Admission, Bed, Referral, LabResult, ClinicalNote, VitalsLog, CarePlan, MedicationRecord, PatientAlert, ImmunizationRecord, Vaccine, Resource, ResourceBooking, WaitingListEntry, Invoice, Claim, FinancialTransaction, Prescription, PricingTable, Receipt, Bill, Supplier, LedgerAccount, LedgerEntry, StaffExpenseClaim, LeaveRequest, PayrollRun, PayrollRecord, StaffProfile, PayrollConfiguration, Allowance, Deduction, Position, InventoryItem, PharmacyOrder, PrescribedMedication } from './types';

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
    patientType: 'private',
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
    patientType: 'corporate',
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
        interventions: [
            'Daily BP monitoring.',
            'Low sodium diet consultation.',
            'Administer Amlodipine 5mg daily.',
            'Encourage 30 mins of walking daily.'
        ],
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
        interventions: [
            'Monitor vital signs every 4 hours.',
            'Provide information booklet on the procedure.',
            'Administer pre-medication as ordered.'
        ],
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
        doctorId: 'doc1',
        datePrescribed: new Date('2024-07-28T11:05:00Z').toISOString(),
        status: 'Pending',
        medications: [{
            itemId: 'AMX500',
            name: 'Amlodipine',
            dosage: '5mg',
            frequency: 'Once daily',
            duration: 30,
            quantity_to_dispense: 30
        }]
    },
    {
        prescriptionId: 'med-2',
        patientId: 'P-123456',
        patientName: 'Kwame Owusu',
        doctorId: 'doc1',
        datePrescribed: new Date('2024-07-28T11:05:00Z').toISOString(),
        status: 'Pending',
        medications: [{
            itemId: 'ATORV20',
            name: 'Atorvastatin',
            dosage: '20mg',
            frequency: 'Once daily at bedtime',
            duration: 90,
            quantity_to_dispense: 90
        }]
    },
    {
        prescriptionId: 'med-3',
        patientId: 'P-654321',
        patientName: 'Aba Appiah',
        doctorId: 'doc1',
        datePrescribed: new Date('2024-08-01T11:05:00Z').toISOString(),
        status: 'Pending',
        medications: [{
            itemId: 'PARA1G',
            name: 'Paracetamol',
            dosage: '1g',
            frequency: 'PRN for pain',
            duration: 0,
            quantity_to_dispense: 20
        }]
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
        patientType: 'private',
        issueDate: new Date('2024-07-29T18:00:00Z').toISOString(),
        dueDate: new Date('2024-08-28T18:00:00Z').toISOString(),
        billedItems: [{ serviceType: 'Consultation', linkedServiceId: 'A-001', billingCode: 'A001', price: 250.00 }],
        subtotal: 250.00,
        vatOption: 'flat',
        nhia: 0,
        getfund: 0,
        covidLevy: 2.5,
        vat: 7.5,
        totalTax: 10.00,
        grandTotal: 260.00,
        amountDue: 0.00,
        status: 'Paid',
        invoicePdfUrl: '/mock-invoice.pdf',
        receipts: [
            { receiptId: 'REC-001', paymentId: 'PAY-001', amountPaid: 200.00, dateIssued: new Date('2024-08-10T14:00:00Z').toISOString(), issuedByUserId: 'system', documentLink: '/mock-receipt-1.pdf' },
            { receiptId: 'REC-002', paymentId: 'PAY-002', amountPaid: 60.00, dateIssued: new Date('2024-08-11T09:00:00Z').toISOString(), issuedByUserId: 'system', documentLink: '/mock-receipt-2.pdf' }
        ]
    },
    {
        invoiceId: 'INV-002',
        patientId: 'P-654321',
        patientName: 'Aba Appiah',
        patientType: 'corporate',
        issueDate: new Date('2024-08-01T18:00:00Z').toISOString(),
        dueDate: new Date('2024-08-31T18:00:00Z').toISOString(),
        billedItems: [{ serviceType: 'Other', linkedServiceId: 'A-003', billingCode: 'A005', price: 150.00 }],
        subtotal: 150.00,
        vatOption: 'zero',
        nhia: 0,
        getfund: 0,
        covidLevy: 0,
        vat: 0,
        totalTax: 0,
        grandTotal: 150.00,
        amountDue: 150.00,
        status: 'Pending Payment',
    },
     {
        invoiceId: 'INV-003',
        patientId: 'P-123456',
        patientName: 'Kwame Owusu',
        patientType: 'private',
        issueDate: new Date('2024-08-15T18:00:00Z').toISOString(),
        dueDate: new Date('2024-09-14T18:00:00Z').toISOString(),
        billedItems: [
            { serviceType: 'Lab Test', linkedServiceId: 'lab-1', billingCode: 'L001', price: 120.00 }
        ],
        subtotal: 120.00,
        vatOption: 'zero',
        nhia: 0,
        getfund: 0,
        covidLevy: 0,
        vat: 0,
        totalTax: 0,
        grandTotal: 120.00,
        amountDue: 120.00,
        status: 'Overdue',
    },
];

export const mockClaims: Claim[] = [
    {
        claimId: 'CLM-001',
        invoiceId: 'INV-001',
        patientId: 'P-123456',
        patientName: 'Kwame Owusu',
        providerId: 'NHIS',
        submissionDate: new Date('2024-07-30T10:00:00Z').toISOString(),
        status: 'Paid',
        payoutAmount: 200.00,
    },
    {
        claimId: 'CLM-002',
        invoiceId: 'INV-003', // For an invoice not in the main list for demo
        patientId: 'P-789012',
        patientName: 'Ama Serwaa',
        providerId: 'Glico',
        submissionDate: new Date('2024-08-05T11:00:00Z').toISOString(),
        status: 'Denied',
        denialReasonCode: 'SERVICE_NOT_COVERED',
        followUpNotes: [
            {
                note: 'Patient called to inform them service is not covered. They will pay out of pocket.',
                userId: 'billing1',
                date: new Date('2024-08-06T10:00:00Z').toISOString()
            }
        ]
    },
    {
        claimId: 'CLM-003',
        invoiceId: 'INV-002',
        patientId: 'P-654321',
        patientName: 'Aba Appiah',
        providerId: 'Acacia Health',
        submissionDate: new Date('2024-08-02T10:00:00Z').toISOString(),
        status: 'Submitted',
        payoutAmount: 150.00,
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
        amount: 60.00,
        paymentMethod: 'Mobile Money',
        paymentDate: new Date('2024-08-11T09:00:00Z').toISOString(),
        transactionId: 'MOMO-ABC123',
        paymentMethodDetails: {
            gateway: 'MTN Mobile Money',
            phone_number: '+23324xxxx567'
        }
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

export const mockPricingTables: PricingTable[] = [
    {
        pricingId: 'private',
        description: 'Standard rate for private, self-paying patients.',
        rate_card: {
            'A001': 250.00, // Consultation
            'L001': 120.00, // Full Blood Count
            'A005': 150.00  // Other
        }
    },
    {
        pricingId: 'corporate',
        description: 'Discounted rate for patients covered by corporate insurance plans.',
        rate_card: {
            'A001': 200.00,
            'L001': 100.00,
            'A005': 125.00
        }
    },
    {
        pricingId: 'public',
        description: 'Rates for patients covered by national health insurance (NHIS).',
        rate_card: {
            'A001': 50.00,
            'L001': 30.00,
            'A005': 40.00
        }
    }
];

export const mockSuppliers: Supplier[] = [
    {
        supplierId: 'SUP-001',
        name: 'PharmaSupply Ltd.',
        contact: {
            person: 'Grace Tetteh',
            email: 'sales@pharmasupply.com.gh',
            phone: '+233302123456'
        }
    },
    {
        supplierId: 'SUP-002',
        name: 'MedEquip Ghana',
        contact: {
            person: 'David Quartey',
            email: 'info@medequipgh.com',
            phone: '+233302789123'
        }
    }
];

export const mockBills: Bill[] = [
    {
        billId: 'BILL-001',
        supplierId: 'SUP-001',
        issueDate: new Date('2024-07-15T00:00:00Z').toISOString(),
        dueDate: new Date('2024-08-14T00:00:00Z').toISOString(),
        totalAmount: 15200.50,
        status: 'Overdue',
        billedItems: [
            { description: 'Amlodipine 5mg (x1000)', quantity: 10, unitPrice: 500, total: 5000 },
            { description: 'Atorvastatin 20mg (x1000)', quantity: 10, unitPrice: 1020.05, total: 10200.50 }
        ],
        attachmentUrl: '/mock-invoice.pdf'
    },
    {
        billId: 'BILL-002',
        supplierId: 'SUP-002',
        issueDate: new Date('2024-08-01T00:00:00Z').toISOString(),
        dueDate: new Date('2024-08-31T00:00:00Z').toISOString(),
        totalAmount: 7500.00,
        status: 'Pending',
        billedItems: [
            { description: 'Sterile Gauze (Case)', quantity: 50, unitPrice: 150, total: 7500 }
        ],
        attachmentUrl: '/mock-invoice.pdf'
    },
    {
        billId: 'BILL-003',
        supplierId: 'SUP-001',
        issueDate: new Date('2024-06-20T00:00:00Z').toISOString(),
        dueDate: new Date('2024-07-20T00:00:00Z').toISOString(),
        totalAmount: 3400.00,
        status: 'Paid',
        billedItems: [
            { description: 'Syringes 10ml (Box of 100)', quantity: 20, unitPrice: 170, total: 3400 }
        ]
    }
];

export const mockLedgerAccounts: LedgerAccount[] = [
    // Assets
    { accountId: '1000', accountName: 'Assets', accountCode: '1000', accountType: 'Asset', balance: 150000, isSubLedger: false, createdAt: now.toISOString() },
    { accountId: '1010', accountName: 'Cash and Bank', accountCode: '1010', accountType: 'Asset', balance: 50000, isSubLedger: true, parentAccountId: '1000', createdAt: now.toISOString() },
    { accountId: '1020', accountName: 'Accounts Receivable', accountCode: '1020', accountType: 'Asset', balance: 100000, isSubLedger: true, parentAccountId: '1000', createdAt: now.toISOString() },
    // Liabilities
    { accountId: '2000', accountName: 'Liabilities', accountCode: '2000', accountType: 'Liability', balance: 80000, isSubLedger: false, createdAt: now.toISOString() },
    { accountId: '2010', accountName: 'Accounts Payable', accountCode: '2010', accountType: 'Liability', balance: 80000, isSubLedger: true, parentAccountId: '2000', createdAt: now.toISOString() },
    // Equity
    { accountId: '3000', accountName: 'Equity', accountCode: '3000', accountType: 'Equity', balance: 70000, isSubLedger: false, createdAt: now.toISOString() },
    // Revenue
    { accountId: '4000', accountName: 'Revenue', accountCode: '4000', accountType: 'Revenue', balance: 250000, isSubLedger: false, createdAt: now.toISOString() },
    // Expenses
    { accountId: '5000', accountName: 'Expenses', accountCode: '5000', accountType: 'Expense', balance: 180000, isSubLedger: false, createdAt: now.toISOString() },
    { accountId: '5010', accountName: 'Salaries and Wages', accountCode: '5010', accountType: 'Expense', balance: 100000, isSubLedger: true, parentAccountId: '5000', createdAt: now.toISOString() },
    { accountId: '5020', accountName: 'Medical Supplies', accountCode: '5020', accountType: 'Expense', balance: 80000, isSubLedger: true, parentAccountId: '5000', createdAt: now.toISOString() },
    { accountId: '5030', accountName: 'General & Admin', accountCode: '5030', accountType: 'Expense', balance: 0, isSubLedger: true, parentAccountId: '5000', createdAt: now.toISOString() },
];

export const mockLedgerEntries: LedgerEntry[] = [
    { entryId: 'e-001', accountId: '1010', date: new Date('2024-08-01T00:00:00Z').toISOString(), description: 'Cash deposit from patient payment', debit: 5000.00 },
    { entryId: 'e-002', accountId: '1010', date: new Date('2024-08-02T00:00:00Z').toISOString(), description: 'Payment for medical supplies', credit: 2500.00 },
    { entryId: 'e-003', accountId: '2010', date: new Date('2024-08-02T00:00:00Z').toISOString(), description: 'Invoice from PharmaSupply Ltd.', credit: 2500.00 },
    { entryId: 'e-004', accountId: '1020', date: new Date('2024-08-03T00:00:00Z').toISOString(), description: 'Invoice INV-003 issued to patient', debit: 120.00 },
];

export const mockStaffClaims: StaffExpenseClaim[] = [
    {
        claimId: 'SEC-001',
        staffId: 'doc2',
        staffName: 'Dr. Kofi Asante',
        hodId: 'doc1', // Dr. Mensah is the HOD
        claimType: 'Travel',
        amount: 350.00,
        description: 'T&T for conference in Kumasi',
        submissionDate: new Date('2024-08-10T00:00:00Z').toISOString(),
        approvalStatus: 'Approved',
        hodApprovalDate: new Date('2024-08-11T00:00:00Z').toISOString(),
        paymentStatus: 'Unpaid',
        attachmentUrl: '/mock-receipt.pdf'
    },
    {
        claimId: 'SEC-002',
        staffId: 'nurse1',
        staffName: 'Florence Agyepong',
        hodId: 'doc1', // Dr. Mensah is the HOD
        claimType: 'Medical Refund',
        amount: 150.00,
        description: 'Refund for prescribed medication',
        submissionDate: new Date('2024-08-12T00:00:00Z').toISOString(),
        approvalStatus: 'Approved',
        hodApprovalDate: new Date('2024-08-13T00:00:00Z').toISOString(),
        paymentStatus: 'Paid',
        paidDate: new Date('2024-08-15T00:00:00Z').toISOString()
    },
    {
        claimId: 'SEC-003',
        staffId: 'doc2',
        staffName: 'Dr. Kofi Asante',
        hodId: 'doc1', // Dr. Mensah is the HOD
        claimType: 'Other',
        amount: 200.00,
        description: 'Office supplies purchase',
        submissionDate: new Date('2024-08-14T00:00:00Z').toISOString(),
        approvalStatus: 'Pending HOD',
        paymentStatus: 'Unpaid',
        attachmentUrl: '/mock-receipt.pdf'
    }
];

export const mockLeaveRequests: LeaveRequest[] = [
    {
        leaveId: 'LR-001',
        staffId: 'doc2',
        staffName: 'Dr. Kofi Asante',
        hodId: 'doc1',
        startDate: '2024-09-01',
        endDate: '2024-09-07',
        reason: 'Annual Leave',
        status: 'Pending',
        requestedAt: new Date('2024-08-15T00:00:00Z').toISOString(),
    },
     {
        leaveId: 'LR-002',
        staffId: 'nurse1',
        staffName: 'Florence Agyepong',
        hodId: 'doc1',
        startDate: '2024-09-10',
        endDate: '2024-09-12',
        reason: 'Conference Attendance',
        status: 'Pending',
        requestedAt: new Date('2024-08-16T00:00:00Z').toISOString(),
    }
];

export const mockPositions: Position[] = [
  { positionId: 'pos-doc', title: 'Consultant Physician', baseAnnualSalary: 120000 },
  { positionId: 'pos-snr-nurse', title: 'Senior Nurse', baseAnnualSalary: 72000 },
  { positionId: 'pos-jnr-nurse', title: 'Junior Staff Nurse', baseAnnualSalary: 48000 },
  { positionId: 'pos-admin', title: 'Administrator', baseAnnualSalary: 60000 },
];

export const mockStaffProfiles: StaffProfile[] = [
    {
        staffId: 'doc1',
        userId: 'doc1',
        employeeId: 'GAMMED/HR/001',
        firstName: 'Evelyn',
        lastName: 'Mensah',
        gender: 'Female',
        dateOfBirth: '1980-01-01',
        employmentStatus: 'Active',
        positionId: 'pos-doc',
        recurringAllowances: [{ name: 'Book & Research Allowance', amount: 500 }],
        recurringDeductions: [{ name: 'Welfare Dues', amount: 50 }],
        bankDetails: { bankName: 'Fidelity Bank', accountNumber: '123456789', branchName: 'Legon' }
    },
    {
        staffId: 'doc2',
        userId: 'doc2',
        employeeId: 'GAMMED/HR/002',
        firstName: 'Kofi',
        lastName: 'Asante',
        gender: 'Male',
        dateOfBirth: '1982-02-02',
        employmentStatus: 'Active',
        positionId: 'pos-doc',
        recurringAllowances: [{ name: 'Car Maintenance', amount: 300 }],
        recurringDeductions: [{ name: 'Staff Loan', amount: 1000 }, { name: 'Welfare Dues', amount: 50 }],
        bankDetails: { bankName: 'GCB Bank', accountNumber: '987654321', branchName: 'Accra Central' }
    },
    {
        staffId: 'nurse1',
        userId: 'nurse1',
        employeeId: 'GAMMED/HR/003',
        firstName: 'Florence',
        lastName: 'Agyepong',
        gender: 'Female',
        dateOfBirth: '1990-03-03',
        employmentStatus: 'Active',
        positionId: 'pos-snr-nurse',
        recurringAllowances: [],
        recurringDeductions: [{ name: 'Welfare Dues', amount: 30 }],
        bankDetails: { bankName: 'Absa Bank', accountNumber: '555444333', branchName: 'Spintex' }
    }
];


export const mockPayrollRecords: PayrollRecord[] = [
    {
        recordId: 'pr-doc1',
        staffId: 'doc1',
        staffName: 'Dr. Evelyn Mensah',
        grossPay: 12000,
        netPay: 9500,
        taxAmount: 2000,
        deductions: { 'SSNIT': 500 },
        allowances: { 'Car Maintenance': 1000 },
        payslipUrl: '/mock-payslip.pdf'
    },
    {
        recordId: 'pr-nurse1',
        staffId: 'nurse1',
        staffName: 'Florence Agyepong',
        grossPay: 5000,
        netPay: 4200,
        taxAmount: 500,
        deductions: { 'SSNIT': 300 },
        allowances: {},
        payslipUrl: '/mock-payslip.pdf'
    }
]

export const mockPayrollRuns: PayrollRun[] = [
    {
        runId: 'PAY-2024-08',
        payPeriod: 'August 2024',
        payDate: new Date('2024-08-31T00:00:00Z').toISOString(),
        status: 'Completed',
        totalGrossPay: 85000,
        totalDeductions: 12000,
        totalNetPay: 73000,
        totalTaxes: 10000,
        totalEmployees: 15,
        deductionTotals: {},
        initiatedByUserId: 'admin1',
        createdAt: new Date('2024-08-25T10:00:00Z').toISOString(),
        completedAt: new Date('2024-08-28T00:00:00Z').toISOString(),
    },
    {
        runId: 'PAY-2024-07',
        payPeriod: 'July 2024',
        payDate: new Date('2024-07-31T00:00:00Z').toISOString(),
        status: 'Completed',
        totalGrossPay: 84500,
        totalDeductions: 11800,
        totalNetPay: 72700,
        totalTaxes: 9800,
        totalEmployees: 15,
        deductionTotals: {},
        initiatedByUserId: 'admin1',
        createdAt: new Date('2024-07-25T10:00:00Z').toISOString(),
        completedAt: new Date('2024-07-28T00:00:00Z').toISOString(),
    }
];

export const mockPayrollConfig: PayrollConfiguration = {
    ssnitEmployeeContribution: 0.055,
    ssnitEmployerContribution: 0.13,
    tier2EmployerContribution: 0.05,
    ssnitCeiling: 42000, // GHS per annum
    taxBands: [
        { limit: 5880, rate: 0.0 },       // First 5,880
        { limit: 7200, rate: 0.05 },      // Next 1,320
        { limit: 8880, rate: 0.10 },      // Next 1,680
        { limit: 44880, rate: 0.175 },    // Next 36,000
        { limit: 244880, rate: 0.25 },   // Next 200,000
        { limit: 644880, rate: 0.30 },   // Next 400,000
        { limit: Infinity, rate: 0.35 }    // Above 644,880
    ]
};

export const mockAllowances: Allowance[] = [
    {
        allowanceId: 'RENT_ALLOWANCE',
        name: 'Rent Allowance',
        isTaxable: true,
    },
    {
        allowanceId: 'TRANSPORT_ALLOWANCE',
        name: 'Transport Allowance',
        isTaxable: false,
    },
    {
        allowanceId: 'BOOK_RESEARCH_ALLOWANCE',
        name: 'Book & Research Allowance',
        isTaxable: false,
    }
];

export const mockDeductions: Deduction[] = [
    {
        id: 'STAFF_LOAN',
        name: 'Staff Loan',
    },
    {
        id: 'WELFARE_DUES',
        name: 'Welfare Dues',
    }
];

export const mockInventory: InventoryItem[] = [
    {
        itemId: 'AMX500',
        name: 'Amoxicillin 500mg',
        type: 'Medication',
        unit: 'box',
        currentQuantity: 50,
        totalQuantity: 50,
        reorderLevel: 20,
        expiryDate: new Date('2025-12-31T00:00:00Z').toISOString(),
        supplierId: 'SUP-001',
        location: 'Main Pharmacy, Shelf A'
    },
    {
        itemId: 'PARA1G',
        name: 'Paracetamol 1g',
        type: 'Medication',
        unit: 'box',
        currentQuantity: 15, // Low Stock
        totalQuantity: 15,
        reorderLevel: 25,
        expiryDate: new Date('2026-06-30T00:00:00Z').toISOString(),
        supplierId: 'SUP-001',
        location: 'Main Pharmacy, Shelf B'
    },
    {
        itemId: 'GAUZE',
        name: 'Sterile Gauze',
        type: 'Surgical Supply',
        unit: 'case',
        currentQuantity: 40,
        totalQuantity: 40,
        reorderLevel: 50,
        expiryDate: new Date('2024-09-10T00:00:00Z').toISOString(), // Expiring Soon
        supplierId: 'SUP-002',
        location: 'Storage Room B'
    },
    {
        itemId: 'SYRINGE10',
        name: 'Syringe 10ml',
        type: 'Surgical Supply',
        unit: 'box',
        currentQuantity: 200,
        totalQuantity: 200,
        reorderLevel: 100,
        expiryDate: new Date('2024-07-31T00:00:00Z').toISOString(), // Expired
        supplierId: 'SUP-002',
        location: 'Storage Room A'
    }
];
