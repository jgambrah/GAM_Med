

import { User, Patient, Appointment, Admission, Bed, Referral, LabResult, ClinicalNote, VitalsLog, CarePlan, MedicationRecord, PatientAlert, ImmunizationRecord, Vaccine, Resource, ResourceBooking, WaitingListEntry, Invoice, Claim, FinancialTransaction, Prescription, PricingTable, Receipt, Bill, Supplier, LedgerAccount, LedgerEntry, StaffExpenseClaim, LeaveRequest, PayrollRun, PayrollRecord, StaffProfile, PayrollConfiguration, Allowance, Deduction, Position, InventoryItem, PurchaseOrder, PrescribedMedication, ControlledSubstance, ControlledSubstanceLog, LabTest, SampleAudit, EquipmentLog, LabReport } from './types';

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

export const mockLabTestCatalog: LabTest[] = [
    { testId: 'FBC', name: 'Full Blood Count', description: '', sampleType: 'Blood', turnaroundTime: '24 hours', price: 120 },
    { testId: 'LP', name: 'Lipid Panel', description: '', sampleType: 'Blood', turnaroundTime: '48 hours', price: 200 },
    { testId: 'LFT', name: 'Liver Function Test', description: '', sampleType: 'Blood', turnaroundTime: '24 hours', price: 150 },
    { testId: 'TP', name: 'Thyroid Panel', description: '', sampleType: 'Blood', turnaroundTime: '72 hours', price: 250 },
];

export const mockLabResults: LabResult[] = [
    {
        testId: 'lab-1',
        patientId: 'P-123456',
        patientName: 'Kwame Owusu',
        testName: 'Full Blood Count',
        status: 'Validated',
        resultDetails: { 'Hemoglobin': { value: '14.5 g/dL', unit: 'g/dL', isAbnormal: false }, 'WBC': { value: '7.2 x 10^9/L', unit: 'x 10^9/L', isAbnormal: false } },
        orderedByDoctorId: 'doc1',
        labTechnicianId: 'labtech1',
        orderedAt: new Date('2024-07-28T12:00:00Z').toISOString(),
        completedAt: new Date('2024-07-28T16:00:00Z').toISOString(),
        isBilled: false,
        isAbnormal: false,
        turnaroundTime: 4,
        resultPdfUrl: '/mock-lab-result.pdf',
        sampleDetails: {
            barcode: 'SAMPLE-001',
            collectionDate: new Date('2024-07-28T12:05:00Z').toISOString(),
            collectedByUserId: 'nurse1',
            sampleStatus: 'Received in Lab',
            auditLog: [
                { auditId: 'aud-1-1', timestamp: new Date('2024-07-28T12:05:00Z').toISOString(), action: 'Collected', location: 'Ward C', userId: 'nurse1' },
                { auditId: 'aud-1-2', timestamp: new Date('2024-07-28T12:15:00Z').toISOString(), action: 'Received in Lab', location: 'Lab Reception', userId: 'labtech1' }
            ]
        }
    },
    {
        testId: 'lab-2',
        patientId: 'P-654321',
        patientName: 'Aba Appiah',
        testName: 'Lipid Panel',
        status: 'Ordered',
        orderedByDoctorId: 'doc1',
        orderedAt: new Date('2024-07-29T10:00:00Z').toISOString(),
        isBilled: false,
        sampleDetails: {
            barcode: 'SAMPLE-002',
            collectionDate: new Date('2024-07-29T10:05:00Z').toISOString(),
            collectedByUserId: 'nurse1',
            sampleStatus: 'Collected',
             auditLog: [
                { auditId: 'aud-2-1', timestamp: new Date('2024-07-29T10:05:00Z').toISOString(), action: 'Collected', location: 'Ward GW', userId: 'nurse1' },
            ]
        }
    },
     {
        testId: 'lab-3',
        patientId: 'P-123456',
        patientName: 'Kwame Owusu',
        testName: 'Thyroid Panel',
        status: 'In Progress',
        orderedByDoctorId: 'doc1',
        labTechnicianId: 'labtech1',
        orderedAt: new Date('2024-07-30T10:00:00Z').toISOString(),
        isBilled: false,
    },
     {
        testId: 'lab-4',
        patientId: 'P-123456',
        patientName: 'Aba Appiah',
        testName: 'Liver Function Test',
        status: 'Draft',
        orderedByDoctorId: 'doc1',
        labTechnicianId: 'labtech1',
        orderedAt: new Date('2024-08-15T10:00:00Z').toISOString(),
        resultDetails: { 'ALT': { value: 80, unit: 'U/L', isAbnormal: true } },
        isAbnormal: true,
        isBilled: false,
    }
];

export const mockEquipmentLogs: EquipmentLog[] = [
    {
        logId: 'log-xyz-1',
        equipmentId: 'HematologyAnalyzer-001',
        barcodeScanned: 'SAMPLE-001',
        rawData: { hgb: 14.5, wbc: 7.2 },
        timestamp: new Date('2024-07-28T12:10:00Z').toISOString(),
        isProcessed: true,
    },
    {
        logId: 'log-abc-2',
        equipmentId: 'ChemistryAnalyzer-002',
        barcodeScanned: 'SAMPLE-003',
        rawData: { glucose: 105, cholesterol: 198 },
        timestamp: new Date('2024-08-16T09:30:00Z').toISOString(),
        isProcessed: false,
        error: 'No matching order found for barcode.'
    },
     {
        logId: 'log-def-3',
        equipmentId: 'HematologyAnalyzer-001',
        barcodeScanned: 'SAMPLE-002',
        rawData: { hgb: 13.1, wbc: 6.5 },
        timestamp: new Date('2024-08-16T10:00:00Z').toISOString(),
        isProcessed: false,
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
        isDispensed: false,
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
        isDispensed: false,
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
        isDispensed: false,
        medications: [{
            itemId: 'PARA1G',
            name: 'Paracetamol',
            dosage: '1g',
            frequency: 'PRN for pain',
            duration: 0,
            quantity_to_dispense: 20
        }]
    },
    {
        prescriptionId: 'med-4',
        patientId: 'P-123456',
        patientName: 'Kwame Owusu',
        doctorId: 'doc1',
        datePrescribed: new Date('2024-08-16T09:00:00Z').toISOString(),
        status: 'Pending',
        isDispensed: false,
        medications: [{
            itemId: 'PEN500', // A fictional Item ID for Penicillin
            name: 'Penicillin',
            dosage: '500mg',
            frequency: 'QID',
            duration: 7,
            quantity_to_dispense: 28
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
            'A005': 150.00,  // Other
            'AMX500': 50.00,
            'PARA1G': 20.00
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
        contactInfo: { 
            person: 'Grace Tetteh',
            email: 'sales@pharmasupply.com.gh',
            phone: '+233302123456',
            address: '123 Industrial Area, Accra'
        },
        paymentTerms: 'Net 30'
    },
    {
        supplierId: 'SUP-002',
        name: 'MedEquip Ghana',
        contactInfo: { 
            person: 'David Quartey',
            email: 'info@medequipgh.com',
            phone: '+233302789123',
            address: '456 Spintex, Tema'
        },
        paymentTerms: 'Cash on Delivery'
    },
    {
        supplierId: 'SUP-003',
        name: 'General Medical Supplies',
        contactInfo: {
            person: 'Esther Baah',
            email: 'contact@generalmed.com',
            phone: '+233201112233',
            address: 'Accra Central'
        },
        paymentTerms: 'Net 60'
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
        reorderLevel: 20,
        isAutoReorder: true,
        batches: [
            { batchNumber: 'B1001', currentQuantity: 20, expiryDate: new Date('2025-12-31T00:00:00Z').toISOString(), dateReceived: new Date('2024-01-01T00:00:00Z').toISOString() },
            { batchNumber: 'B1002', currentQuantity: 30, expiryDate: new Date('2026-06-30T00:00:00Z').toISOString(), dateReceived: new Date('2024-07-01T00:00:00Z').toISOString() }
        ],
        supplierId: 'SUP-001',
        location: 'Main Pharmacy, Shelf A'
    },
    {
        itemId: 'PEN500',
        name: 'Penicillin 500mg',
        type: 'Medication',
        unit: 'box',
        currentQuantity: 40,
        reorderLevel: 20,
        isAutoReorder: true,
        batches: [
            { batchNumber: 'B5001', currentQuantity: 40, expiryDate: new Date('2025-10-31T00:00:00Z').toISOString(), dateReceived: new Date('2024-02-01T00:00:00Z').toISOString() },
        ],
        supplierId: 'SUP-001',
        location: 'Main Pharmacy, Shelf C'
    },
    {
        itemId: 'PARA1G',
        name: 'Paracetamol 1g',
        type: 'Medication',
        unit: 'box',
        currentQuantity: 15, // Low Stock
        reorderLevel: 25,
        isAutoReorder: true,
        batches: [
            { batchNumber: 'B2001', currentQuantity: 15, expiryDate: new Date('2026-06-30T00:00:00Z').toISOString(), dateReceived: new Date('2024-07-01T00:00:00Z').toISOString() }
        ],
        supplierId: 'SUP-001',
        location: 'Main Pharmacy, Shelf B'
    },
    {
        itemId: 'GAUZE',
        name: 'Sterile Gauze',
        type: 'Surgical Supply',
        unit: 'case',
        currentQuantity: 40,
        reorderLevel: 50,
        isAutoReorder: false,
        batches: [
             { batchNumber: 'B3001', currentQuantity: 40, expiryDate: new Date('2024-09-10T00:00:00Z').toISOString(), dateReceived: new Date('2024-01-01T00:00:00Z').toISOString() }
        ],
        supplierId: 'SUP-002',
        location: 'Storage Room B'
    },
    {
        itemId: 'SYRINGE10',
        name: 'Syringe 10ml',
        type: 'Surgical Supply',
        unit: 'box',
        currentQuantity: 200,
        reorderLevel: 100,
        isAutoReorder: false,
        batches: [
            { batchNumber: 'B4001', currentQuantity: 200, expiryDate: new Date('2024-07-31T00:00:00Z').toISOString(), dateReceived: new Date('2023-08-01T00:00:00Z').toISOString() }
        ],
        supplierId: 'SUP-002',
        location: 'Storage Room A'
    }
];

export const mockPurchaseOrders: PurchaseOrder[] = [
     {
        poId: 'PO-001',
        dateOrdered: new Date('2024-08-10T10:00:00Z').toISOString(),
        status: 'Received',
        orderedByUserId: 'pharma1',
        supplierId: 'SUP-001',
        orderedItems: [{ itemId: 'AMX500', name: 'Amoxicillin 500mg', quantity: 100, unit_cost: 0.50 }],
        totalAmount: 50.00
    },
    {
        poId: 'PO-002',
        dateOrdered: new Date('2024-08-15T14:30:00Z').toISOString(),
        status: 'Submitted',
        orderedByUserId: 'pharma1',
        supplierId: 'SUP-002',
        orderedItems: [{ itemId: 'GAUZE', name: 'Sterile Gauze', quantity: 50, unit_cost: 10.00 }],
        totalAmount: 500.00
    }
];

export const mockControlledSubstances: ControlledSubstance[] = [
    {
        substanceId: 'FENT100MCG',
        name: 'Fentanyl Citrate',
        strength: '100mcg/2ml',
        form: 'Injection',
        unit: 'vial',
        totalQuantity: 50,
        reorderLevel: 20
    },
    {
        substanceId: 'OXY10MG',
        name: 'Oxycodone HCl',
        strength: '10mg',
        form: 'Tablet',
        unit: 'tablet',
        totalQuantity: 250,
        reorderLevel: 100
    }
];

export const mockControlledSubstanceLog: ControlledSubstanceLog[] = [
    {
        logId: 'log-1',
        substanceId: 'FENT100MCG',
        transactionType: 'Dispense',
        quantityChange: -1,
        currentQuantity: 50,
        date: new Date('2024-08-15T10:00:00Z').toISOString(),
        userId: 'pharma1',
        patientId: 'P-123456',
        reason: 'Pre-operative sedation for patient Kwame Owusu',
        witnessId: 'nurse1'
    },
    {
        logId: 'log-2',
        substanceId: 'FENT100MCG',
        transactionType: 'Restock',
        quantityChange: 10,
        currentQuantity: 51,
        date: new Date('2024-08-10T09:00:00Z').toISOString(),
        userId: 'pharma1',
        reason: 'New shipment received from PharmaSupply Ltd. PO-123.'
    }
];

// Mock data for lab reports
export const mockLabReports: LabReport[] = [
  {
    reportId: 'rep-2024-08-15',
    date: '2024-08-15',
    testVolumes: [
      { testName: 'Full Blood Count', volume: 120 },
      { testName: 'Lipid Panel', volume: 85 },
      { testName: 'Liver Function Test', volume: 95 },
      { testName: 'Thyroid Panel', volume: 40 },
    ],
    turnaroundTimes: [
      { testName: 'Full Blood Count', avgTAT: 3.5 },
      { testName: 'Lipid Panel', avgTAT: 6.2 },
      { testName: 'Liver Function Test', avgTAT: 4.1 },
    ],
    abnormalResultTrends: [
      { testName: 'Liver Function Test', abnormalPercentage: 15 },
      { testName: 'Lipid Panel', abnormalPercentage: 12 },
      { testName: 'Full Blood Count', abnormalPercentage: 8 },
    ],
  },
];

// Deprecated type, use PurchaseOrder instead
export type PharmacyOrder = PurchaseOrder;








```
  </change>
  <change>
    <file>src/lib/types.ts</file>
    <content><![CDATA[

/**
 * @fileoverview This file defines the core data structures (TypeScript types) for the GamMed ERP system.
 * Each type corresponds to a data model for a Firestore collection, serving as the single source of truth for the application's data architecture.
 * This ensures consistency between the frontend components and the backend database.
 */

// =========================================================================
// == Laboratory Information System (LIS)
// =========================================================================

/**
 * Represents a single available test in the central lab test catalog.
 * Path: /lab_tests/{testId}
 */
export interface LabTest {
  testId: string; // Document ID (e.g., 'CBC', 'GLU-F')
  name: string; // e.g., 'Complete Blood Count'
  description: string;
  sampleType: 'Blood' | 'Urine' | 'Stool' | 'Saliva' | 'Tissue';
  turnaroundTime: string; // e.g., '24 hours', '3-5 days'
  price: number;
  referenceRanges?: Record<string, { min: number; max: number }>; // e.g., { "male_adult": { "min": 4.5, "max": 11.0 } }
}

/**
 * Represents a request for one or more lab tests made by a doctor.
 * Path: /lab_orders/{orderId}
 */
export interface LabOrder {
  orderId: string; // Document ID
  patientId: string; // Reference to patients
  doctorId: string; // Reference to users
  dateOrdered: string; // ISO Timestamp
  testIds: string[]; // Array of references to lab_tests
  status: 'Pending Sample' | 'In Progress' | 'Completed' | 'Canceled';
  billingStatus?: 'Billed' | 'Unbilled';
  notes?: string; // Optional field for specific instructions
  sampleDetails?: {
    barcode: string;
    collectionDate: string; // ISO Timestamp
    collectedByUserId: string;
    sampleStatus: 'Collected' | 'In Transit' | 'Received in Lab';
  };
}

/**
 * Represents a single audit entry for a lab sample's journey.
 * Path: /lab_orders/{orderId}/sample_audit/{auditId}
 */
export interface SampleAudit {
    auditId: string;
    timestamp: string; // ISO Timestamp
    action: string; // e.g., 'Scanned in Ward', 'Received at Lab'
    location: string; // e.g., 'Ward A', 'Lab Reception'
    userId: string;
}

/**
 * Represents the final results for a completed lab order.
 * This is the new, more structured model for lab results.
 * Path: /lab_results/{resultId}
 */
export interface LabResult {
  resultId?: string; // Document ID (could be the same as orderId)
  orderId?: string; // Reference to lab_orders
  testId: string; // Document ID
  patientId: string; // Denormalized for easier querying
  patientName?: string; // Denormalized
  testName: string; // Denormalized
  status: 'Ordered' | 'In Progress' | 'Completed' | 'Cancelled' | 'Draft' | 'Validated' | 'Final';
  resultDetails?: Record<string, { value: string | number; unit: string; isAbnormal: boolean }>; // Key-value pairs for test results.
  orderedByDoctorId?: string; // Denormalized
  labTechnicianId?: string; // Denormalized
  orderedAt: string; // ISO Timestamp
  completedAt?: string; // ISO Timestamp
  validatedBy?: string; // UID of supervisor who validated
  validationNotes?: string; // Optional comments from supervisor
  isBilled: boolean; // Flag to prevent duplicate billing
  resultPdfUrl?: string; // Optional URL to a PDF in Firebase Storage
  turnaroundTime?: number; // In hours, for reporting
  isAbnormal?: boolean; // Top-level flag for quick filtering of abnormal results
  sampleDetails?: {
    barcode: string;
    collectionDate: string; // ISO Timestamp
    collectedByUserId: string;
    sampleStatus: 'Collected' | 'In Transit' | 'Received in Lab';
    auditLog?: SampleAudit[]; // For mock data simplicity
  };
}

/**
 * Represents a raw data entry from an integrated piece of lab equipment.
 * This collection acts as a staging area before data is processed and validated.
 * Path: /equipment_logs/{logId}
 */
export interface EquipmentLog {
  logId: string; // Document ID
  equipmentId: string; // Identifier for the physical lab machine
  barcodeScanned: string; // The patient sample barcode scanned by the machine
  rawData: Record<string, any>; // The raw JSON or key-value output from the equipment
  timestamp: string; // ISO Timestamp when the data was received from the equipment
  isProcessed: boolean; // Flag to indicate if this log has been processed into a formal lab_result
  error?: string; // Optional field to store processing errors
}


// =========================================================================
// == Narcotics & Controlled Substance Tracking
// =========================================================================

/**
 * Represents a single controlled substance in a dedicated, secure inventory.
 * Path: /controlled_substances/{substanceId}
 */
export interface ControlledSubstance {
  substanceId: string; // Document ID
  name: string; // e.g., 'Fentanyl', 'Oxycodone'
  strength: string; // e.g., '100mcg/2ml'
  form: 'Tablet' | 'Injection' | 'Patch' | 'Liquid';
  unit: 'vial' | 'tablet' | 'patch' | 'bottle' | 'ampule'; // Made more specific
  totalQuantity: number;
  reorderLevel: number;
}

/**
 * Represents a single, immutable transaction in the controlled substance log.
 * This collection serves as a real-time ledger for auditing.
 * Path: /controlled_substance_log/{logId}
 */
export interface ControlledSubstanceLog {
  logId: string; // Document ID
  substanceId: string; // Reference to controlled_substances
  transactionType: 'Dispense' | 'Restock' | 'Waste' | 'Audit' | 'Adjustment';
  quantityChange: number; // Negative for dispense/waste, positive for restock
  currentQuantity: number; // The stock level *after* this transaction
  date: string; // ISO Timestamp
  userId: string; // UID of the user performing the transaction
  patientId?: string; // Optional: Link to patient for dispensing
  reason: string; // Required for every transaction
  witnessId?: string; // Optional: UID of a witness, required for waste/audits
}


// =========================================================================
// == Pharmacy & Inventory Management Data Models
// =========================================================================

/**
 * Represents a single transaction within an inventory item's sub-collection.
 * This creates an audit trail for every change in stock quantity.
 * Path: /inventory/{itemId}/transactions/{transactionId}
 */
export interface InventoryTransaction {
  transactionId: string; // Document ID
  batchNumber?: string; // The batch number that was affected
  type: 'Dispense' | 'Restock' | 'Waste' | 'Adjustment';
  quantityChange: number; // Negative for dispense/waste, positive for restock
  date: string; // ISO Timestamp
  userId: string; // UID of the user who performed the action
  reason: string; // e.g., 'Patient Prescription #123', 'New Shipment from Supplier X'
}


/**
 * Represents a single item in the master inventory catalog.
 * Path: /inventory/{itemId}
 */
export interface InventoryItem {
  itemId: string; // Document ID
  name: string; // e.g., 'Amoxicillin 500mg'
  type: 'Medication' | 'Surgical Supply' | 'Vaccine' | 'General' | 'Surgical Instrument' | 'Disposable';
  unit: string; // e.g. 'box', 'bottle'
  currentQuantity: number; // The real-time stock count across all batches
  reorderLevel: number; // The minimum quantity that triggers a reorder alert.
  isAutoReorder?: boolean; // Flag to indicate if the item should be automatically reordered.
  location: string; // e.g., 'Pharmacy', 'OR Storage', 'Ward A'
  supplierId?: string; // Optional reference to a supplier
  batches?: {
    batchNumber: string;
    currentQuantity: number;
    expiryDate: string; // ISO Timestamp
    dateReceived: string; // ISO Timestamp
  }[];
}

/**
 * Represents a single line item within a purchase order.
 */
export interface PurchaseOrderItem {
  itemId: string;
  name: string;
  quantity: number;
  unit_cost: number;
}

/**
 * Represents a purchase order for medications and supplies.
 * Path: /purchase_orders/{poId}
 */
export interface PurchaseOrder {
  poId: string; // Document ID
  supplierId: string; // Reference to suppliers
  dateOrdered: string; // ISO Timestamp
  deliveryDate?: string; // ISO Timestamp (expected)
  status: 'Pending' | 'Submitted' | 'Shipped' | 'Received' | 'Canceled';
  orderedItems: PurchaseOrderItem[];
  totalAmount: number;
  orderedByUserId: string; // Reference to users
}

/**
 * Represents a request for new stock, which can be manual or automated.
 * Path: /reorder_requests/{requestId}
 */
export interface ReorderRequest {
    requestId: string;
    itemId: string;
    requestType: 'Automatic' | 'Manual';
    quantityToOrder: number;
    status: 'Pending' | 'In Progress' | 'Completed';
    dateCreated: string; // ISO Timestamp
}

/**
 * Represents a record of items received from a supplier.
 * Path: /goods_receipts/{receiptId}
 */
export interface GoodsReceipt {
  receiptId: string; // Document ID
  poId: string; // Reference to purchase_orders
  dateReceived: string; // ISO Timestamp
  receivedByUserId: string; // Reference to users
  receivedItems: {
    itemId: string;
    quantityReceived: number;
    batchNumber: string;
    expiryDate: string; // ISO Timestamp
  }[];
}


// =========================================================================
// == Accounting & Ledger Data Models
// =========================================================================

/**
 * Represents a single account in the Chart of Accounts.
 * This is a central ledger for financial tracking.
 */
export interface LedgerAccount {
  accountId: string; // Document ID
  accountName: string; // e.g., 'Cash and Bank', 'Salaries Expense'
  accountCode: string; // e.g., '1010', '5010'
  accountType: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  balance: number;
  isSubLedger: boolean;
  parentAccountId?: string | null; // ID of the parent ledger if this is a sub-ledger
  createdAt: string; // ISO Timestamp
}

/**
 * Represents a single transaction entry in a ledger.
 */
export interface LedgerEntry {
  entryId: string;
  accountId: string;
  date: string; // ISO Timestamp
  description: string;
  debit?: number;
  credit?: number;
}


// =========================================================================
// == Billing & Financial Management Data Models
// =========================================================================

/**
 * Represents a single line item on an invoice.
 * This allows for detailed, itemized billing.
 */
export interface InvoiceLineItem {
  serviceType: 'Consultation' | 'Lab Test' | 'Medication' | 'Procedure' | 'Other' | 'Supply'; 
  linkedServiceId: string; // The ID of the original service document (e.g., appointmentId, labResultId)
  billingCode: string; // The billing code, e.g., 'A001'
  price: number;
}

/**
 * Represents an invoice in the central 'invoices' collection.
 * This is the primary document for patient billing.
 */
export interface Invoice {
  invoiceId: string; // Document ID, e.g., INV-00123
  patientId: string; // Reference to 'patients' collection
  patientName: string; // Denormalized for display
  patientType: string; // e.g., 'private', 'corporate'. Denormalized for audit.
  issueDate: string; // ISO Timestamp
  dueDate: string; // ISO Timestamp
  billedItems: InvoiceLineItem[];
  subtotal: number;
  vatOption: 'zero' | 'flat' | 'standard';
  vat: number;
  nhia: number;
  getfund: number;
  covidLevy: number;
  totalTax: number;
  grandTotal: number;
  amountDue: number;
  status: 'Draft' | 'Pending Payment' | 'Paid' | 'Partially Paid' | 'Overdue' | 'Void';
  invoicePdfUrl?: string; // Optional URL to the generated PDF in Firebase Storage
  receipts?: Receipt[]; // Nested for mock data simplicity
}

/**
 * Represents a single financial transaction in the 'payments' collection.
 * This logs all payments received.
 */
export interface FinancialTransaction {
  paymentId: string; // Document ID
  invoiceId: string; // Reference to 'invoices' collection
  amount: number;
  paymentMethod: 'Credit Card' | 'Insurance Payout' | 'Cash' | 'Mobile Money';
  paymentDate: string; // ISO Timestamp
  transactionId?: string; // Optional ID from a payment gateway
  paymentMethodDetails?: Record<string, any>; // Flexible map for gateway-specific data
}

/**
 * Represents a receipt for a payment in the invoice's sub-collection.
 * Path: /invoices/{invoiceId}/receipts/{receiptId}
 */
export interface Receipt {
  receiptId: string; // Document ID
  paymentId: string; // Reference to the 'payments' collection document
  amountPaid: number;
  dateIssued: string; // ISO Timestamp
  issuedByUserId: string; // UID of user/system that generated it
  documentLink: string; // URL to the stored PDF in Firebase Storage
}


/**
 * Represents a follow-up action taken on a denied or pending claim.
 */
export interface FollowUpNote {
    note: string;
    userId: string; // UID of the user who made the note
    date: string; // ISO Timestamp
}

/**
 * Represents an insurance claim in the 'insurance_claims' collection.
 * This tracks the lifecycle of a claim submitted to an insurance provider.
 */
export interface Claim {
  claimId: string; // Document ID
  invoiceId: string; // Reference to the related invoice
  patientId: string; // Reference to 'patients' collection
  patientName: string; // Denormalized for display
  providerId: string; // Reference to 'insurance_providers' collection
  submissionDate: string; // ISO Timestamp
  submissionMethod?: 'API' | 'Manual';
  claimNumber?: string; // Number provided by the insurance provider's API upon submission
  status: 'Ready for Submission' | 'Submitted' | 'Pending' | 'Paid' | 'Denied';
  payoutAmount?: number;
  denialReasonCode?: string; // Optional code for why a claim was denied
  followUpNotes?: FollowUpNote[]; // Array to log actions on rejected claims
}

/**
 * Represents a single billable service or item in the 'billing_codes' collection.
 */
export interface BillingCode {
    codeId: string; // e.g. 'A001'
    description: string; // e.g., 'Standard Consultation'
    price: number; // This is now the default/base price
}

/**
 * Represents a pricing table in the 'pricing_tables' collection.
 * This stores different rate cards for different patient types.
 */
export interface PricingTable {
  pricingId: string; // e.g., 'private', 'corporate', 'public'
  description: string;
  rate_card: Record<string, number>; // Key is billingCode, value is price
}

/**
 * Represents an insurance provider in the central 'insurance_providers' collection.
 * This is a catalog of all supported insurance companies.
 */
export interface InsuranceProvider {
  providerId: string; // Document ID
  name: string; // e.g., 'Aetna', 'Blue Cross Blue Shield', 'NHIS'
  contact: {
    phone?: string;
    email?: string;
    address?: string;
  };
  api_endpoints?: {
    claims_submission: string;
    status_check: string;
  };
  supported_services: ('Medical' | 'Dental' | 'Vision')[];
}

/**
 * Represents a payment gateway configuration in the 'payment_gateways' collection.
 */
export interface PaymentGateway {
  gatewayId: string; // e.g., 'stripe', 'mtn_momo'
  name: string; // e.g., 'Stripe', 'MTN Mobile Money'
  api_config: Record<string, any>; // Stores API keys, endpoints, etc.
  supported_methods: ('credit_card' | 'mobile_money')[];
  country_codes: string[]; // e.g., ['GH', 'NG']
}


// =========================================================================
// == Accounts Payable Data Models
// =========================================================================

/**
 * Represents a supplier or vendor.
 */
export interface Supplier {
  supplierId: string; // Document ID
  name: string;
  contactInfo: {
    person: string;
    email: string;
    phone: string;
    address: string;
  };
  contractDetails?: {
    contractNumber: string;
    expirationDate: string; // ISO Timestamp
  };
  paymentTerms?: 'Net 30' | 'Net 60' | 'Cash on Delivery';
  supportedItems?: ('Medication' | 'Surgical Supply' | 'General')[];
}

/**
 * Represents a single line item on an incoming bill.
 */
export interface BillLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

/**
 * Represents an incoming bill from a supplier in the 'bills' collection.
 */
export interface Bill {
  billId: string; // Document ID
  supplierId: string; // Reference to 'suppliers' collection
  issueDate: string; // ISO Timestamp
  dueDate: string; // ISO Timestamp
  totalAmount: number;
  status: 'Pending' | 'Paid' | 'Partially Paid' | 'Overdue';
  billedItems: BillLineItem[];
  withholdingTaxRate?: number; // Optional field for WHT rate
  attachmentUrl?: string; // URL to the scanned invoice PDF
}

/**
 * Represents an operational expense in the 'expenses' collection.
 */
export interface Expense {
  expenseId: string; // Document ID
  type: 'Rent' | 'Payroll' | 'Utilities' | 'Supplies' | 'Other';
  description: string;
  amount: number;
  date: string; // ISO Timestamp
}

/**
 * Represents a staff expense claim.
 */
export interface StaffExpenseClaim {
  claimId: string;
  staffId: string;
  staffName: string;
  hodId?: string; // Head of Department ID for approval
  claimType: 'Travel' | 'Per Diem' | 'Medical Refund' | 'Other';
  amount: number;
  description: string;
  submissionDate: string; // ISO Timestamp
  approvalStatus: 'Pending HOD' | 'Approved' | 'Rejected';
  hodApprovalDate?: string; // ISO Timestamp
  paymentStatus: 'Unpaid' | 'Paid';
  paidDate?: string; // ISO Timestamp
  attachmentUrl?: string; // URL to the receipt/document
}

/**
 * Represents a staff leave request.
 */
export interface LeaveRequest {
  leaveId: string;
  staffId: string;
  staffName: string;
  hodId?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestedAt: string; // ISO Timestamp
}

// =========================================================================
// == Payroll Management Data Models
// =========================================================================

/**
 * Represents a configurable allowance type.
 */
export interface Allowance {
  allowanceId: string; // Document ID, e.g., 'RENT_ALLOWANCE'
  name: string; // e.g., "Rent Allowance"
  isTaxable: boolean; // Determines if the allowance amount contributes to taxable income
}

/**
 * Represents a configurable non-statutory deduction type.
 */
export interface Deduction {
    id: string;
    name: string;
}

/**
 * Represents a job position or role within the organization.
 */
export interface Position {
  positionId: string; // Document ID
  title: string; // e.g., "Senior Nurse", "Consultant Physician"
  baseAnnualSalary: number;
}

/**
 * Represents a comprehensive HR record for a staff member.
 * This is the central source of truth for all HR and payroll calculations.
 */
export interface StaffProfile {
  staffId: string; // Document ID, should match user ID
  userId: string; // Link to the 'users' collection (Firebase Auth UID)
  employeeId: string; // e.g., "GAMMED/HR/001"
  firstName: string;
  lastName: string;
  gender: 'Male' | 'Female' | 'Other';
  dateOfBirth: string; // ISO Timestamp
  employmentStatus: 'Active' | 'On Leave' | 'Terminated';
  positionId: string; // Link to the 'positions' collection
  recurringAllowances: { name: string; amount: number }[];
  recurringDeductions: { name: string; amount: number }[];
  bankDetails: { bankName: string; accountNumber: string; branchName: string }
}

/**
 * Represents a single, finalized payroll run for a specific period.
 * Path: /payroll_runs/{runId}
 */
export interface PayrollRun {
  runId: string; // e.g., PAY-2024-08
  payPeriod: string; // e.g., "August 2024"
  payDate: string; // ISO Timestamp
  status: 'Processing' | 'Review' | 'Completed' | 'Posted';
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  totalTaxes: number;
  totalEmployees: number;
  deductionTotals: Record<string, number>; // Breakdown of all deduction amounts for remittance
  initiatedByUserId: string;
  createdAt: string; // ISO Timestamp
  completedAt?: string; // ISO Timestamp
  postedAt?: string; // ISO Timestamp
}

/**
 * Represents the detailed payroll calculation for a single employee within a run.
 * Path: /payroll_runs/{runId}/payroll_records/{staffId}
 */
export interface PayrollRecord {
  recordId: string;
  staffId: string;
  staffName: string; // Denormalized
  grossPay: number;
  netPay: number;
  taxAmount: number;
  deductions: Record<string, number>; // e.g., { "SSNIT": 200, "Welfare": 50 }
  allowances: Record<string, number>; // e.g., { "Car Maintenance": 800 }
  payslipUrl: string; // Link to generated PDF in Storage
}

/**
 * Represents the configuration for payroll calculations.
 * In a real app, this would be fetched from a 'payroll_configurations' collection.
 */
export interface PayrollConfiguration {
    ssnitEmployeeContribution: number;
    ssnitEmployerContribution: number;
    tier2EmployerContribution: number;
    ssnitCeiling: number; // GHS per annum
    taxBands: {
        limit: number; // Annual limit for the band
        rate: number;
    }[];
}


// =========================================================================
// == Clinical Decision Support (CDS) Data Models
// =========================================================================

/**
 * Represents a single condition within a ClinicalRule.
 * This allows for flexible and complex rule definitions.
 */
export interface RuleCondition {
  key: string; // The data field to check (e.g., 'temperature', 'hemoglobin')
  operator: '==' | '!=' | '<' | '<=' | '>' | '>=';
  value: any; // The value to compare against.
  unit?: string; // Optional unit for the value (e.g., 'C', 'g/dL')
}

/**
 * Represents a rule in the top-level 'clinical_rules' collection.
 * This collection holds the logic for the CDS engine. Each document is a rule
 * that can be evaluated by a Cloud Function against patient data.
 */
export interface ClinicalRule {
  ruleId: string; // Document ID
  description: string; // A human-readable explanation of the rule.
  trigger_type: 'vitals_update' | 'lab_result' | 'medication_prescribe'; // Links the rule to a specific Cloud Function trigger.
  severity: 'Warning' | 'Critical' | 'Information';
  conditions: RuleCondition[]; // An array of conditions that must ALL be met for the rule to trigger.
  alert_message: string; // The message to display to the clinician.
  recommended_action?: string; // Optional recommended action.
  isActive: boolean; // Allows for rules to be enabled or disabled without deleting them.
}

/**
 * Represents a generated alert in a patient's 'alerts' sub-collection.
 * When the CDS engine evaluates a rule and finds it to be true, it will create a document
 * with this structure.
 * Path: /patients/{patientId}/alerts/{alertId}
 */
export interface PatientAlert {
  alertId: string; // Document ID
  patientId: string;
  ruleId: string; // The ID of the ClinicalRule that was triggered.
  severity: 'Warning' | 'Critical' | 'Information';
  alert_message: string; // The specific alert message generated.
  triggeredByUserId: string; // The user whose action triggered the alert (e.g., nurse logging vitals).
  triggeredAt: string; // ISO 8601 Timestamp when the alert was created.
  isAcknowledged: boolean;
  acknowledgedByUserId?: string; // UID of the user who acknowledged the alert.
}


/**
 * Represents a user in the 'users' collection.
 * The document ID should correspond to the Firebase Auth UID.
 */
export interface User {
  uid: string; // Corresponds to Firebase Auth UID
  email: string;
  name: string;
  role: 'admin' | 'doctor' | 'nurse' | 'pharmacist' | 'patient' | 'billing_clerk' | 'triage_officer' | 'lab_technician' | 'ot_coordinator' | 'receptionist';
  is_active: boolean;
  patient_id?: string; // Link to the patient document, for users with the 'patient' role
  created_at: string; // ISO 8601 format
  last_login: string; // ISO 8601 format
  
  // Doctor-specific fields
  specialty?: string; // e.g., 'Cardiology', 'Pediatrics'
  department?: string; // e.g., 'Cardiology'

  photoURL?: string; // Optional: For profile pictures
}

/**
 * Represents a patient record in the 'patients' collection.
 *
 * ARCHITECTURAL NOTE:
 * The document ID for a patient record in Firestore should be their unique `patient_id`.
 * This approach is highly efficient for data retrieval, as it allows for direct document lookups
 * without needing a separate query. It also guarantees the uniqueness of the patient ID at the
 * database level, which is critical for data integrity across the entire ERP system.
 *
 * The patient's full Electronic Health Record (EHR) is built using a series of sub-collections
 * nested under this main patient document. This strategy keeps the top-level patient document
 * lean and fast to load, while allowing for scalable, organized storage of potentially vast amounts
 * of clinical data. Each sub-collection represents a different domain of the patient's record.
 *
 * Example EHR Sub-collection structure:
 * /patients/{patientId}/
 *   - alerts/{alertId}
 *   - allergies/{allergyId}
 *   - clinical_notes/{noteId} (also serves as progress_notes)
 *   - lab_history/{resultId}
 *   - vitals/{vitalId}
 *   - admissions/{admissionId}
 *   - care_plans/{planId}
 *   - medication_administration_logs/{logId}
 *   - immunizations/{immunizationId}
 *   - appointment_history/{appointmentId}
 *
 * This structure enables granular security rules, allowing different clinical roles to access
 * only the specific parts of the EHR they are authorized to see.
 */
export interface Patient {
  patient_id: string; // Unique, system-generated ID. THIS IS ALSO THE FIRESTORE DOCUMENT ID.
  title?: string; // e.g., 'Mr', 'Mrs', 'Dr'
  first_name: string;
  last_name: string;
  otherNames?: string;
  full_name: string; // Denormalized for searching: first_name + ' ' + last_name
  ghanaCardId?: string; // Optional: For linking with national ID systems
  dob: string; // ISO 8601 format (YYYY-MM-DD)
  gender: 'Male' | 'Female' | 'Other';
  maritalStatus?: 'Single' | 'Married' | 'Divorced' | 'Widowed';
  occupation?: string;
  patientType: string; // Reference to pricing_tables (e.g., 'private', 'corporate')
  allergies?: string[]; // Simple list of allergens for quick checks
  medicalHistory?: {
    allergies?: string[]; // e.g., ['Penicillin', 'Latex']
    preExistingConditions?: string[]; // e.g., ['Hypertension', 'Diabetes']
    pastSurgeries?: { name: string; date: string }[];
  };
  /**
   * INPATIENT / OUTPATIENT WORKFLOW:
   * This boolean is the primary flag for distinguishing between an inpatient and an outpatient.
   * It's ideal for fast lookups and dashboard filters (e.g., `db.collection('patients').where('is_admitted', '==', true)`).
   * - `true`: The patient is currently admitted to the hospital.
   * - `false`: The patient is an outpatient.
   * This flag is controlled by the `handlePatientAdmission` and `handlePatientDischarge` Cloud Functions.
   */
  is_admitted: boolean;
  /**
   * INPATIENT / OUTPATIENT WORKFLOW:
   * If `is_admitted` is true, this field will contain the document ID of the current, active
   * admission record from the `/patients/{patientId}/admissions` sub-collection.
   * This provides a direct link to the full details of their current stay.
   * If the patient is an outpatient, this field should be `null`.
   */
  current_admission_id?: string | null; // Null if not admitted
  lastVisitDate?: string; // ISO 8601 format
  status: 'active' | 'inactive' | 'deceased';
  created_at: string; // ISO 8601 format
  updated_at: string; // ISO 8601 format
}

/**
 * Represents a structured allergy record in a patient's sub-collection.
 * Path: /patients/{patientId}/allergies/{allergyId}
 */
export interface PatientAllergy {
  allergyId: string; // Document ID
  allergen: string; // e.g., 'Penicillin', 'Peanuts', 'Latex'
  reaction: string; // e.g., 'Hives', 'Anaphylaxis'
  severity: 'Mild' | 'Moderate' | 'Severe';
  recordedAt: string; // ISO Timestamp
  recordedBy: string; // User ID of the clinician
}


/**
 * Represents an admission record, stored in a sub-collection 'admissions' under a patient document.
 * Path: /patients/{patientId}/admissions/{admissionId}
 */
export interface Admission {
  admission_id: string; // Unique ID for this specific admission
  patient_id: string; // Reference to the parent patient document
  /**
   * This field is key to differentiating workflows. It determines the lifecycle and available statuses.
   */
  type: 'Inpatient' | 'Outpatient' | 'Emergency';
  admission_date: string; // ISO 8601 format
  
  reasonForVisit: string;
  ward?: string; // e.g., 'Cardiology', 'Maternity', applicable to Inpatients
  bed_id?: string; // e.g., 'C-101', applicable to Inpatients
  attending_doctor_id: string; // Reference to doctor user ID
  attending_doctor_name?: string; // Denormalized for quick display
  
  /**
   * The status of the admission, which has different values depending on the `type`.
   * For Outpatients: 'Scheduled', 'In Progress', 'Completed', 'Canceled'.
   * For Inpatients: 'Admitted', 'In Treatment', 'Pending Discharge', 'Discharged'.
   */
  status: 'Admitted' | 'In Treatment' | 'Pending Discharge' | 'Discharged' | 'Scheduled' | 'In Progress' | 'Completed' | 'Canceled';
  
  // Discharge-specific fields
  discharge_date?: string; // ISO 8601 format, set upon discharge
  discharge_by_doctor_id?: string; // UID of the doctor who authorized the discharge.
  dischargeSummary?: {
    clinicalSummary: string;
    patientInstructions: string;
  };
  
  is_summary_finalized?: boolean; // Defaults to false, locks the summary from further edits.
  final_bill_id?: string; // Optional reference to a final bill document.
  summary_pdf_url?: string; // Optional URL to a generated PDF in Firebase Storage.
  
  referralDetails?: {
    referralId: string;
    referredBy: string; // e.g., 'Korle Bu Teaching Hospital'
    referralReason: string;
  };
  
  created_at: string; // ISO 8601 format
  updated_at: string; // ISO 8601 format
}


/**
 * Represents a hospital bed in the 'beds' collection.
 * These documents are updated frequently as patients are admitted, transferred, and discharged.
 */
export interface Bed {
    bed_id: string; // Unique bed identifier, e.g., 'C-101'
    wardName: string;
    room_number: string;
    status: 'occupied' | 'vacant' | 'cleaning' | 'maintenance';
    current_patient_id?: string | null; // Null if vacant or maintenance
    occupied_since?: string | null; // ISO 8601 format, set when occupied
    cleaningNeeded: boolean;
    created_at: string; // ISO 8601 format
    updated_at: string; // ISO 8601 format
}

/**
 * Represents a clinic or department in the 'clinics' collection.
 */
export interface Clinic {
  clinicId: string; // Document ID
  name: string; // e.g., 'Cardiology', 'Dermatology'
  location: string;
  description?: string;
  affiliatedDoctorIds: string[]; // List of doctor UIDs
  contact?: {
    phone?: string;
    email?: string;
  };
}


/**
 * Represents an appointment in the 'appointments' collection.
 * This model links patients and doctors for scheduled events.
 */
export interface Appointment {
  appointment_id: string; // Unique ID, e.g., AP-001
  patient_id: string;
  patient_name: string; // Denormalized for quick display
  
  /**
   * attendingDoctorId (renamed as doctor_id here) is the critical field for the Doctor's Workbench.
   * The system will query the 'appointments' collection where 'doctor_id' matches the
   * logged-in doctor's UID to build their personalized daily schedule.
   */
  doctor_id: string; 
  doctor_name: string; // Denormalized for quick display
  
  appointment_date: string; // ISO 8601 format, start time
  end_time: string; // ISO 8601 format
  duration: number; // in minutes
  type: 'consultation' | 'follow-up' | 'procedure';
  department: string;
  clinicId?: string; // Reference to the 'clinics' collection
  resourceId?: string; // Optional reference to a 'resources' document
  status: 'confirmed' | 'completed' | 'cancelled' | 'no-show';
  isBilled: boolean; // Flag to prevent duplicate billing
  notes: string;
  created_at: string; // ISO 8601 format
  updated_at: string; // ISO 8601 format
  bookingSource?: 'Online' | 'Call Center' | 'In-Person';
  bookedByUserId?: string; // UID of user who booked
  bookedAt?: string; // ISO Timestamp
  waitinglistId?: string; // Optional link to 'waiting_lists' collection
}

/**
 * Represents a patient referral in the 'referrals' collection.
 * This tracks incoming patients from other healthcare providers.
 */
export interface Referral {
  referral_id: string; // Unique ID, same as document ID
  patientId?: string; // Optional: Link to 'patients' collection if record exists
  patientDetails: {
    name: string;
    dob: string; // YYYY-MM-DD
    phone: string;
  };
  referringProvider: string; // e.g., 'Korle Bu Teaching Hospital'
  reasonForReferral: string;
  assignedDepartment: string;
  assignedDoctorId?: string; // Optional: Link to 'users' collection
  status: 'Pending Review' | 'Assigned' | 'Scheduled' | 'Completed' | 'Cancelled';
  priority: 'Routine' | 'Urgent' | 'Emergency';
  referralDate: string; // ISO 8601 format
  scannedDocumentURL?: string; // Optional: Link to PDF/image in Firebase Storage
  appointmentId?: string; // Optional: Link to 'appointments' collection
  created_at: string; // ISO 8601 format
  updated_at: string; // ISO 8601 format
}

/**
 * Represents a doctor's schedule for a specific day in the 'doctor_schedules' collection.
 * Document ID could be `${doctorId}_${YYYY-MM-DD}` for easy lookup.
 */
export interface DoctorSchedule {
  schedule_id: string; // Document ID
  doctor_id: string;
  clinicId?: string; // Reference to the 'clinics' collection
  date: string; // YYYY-MM-DD format
  availableSlots: { start: string; end: string }[]; // e.g., [{ start: '09:00', end: '12:00' }]
  unavailablePeriods: { start: string; end: string; reason: string }[]; // e.g., [{ start: '12:00', end: '13:00', reason: 'Lunch' }]
  created_at: string; // ISO 8601 format
  updated_at: string; // ISO 8601 format
}


/**
 * Represents a bookable clinical asset in the central 'resources' collection.
 * This can be equipment, a room, or specialized staff.
 */
export interface Resource {
  resourceId: string; // Document ID
  name: string; // e.g., 'MRI Scanner 1', 'Exam Room 3'
  type: string; // e.g., 'Equipment', 'Room', 'Specialized Staff'
  department: string; // e.g., 'Radiology', 'Cardiology'
  location: string;
  operatingHours: Record<string, string>; // e.g., { 'Mon-Fri': '08:00-20:00', 'Sat': '09:00-17:00' }
  isBookable: boolean;
}

/**
 * Represents a single booking in the central 'resource_bookings' collection.
 * This links a resource to a specific time slot and purpose.
 */
export interface ResourceBooking {
  bookingId: string; // Document ID
  resourceId: string; // Reference to the 'resources' collection
  bookedByUserId: string; // Reference to the 'users' collection who made the booking
  startTime: string; // ISO Timestamp
  endTime: string; // ISO Timestamp
  status: 'Confirmed' | 'Canceled';
  relatedAppointmentId?: string; // Optional link to an 'appointments' or 'ot_sessions' document
  reason: string; // e.g., 'Patient MRI Scan for Appointment AP-123'
}

/**
 * Represents a lightweight appointment record in the patient's sub-collection.
 * Path: /patients/{patientId}/appointment_history/{appointmentId}
 */
export interface AppointmentHistory {
  appointmentId: string; // Document ID, matches the one in the top-level collection
  appointmentDate: string; // ISO Timestamp
  doctorName: string;
  department: string;
  type: 'consultation' | 'follow-up' | 'procedure';
  status: 'completed' | 'cancelled' | 'no-show';
}


// =========================================================================
// == E-Prescribing & Pharmacy Data Models
// =========================================================================

/**
 * Represents a drug in the central 'medications' formulary collection.
 * This is the master catalog of all drugs available in the hospital.
 */
export interface Medication {
  medicationId: string; // Document ID (e.g., NDC code or internal ID)
  brandName: string;
  genericName: string;
  drugClass: string;
  activeIngredients: string[];
  availableForms: ('Tablet' | 'Capsule' | 'Syrup' | 'Injection' | 'Cream')[];
  standardDosages: Record<string, string>; // e.g., { "adult": "10-20mg BID", "pediatric": "5mg/kg TID" }
  commonSideEffects: string[];
  knownInteractions: { medicationId: string, severity: 'Minor' | 'Moderate' | 'Major', description: string }[];
  allergens: string[]; // e.g., 'Penicillin', 'Sulfa'
}

/**
 * Represents a single medication item within a prescription.
 */
export interface PrescribedMedication {
  itemId: string; // Reference to inventory
  name: string;
  dosage: string;
  frequency: string;
  duration?: number; // Optional, in days
  quantity_to_dispense: number;
}


/**
 * Represents a digital prescription in the top-level 'prescriptions' collection.
 * This serves as the single source of truth for pharmacy orders.
 */
export interface Prescription {
  prescriptionId: string; // Document ID
  patientId: string; // Reference to 'patients' collection
  patientName: string; // Denormalized for display
  doctorId: string; // Reference to users.uid
  datePrescribed: string; // ISO Timestamp
  status: 'Pending' | 'Dispensed' | 'Canceled';
  isDispensed?: boolean;
  medications: PrescribedMedication[]; // An array of prescribed medications
  filledAt?: string; // ISO Timestamp, updated by Pharmacy
}

// =========================================================================
// == Operating Theatre (OT) Data Models
// =========================================================================

/**
 * Represents a single operating theatre in the 'operating_theaters' collection.
 * This is the master catalog of all available surgical rooms.
 */
export interface OperatingTheater {
  otRoomId: string; // Document ID
  name: string; // e.g., 'OT-1', 'OT-2'
  location: string; // e.g., 'West Wing, 3rd Floor'
  specialty: 'Orthopedic' | 'Cardiothoracic' | 'General' | 'Neurosurgery';
  equipment: string[]; // List of built-in equipment, e.g., ['C-Arm', 'Microscope']
}

/**
 * Represents a booked surgical procedure in the 'ot_sessions' collection.
 * This is the core data model for managing the OT schedule.
 */
export interface OTSession {
  sessionId: string; // Document ID
  patientId: string; // Reference to 'patients' collection
  otRoomId: string; // Reference to 'operating_theaters' collection
  leadSurgeonId: string; // Reference to the lead surgeon in the 'users' collection
  teamIds: string[]; // Array of user IDs for the rest of the surgical team
  requiredEquipmentIds: string[]; // Array of references to the 'resources' collection for mobile equipment
  procedureName: string; // e.g., 'Appendectomy', 'Total Knee Replacement'
  startTime: string; // ISO Timestamp
  endTime: string; // ISO Timestamp
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Canceled' | 'Postponed';
  notes?: string; // Any pre-operative or procedural notes
  waitinglistId?: string; // Optional link to 'waiting_lists' collection
}

// =========================================================================
// == Waiting List Management Data Models
// =========================================================================

/**
 * Represents a patient on a waiting list in the 'waiting_lists' collection.
 */
export interface WaitingListEntry {
  waitinglistId: string; // Document ID
  patientId: string; // Reference to 'patients' collection
  requestedService: string; // e.g., 'Cardiology Consultation', 'Knee Surgery', 'MRI Scan'
  requestedServiceId?: string; // Optional reference to a 'clinics' or 'resources' document
  priority: 'Urgent' | 'Routine' | 'Elective';
  dateAdded: string; // ISO Timestamp
  status: 'Active' | 'Scheduled' | 'Canceled';
  notes?: string; // Optional notes
}


// =========================================================================
// == EHR Sub-Collection Data Models
// =========================================================================

/**
 * Represents a clinical note (or progress note) in the `clinical_notes` sub-collection.
 * This is used by both doctors and nurses for general documentation.
 * Path: /patients/{patientId}/clinical_notes/{noteId}
 */
export interface ClinicalNote {
  noteId: string; // Document ID
  patientId: string;
  noteText: string; // Can be Markdown or plain text
  noteType: 'Progress Note' | 'Consultation' | 'Nursing Note' | 'Shift Report' | 'Daily Progress Note';
  recordedByUserId: string; // Reference to users.uid
  recordedAt: string; // ISO 8601 Timestamp
}

/**
 * Represents a medical diagnosis in the `diagnoses` sub-collection.
 * Path: /patients/{patientId}/diagnoses/{diagnosisId}
 */
export interface Diagnosis {
  diagnosisId: string; // Document ID
  icd10Code: string; // e.g., 'I10'
  diagnosisText: string; // e.g., 'Essential (primary) hypertension'
  isPrimary: boolean;
  diagnosedByDoctorId: string; // Reference to users.uid
  diagnosedAt: string; // ISO 8601 Timestamp
}

/**
 * Represents a medication record in the `medication_history` sub-collection.
 * This is a historical log within the patient's chart.
 * Path: /patients/{patientId}/medication_history/{prescriptionId}
 */
export interface MedicationRecord {
  prescriptionId: string; // Document ID, should match the ID in the top-level 'prescriptions' collection
  patientId: string;
  patientName: string; // Denormalized
  medicationName: string; // e.g., 'Amlodipine'
  dosage: string; // e.g., '5mg'
  frequency: string; // e.g., 'Once daily'
  instructions: string; // e.g., 'Take with food'
  prescribedByDoctorId: string; // Reference to users.uid
  prescribedByDoctorName?: string; // Denormalized
  prescribedAt: string; // ISO 8601 Timestamp
  status: 'Active' | 'Discontinued' | 'Filled';
}

/**
 * Represents a single vitals log entry in the `vitals` sub-collection.
 * This is a core data model for the nursing workflow.
 * Path: /patients/{patientId}/vitals/{vitalId}
 */
export interface VitalsLog {
    vitalId: string; // Document ID
    patientId: string;
    bloodPressure: string; // e.g., '120/80'
    heartRate: string; // beats per minute
    temperature: string; // in Celsius
    respiratoryRate: string; // breaths per minute
    oxygenSaturation: string; // percentage
    painLevel?: string; // 1-10 scale
    notes?: string;
    recordedByUserId: string; // Reference to users.uid
    recordedAt: string; // ISO 8601 Timestamp
}

/**
 * Represents a patient's care plan in the `care_plans` sub-collection.
 * This is a central document for coordinating nursing care.
 * Path: /patients/{patientId}/care_plans/{planId}
 */
export interface CarePlan {
    planId: string; // Document ID
    patientId: string;
    title: string;
    goal: string;
    interventions: string[];
    status: 'Active' | 'On Hold' | 'Completed' | 'Cancelled';
    createdBy: string; // user ID of the doctor or nurse who created the plan
    createdAt: string; // ISO Timestamp
    updatedBy: string; // user ID of the last person to update
    updatedAt: string; // ISO Timestamp
}

/**
 * Represents a log of a medication being administered by a nurse.
 * This forms the Medication Administration Record (MAR).
 * Path: /patients/{patientId}/medication_administration_logs/{logId}
 */
export interface MedicationAdministrationLog {
  logId: string; // Document ID
  prescriptionId: string; // Reference to the original prescription
  medicationName: string; // Denormalized for easy display
  patientId: string;
  dosage: string; // Denormalized for easy display
  administeredByUserId: string; // Nurse's user ID
  administeredAt: string; // ISO Timestamp when the medication was given
  notes?: string; // Optional notes, e.g., "Patient refused", "Took with water"
  isBilled: boolean; // Flag to prevent duplicate billing
}


// =========================================================================
// == Immunization Management Data Models
// =========================================================================

/**
 * Represents a vaccine in the central 'vaccine_catalog' collection.
 * This serves as the master list of all available vaccines and their schedules.
 */
export interface Vaccine {
  vaccineId: string; // Document ID (e.g., 'MMR', 'TETANUS')
  name: string; // e.g., 'Measles, Mumps, and Rubella (MMR)'
  schedule: {
    dose: number;
    intervalMonths?: number;
    intervalYears?: number;
  }[];
  brandNames: string[];
}

/**
 * Represents a single immunization record for a patient.
 * Path: /patients/{patientId}/immunizations/{immunizationId}
 */
export interface ImmunizationRecord {
  immunizationId: string; // Document ID
  patientId: string;
  vaccineName: string; // e.g., 'MMR', 'Tetanus'
  doseNumber: number;
  administeredAt: string; // ISO Timestamp
  nextDueDate?: string; // ISO Timestamp, calculated by a Cloud Function
  administeredByUserId: string; // Reference to users.uid
  notes?: string;
}

// =========================================================================
// == Reporting Data Models
// =========================================================================

/**
 * Represents aggregated report data, stored in the 'reports' collection.
 * Each document could represent a daily, weekly, or monthly summary.
 */
export interface LabReport {
  reportId: string; // e.g., 'daily-2024-08-16'
  date: string; // YYYY-MM-DD
  testVolumes: { testName: string; volume: number }[];
  turnaroundTimes: { testName: string; avgTAT: number }[];
  abnormalResultTrends: { testName: string; abnormalPercentage: number }[];
}


// Deprecated type, use PurchaseOrder instead
export type PharmacyOrder = PurchaseOrder;







    
