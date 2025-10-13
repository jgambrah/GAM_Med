

import { User, Patient, Appointment, Admission, Bed, Referral, LabResult, ClinicalNote, VitalsLog, CarePlan, MedicationRecord, PatientAlert, ImmunizationRecord, Vaccine, Asset, ResourceBooking, WaitingListEntry, Invoice, Claim, FinancialTransaction, Prescription, PricingTable, Receipt, Bill, Supplier, LedgerAccount, LedgerEntry, StaffExpenseClaim, LeaveRequest, PayrollRun, PayrollRecord, StaffProfile, PayrollConfiguration, Allowance, Deduction, Position, InventoryItem, PurchaseOrder, PrescribedMedication, ControlledSubstance, ControlledSubstanceLog, LabTest, SampleAudit, EquipmentLog, LabReport, RadiologyStudy, RadiologyOrder, RadiologyReport, OTSession, DietaryProfile, MealOrder, PerformanceReview, TrainingCourse, FacilityZone, WorkOrder, SparePart, SparePartLog, Meter, UtilityConsumption, SecurityIncident, HousekeepingTask, DepreciationRecord, InfectionReport, EfficacyReport, SavedReport, Message, Reminder, HealthContent, Role, AuditLog, Diagnosis } from './types';

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
    availability: { '2024-08-16': ['09:00', '10:00', '11:00', '14:00', '15:00'] },
  },
  {
    uid: 'doc2',
    email: 'k.asante@gammed.com',
    name: 'Dr. Kofi Asante',
    role: 'doctor',
    is_active: true,
    hodId: 'doc1', // Dr. Mensah is HOD
    specialty: 'Neurology',
    department: 'Neurology',
    created_at: now.toISOString(),
    last_login: now.toISOString(),
    availability: { '2024-08-16': ['09:30', '10:30', '11:30', '13:00', '14:30'] },
  },
    {
    uid: 'rad1',
    email: 'a.elrufai@gammed.com',
    name: 'Dr. Amina El-Rufai',
    role: 'radiologist',
    is_active: true,
    specialty: 'Diagnostic Radiology',
    department: 'Radiology',
    created_at: now.toISOString(),
    last_login: now.toISOString(),
  },
  {
    uid: 'nurse1',
    email: 'f.agyepong@gammed.com',
    name: 'Florence Agyepong',
    role: 'nurse',
    is_active: true,
    hodId: 'doc1', // Dr. Mensah is HOD
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
    uid: 'otc1',
    email: 'ot.coordinator@gammed.com',
    name: 'OT Coordinator',
    role: 'ot_coordinator',
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
  },
  {
    uid: 'dietitian1',
    email: 'd.tian@gammed.com',
    name: 'Dietitian',
    role: 'dietitian',
    is_active: true,
    created_at: now.toISOString(),
    last_login: now.toISOString(),
  },
  {
    uid: 'housekeeper1',
    email: 'h.keeper@gammed.com',
    name: 'Housekeeper',
    role: 'housekeeping',
    is_active: true,
    created_at: now.toISOString(),
    last_login: now.toISOString(),
  },
    {
    uid: 'space_manager1',
    email: 's.manager@gammed.com',
    name: 'Space Manager',
    role: 'space_manager',
    is_active: true,
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
    otherNames: 'K.',
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
    discharge_date: new Date('2024-08-05T14:00:00Z').toISOString(),
    reasonForVisit: 'Follow-up on hypertension',
    ward: 'Cardiology',
    bed_id: 'C-101',
    attending_doctor_id: 'doc1',
    attending_doctor_name: 'Dr. Evelyn Mensah',
    status: 'Discharged',
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
    discharge_date: new Date('2024-08-08T11:00:00Z').toISOString(),
    reasonForVisit: 'Pre-operative assessment',
    ward: 'General Ward',
    bed_id: 'GW-208',
    attending_doctor_id: 'doc1',
    attending_doctor_name: 'Dr. Evelyn Mensah',
    status: 'Discharged',
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
        bed_id: 'M-4',
        wardName: 'Maternity',
        room_number: '3',
        status: 'Reserved',
        cleaningNeeded: false,
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
    isConfirmed: true,
    bookingMethod: 'Front Desk',
    notes: 'Follow-up consultation for hypertension.',
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    isVirtual: false,
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
    isConfirmed: true,
    bookingMethod: 'Front Desk',
    notes: 'Initial consultation.',
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    isVirtual: false,
  },
  {
    appointment_id: 'AP-003',
    patient_id: 'P-123456',
    patient_name: 'Kwame Owusu',
    doctor_id: 'doc2',
    doctor_name: 'Dr. Kofi Asante',
    appointment_date: new Date('2024-08-20T09:00:00.000Z').toISOString(),
    end_time: new Date('2024-08-20T09:30:00.000Z').toISOString(),
    duration: 30,
    type: 'consultation',
    department: 'Neurology',
    status: 'scheduled',
    isBilled: false,
    isConfirmed: false,
    bookingMethod: 'Online Portal',
    notes: 'Telemedicine consultation regarding recurring migraines.',
    isVirtual: true,
    telemedicineLink: 'https://meet.gammed.com/session/AP-003',
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  },
  {
    appointment_id: 'AP-004-VIRTUAL',
    patient_id: 'P-123456',
    patient_name: 'Kwame Owusu',
    doctor_id: 'doc1',
    doctor_name: 'Dr. Evelyn Mensah',
    appointment_date: new Date(now.getTime() + 20 * 60 * 1000).toISOString(), // 20 mins from now
    end_time: new Date(now.getTime() + 50 * 60 * 1000).toISOString(),
    duration: 30,
    type: 'consultation',
    department: 'Cardiology',
    status: 'scheduled',
    isBilled: false,
    isConfirmed: true,
    bookingMethod: 'Online Portal',
    notes: 'Follow-up virtual check-in.',
    isVirtual: true,
    telemedicineLink: 'https://meet.gammed.com/session/AP-004-VIRTUAL',
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  }
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
    notes: 'Patient has a history of migraines.',
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
    assignedDoctorName: 'Dr. Evelyn Mensah',
    status: 'Assigned',
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    notes: 'Please review recent ECG results.',
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

export const mockRadiologyStudies: RadiologyStudy[] = [
    { studyId: 'CT-Chest', name: 'CT Scan of Chest', description: 'Computed tomography scan of the chest area.', price: 800, estimatedTime: 30, isStat: false },
    { studyId: 'XRay-Leg', name: 'X-Ray of Leg', description: 'Standard two-view X-ray of the leg.', price: 150, estimatedTime: 15, isStat: false },
    { studyId: 'MRI-Brain', name: 'MRI of Brain with Contrast', description: 'Magnetic resonance imaging of the brain.', price: 1500, estimatedTime: 60, isStat: true },
    { studyId: 'US-Abdomen', name: 'Ultrasound of Abdomen', description: 'Abdominal ultrasound.', price: 300, estimatedTime: 20, isStat: false },
];

export const mockRadiologyOrders: RadiologyOrder[] = [
    {
        orderId: 'RAD-001',
        patientId: 'P-123456',
        doctorId: 'doc1',
        studyIds: ['CT-Chest'],
        dateOrdered: new Date('2024-08-16T11:00:00Z').toISOString(),
        status: 'Pending Scheduling',
        clinicalNotes: 'Patient has a persistent cough and shortness of breath.',
        priority: 2,
    },
    {
        orderId: 'RAD-002',
        patientId: 'P-654321',
        doctorId: 'doc2',
        studyIds: ['MRI-Brain'],
        dateOrdered: new Date('2024-08-15T15:30:00Z').toISOString(),
        status: 'Awaiting Report',
        scheduledDateTime: new Date('2024-08-16T09:00:00Z').toISOString(),
        clinicalNotes: 'Rule out intracranial hemorrhage.',
        priority: 1,
        assignedRadiologistId: 'rad1',
        isReported: false,
        dateAssigned: new Date('2024-08-15T16:00:00Z').toISOString(),
    },
    {
        orderId: 'RAD-003',
        patientId: 'P-123456',
        doctorId: 'doc1',
        studyIds: ['US-Abdomen'],
        dateOrdered: new Date('2024-08-14T09:00:00Z').toISOString(),
        status: 'Completed',
        scheduledDateTime: new Date('2024-08-15T11:00:00Z').toISOString(),
        clinicalNotes: 'Assess for gallstones.',
        priority: 3,
        isReported: true,
    }
];

export const mockRadiologyReports: RadiologyReport[] = [
    {
        reportId: 'RAD-003',
        orderId: 'RAD-003',
        patientId: 'P-123456',
        radiologistId: 'rad1',
        dateReported: new Date('2024-08-15T14:00:00Z').toISOString(),
        reportDetails: {
            impression: 'No evidence of cholelithiasis. Mild fatty liver changes noted.',
            findings: 'The liver is of normal size and echotexture. No focal lesions. The gallbladder is unremarkable with no stones or wall thickening. The common bile duct is not dilated.'
        },
        reportPdfUrl: '/mock-report.pdf',
        pacsLink: '/mock-pacs-viewer.html',
        isFinal: true,
    }
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

export const mockResources: Asset[] = [
  {
    assetId: 'mri-1',
    name: 'MRI Scanner 1',
    modelNumber: 'Magnetom Skyra',
    serialNumber: 'SN-MRI-001',
    type: 'Medical Equipment',
    department: 'Radiology',
    location: 'Radiology Wing, Basement',
    operatingHours: { 'Mon-Fri': '08:00-20:00', 'Sat': '09:00-17:00' },
    isBookable: true,
    status: 'Operational',
    modality: 'MRI',
    purchaseDate: '2020-01-15T00:00:00Z',
    purchaseCost: 5000000,
    currentBookValue: 4200000,
    warrantyEndDate: '2025-01-14T00:00:00Z',
    maintenanceSchedule: [{
        type: 'Preventive',
        frequency: 'Annually',
        lastServiceDate: '2024-01-15T00:00:00Z',
        nextServiceDate: '2025-01-15T00:00:00Z',
    }]
  },
  {
    assetId: 'ct-1',
    name: 'CT Scanner 1',
    modelNumber: 'Somatom go.Up',
    serialNumber: 'SN-CT-001',
    type: 'Medical Equipment',
    department: 'Radiology',
    location: 'Radiology Wing, Basement',
    operatingHours: { 'Mon-Fri': '08:00-20:00', 'Sat': '09:00-17:00' },
    isBookable: true,
    status: 'Needs Repair',
    modality: 'CT Scan',
    purchaseDate: '2019-05-20T00:00:00Z',
    purchaseCost: 3500000,
    currentBookValue: 2500000,
    maintenanceSchedule: [{
        type: 'Preventive',
        frequency: 'Quarterly',
        lastServiceDate: '2024-06-20T00:00:00Z',
        nextServiceDate: '2024-09-20T00:00:00Z',
    }]
  },
  {
    assetId: 'xray-1',
    name: 'X-Ray Machine 1',
    modelNumber: 'Philips DigitalDiagnost',
    serialNumber: 'SN-XRAY-001',
    type: 'Medical Equipment',
    department: 'Radiology',
    location: 'Radiology Wing, Room 102',
    isBookable: true,
    status: 'Operational',
    modality: 'X-Ray',
    purchaseDate: '2021-03-10T00:00:00Z',
    purchaseCost: 1500000,
    currentBookValue: 1200000,
  },
  {
    assetId: 'us-1',
    name: 'Ultrasound Machine 1',
    modelNumber: 'GE Logiq E10',
    serialNumber: 'SN-US-001',
    type: 'Medical Equipment',
    department: 'Radiology',
    location: 'Radiology Wing, Room 103',
    isBookable: true,
    status: 'Operational',
    modality: 'Ultrasound',
    purchaseDate: '2022-08-01T00:00:00Z',
    purchaseCost: 950000,
    currentBookValue: 850000,
  },
  {
    assetId: 'proc-room-1',
    name: 'Procedure Room 1',
    type: 'Room',
    department: 'General Surgery',
    location: 'Outpatient Clinic, 2nd Floor',
    status: 'Operational',
    isBookable: true,
  },
  {
    assetId: 'consult-room-5',
    name: 'Consultation Room 5',
    type: 'Room',
    department: 'Cardiology',
    location: 'Cardiology Clinic',
    status: 'Under Maintenance',
    isBookable: true,
    maintenanceSchedule: [{
        type: 'Preventive',
        frequency: 'Monthly',
        lastServiceDate: '2024-08-01T00:00:00Z',
        nextServiceDate: '2024-09-01T00:00:00Z',
    }]
  },
   {
    assetId: 'OT-1',
    name: 'Operating Theatre 1',
    type: 'Room',
    department: 'Surgery',
    location: 'Surgical Wing, 3rd Floor',
    status: 'Operational',
    isBookable: true,
  },
  {
    assetId: 'OT-2',
    name: 'Operating Theatre 2',
    type: 'Room',
    department: 'Surgery',
    location: 'Surgical Wing, 3rd Floor',
    status: 'Operational',
    isBookable: true,
  },
];

export const mockDepreciationRecords: DepreciationRecord[] = [
    {
        recordId: 'dep-mri-1-2023',
        assetId: 'mri-1',
        dateCalculated: new Date('2023-12-31T23:59:59Z').toISOString(),
        period: 'Annually',
        depreciationAmount: 800000,
        accumulatedDepreciation: 2400000,
        bookValue: 2600000,
    },
     {
        recordId: 'dep-mri-1-2022',
        assetId: 'mri-1',
        dateCalculated: new Date('2022-12-31T23:59:59Z').toISOString(),
        period: 'Annually',
        depreciationAmount: 800000,
        accumulatedDepreciation: 1600000,
        bookValue: 3400000,
    }
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
    },
     {
        bookingId: 'booking-ot-1',
        resourceId: 'OT-1',
        bookedByUserId: 'doc1',
        startTime: '2024-08-16T09:00:00Z',
        endTime: '2024-08-16T11:00:00Z',
        status: 'Confirmed',
        reason: 'Appendectomy',
        relatedAppointmentId: 'AP-SURG-1'
    },
    {
        bookingId: 'booking-ot-2',
        resourceId: 'OT-1',
        bookedByUserId: 'doc2',
        startTime: '2024-08-16T12:00:00Z',
        endTime: '2024-08-16T14:30:00Z',
        status: 'Confirmed',
        reason: 'Hernia Repair',
        relatedAppointmentId: 'AP-SURG-2'
    }
];

export const mockWorkOrders: WorkOrder[] = [
    {
        workOrderId: 'MR-001',
        assetId: 'ct-1',
        description: 'CT scanner is producing artifact images. Requires technician assessment.',
        priority: 'High',
        status: 'Open',
        reportedByUserId: 'rad1',
        dateReported: new Date('2024-08-15T11:00:00Z').toISOString(),
    },
    {
        workOrderId: 'MR-002',
        facilityIssue: 'Main-Lobby',
        description: 'Lobby air conditioning unit is not cooling effectively.',
        priority: 'Medium',
        status: 'Open',
        reportedByUserId: 'reception1',
        dateReported: new Date('2024-08-16T09:00:00Z').toISOString(),
    },
     {
        workOrderId: 'MR-003',
        assetId: 'consult-room-5',
        description: 'Door handle is broken.',
        priority: 'Low',
        status: 'Resolved',
        reportedByUserId: 'nurse1',
        dateReported: new Date('2024-08-14T09:00:00Z').toISOString(),
        dateResolved: new Date('2024-08-15T12:00:00Z').toISOString()
    }
];

export const mockSpareParts: SparePart[] = [
    {
        partId: 'CT-TUBE-01',
        name: 'CT Scanner X-Ray Tube',
        partNumber: 'Siemens-XRT-5000',
        compatibleWith: ['ct-1'],
        currentQuantity: 3,
        reorderLevel: 2,
        supplierId: 'SUP-002',
        location: 'Maintenance Depot A, Shelf 1',
    },
    {
        partId: 'DEFIB-PADS-01',
        name: 'Defibrillator Pads (Adult)',
        partNumber: 'Philips-DP-A01',
        compatibleWith: ['defib-1', 'defib-2'],
        currentQuantity: 15,
        reorderLevel: 20,
        supplierId: 'SUP-003',
        location: 'Maintenance Depot B, Shelf 4',
    }
];

export const mockSparePartsLog: SparePartLog[] = [
    {
        logId: 'SPLOG-1',
        partId: 'CT-TUBE-01',
        transactionType: 'Usage',
        quantityChange: -1,
        date: new Date('2024-07-20T10:00:00Z').toISOString(),
        userId: 'admin1',
        workOrderId: 'MR-PREV-CT',
        notes: 'Replaced tube during scheduled maintenance.',
    },
    {
        logId: 'SPLOG-2',
        partId: 'CT-TUBE-01',
        transactionType: 'Restock',
        quantityChange: 5,
        date: new Date('2024-06-15T14:00:00Z').toISOString(),
        userId: 'admin1',
        purchaseOrderId: 'PO-SPARE-005',
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

export const mockDiagnoses: Diagnosis[] = [
    {
        diagnosisId: 'diag-1',
        icd10Code: 'I10',
        diagnosisText: 'Essential (primary) hypertension',
        isPrimary: true,
        diagnosedByDoctorId: 'doc1',
        diagnosedAt: new Date('2024-07-28T11:00:00Z').toISOString()
    },
    {
        diagnosisId: 'diag-2',
        icd10Code: 'E11.9',
        diagnosisText: 'Type 2 diabetes mellitus without complications',
        isPrimary: false,
        diagnosedByDoctorId: 'doc1',
        diagnosedAt: new Date('2024-07-28T11:00:00Z').toISOString()
    }
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
    // Assets (1000 series)
    { accountId: '1000', accountName: 'Assets', accountCode: '1000', accountType: 'Asset', balance: 150000, isSubLedger: false, createdAt: now.toISOString() },
    { accountId: '1010', accountName: 'Cash and Bank', accountCode: '1010', accountType: 'Asset', balance: 50000, isSubLedger: false, createdAt: now.toISOString() },
    { accountId: '1011', accountName: 'Fidelity Bank - Main', accountCode: '1011', accountType: 'Asset', balance: 45000, isSubLedger: true, parentAccountId: '1010', createdAt: now.toISOString() },
    { accountId: '1012', accountName: 'MTN Mobile Money Wallet', accountCode: '1012', accountType: 'Asset', balance: 5000, isSubLedger: true, parentAccountId: '1010', createdAt: now.toISOString() },
    { accountId: '1020', accountName: 'Accounts Receivable', accountCode: '1020', accountType: 'Asset', balance: 100000, isSubLedger: true, parentAccountId: '1000', createdAt: now.toISOString() },
    // Liabilities (2000 series)
    { accountId: '2000', accountName: 'Liabilities', accountCode: '2000', accountType: 'Liability', balance: 80000, isSubLedger: false, createdAt: now.toISOString() },
    { accountId: '2011', accountName: 'Trade Payables', accountCode: '2011', accountType: 'Liability', balance: 65000, isSubLedger: true, parentAccountId: '2000', createdAt: now.toISOString() },
    { accountId: '2040', accountName: 'WHT Payable', accountCode: '2040', accountType: 'Liability', balance: 0, isSubLedger: true, parentAccountId: '2000', createdAt: now.toISOString() },
    { accountId: '2050', accountName: 'Staff Claim Account Payable', accountCode: '2050', accountType: 'Liability', balance: 15000, isSubLedger: true, parentAccountId: '2000', createdAt: now.toISOString() },
    // Equity (3000 series)
    { accountId: '3000', accountName: 'Equity', accountCode: '3000', accountType: 'Equity', balance: 70000, isSubLedger: false, createdAt: now.toISOString() },
    // Revenue (4000 series)
    { accountId: '4000', accountName: 'Revenue', accountCode: '4000', accountType: 'Revenue', balance: 250000, isSubLedger: false, createdAt: now.toISOString() },
    { accountId: '4010', accountName: 'Service Revenue', accountCode: '4010', accountType: 'Revenue', balance: 250000, isSubLedger: true, parentAccountId: '4000', createdAt: now.toISOString() },
    // Expenses (5000 series)
    { accountId: '5000', accountName: 'Expenses', accountCode: '5000', accountType: 'Expense', balance: 180000, isSubLedger: false, createdAt: now.toISOString() },
    { accountId: '5010', accountName: 'Salaries and Wages', accountCode: '5010', accountType: 'Expense', balance: 100000, isSubLedger: true, parentAccountId: '5000', createdAt: now.toISOString() },
    { accountId: '5020', accountName: 'Medical Supplies', accountCode: '5020', accountType: 'Expense', balance: 80000, isSubLedger: true, parentAccountId: '5000', createdAt: now.toISOString() },
    { accountId: '5030', accountName: 'General & Admin', accountCode: '5030', accountType: 'Expense', balance: 0, isSubLedger: true, parentAccountId: '5000', createdAt: now.toISOString() },
];

export const mockLedgerEntries: LedgerEntry[] = [
    { entryId: 'e-001', accountId: '1010', date: new Date('2024-08-01T00:00:00Z').toISOString(), description: 'Cash deposit from patient payment', debit: 5000.00 },
    { entryId: 'e-002', accountId: '1010', date: new Date('2024-08-02T00:00:00Z').toISOString(), description: 'Payment for medical supplies', credit: 2500.00 },
    { entryId: 'e-003', accountId: '2011', date: new Date('2024-08-02T00:00:00Z').toISOString(), description: 'Invoice from PharmaSupply Ltd.', credit: 2500.00 },
    { entryId: 'e-004', accountId: '1020', date: new Date('2024-08-03T00:00:00Z').toISOString(), description: 'Invoice INV-003 issued to patient', debit: 120.00 },
];

export const mockRevenueByDepartment = [
    { department: 'Consultations', revenue: 450000 },
    { department: 'Pharmacy', revenue: 320000 },
    { department: 'Laboratory', revenue: 210000 },
    { department: 'Radiology', revenue: 180000 },
];


export const mockStaffClaims: StaffExpenseClaim[] = [
    {
        claimId: 'SEC-001',
        staffId: 'doc2',
        staffName: 'Dr. Kofi Asante',
        hodId: 'doc1', // Dr. Mensah is the HOD
        expenseAccountId: '5030',
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
        expenseAccountId: '5030',
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
        expenseAccountId: '5030',
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
        leaveType: 'Annual Leave',
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
        leaveType: 'Specialist Leave',
        startDate: '2024-09-10',
        endDate: '2024-09-12',
        reason: 'Conference Attendance',
        status: 'Pending',
        requestedAt: new Date('2024-08-16T00:00:00Z').toISOString(),
    },
    {
        leaveId: 'LR-003',
        staffId: 'doc2',
        staffName: 'Dr. Kofi Asante',
        hodId: 'doc1',
        leaveType: 'Sick Leave',
        startDate: '2024-08-01',
        endDate: '2024-08-02',
        reason: 'Malaria',
        status: 'Approved',
        requestedAt: new Date('2024-08-01T08:00:00Z').toISOString(),
    },
    {
        leaveId: 'LR-004',
        staffId: 'nurse1',
        staffName: 'Florence Agyepong',
        hodId: 'doc1',
        leaveType: 'Annual Leave',
        startDate: '2024-07-20',
        endDate: '2024-07-22',
        reason: 'Personal Reasons',
        status: 'Rejected',
        requestedAt: new Date('2024-07-15T00:00:00Z').toISOString(),
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
        staffId: 'admin1',
        userId: 'admin1',
        employeeId: 'GAMMED/HR/000',
        firstName: 'Admin',
        lastName: 'User',
        gender: 'Other',
        dateOfBirth: '1990-01-01',
        employmentStatus: 'Active',
        positionId: 'pos-admin',
        recurringAllowances: [],
        recurringDeductions: [],
        bankDetails: { bankName: 'Fidelity Bank', accountNumber: '123456789', branchName: 'Legon' },
    },
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
        leaveBalances: { 'Annual Leave': 15, 'Sick Leave': 10 },
        recurringAllowances: [{ name: 'Book & Research Allowance', amount: 500 }],
        recurringDeductions: [{ name: 'Welfare Dues', amount: 50 }],
        bankDetails: { bankName: 'Fidelity Bank', accountNumber: '123456789', branchName: 'Legon' },
        performanceReviews: [{ reviewId: 'rev-doc1-2023', date: '2023-12-15', reviewerId: 'admin1', overallRating: 'Exceeds Expectations' }],
        trainingRecords: [{ trainingId: 'TRN001', courseName: 'Advanced Cardiac Life Support', completionDate: '2023-10-01', provider: 'American Heart Association' }],
        developmentGoals: [{ goalId: 'goal1', description: 'Publish research paper on hypertension', targetDate: '2024-12-31', status: 'In Progress' }]
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
        leaveBalances: { 'Annual Leave': 5, 'Sick Leave': 3 },
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
        leaveBalances: { 'Annual Leave': 12, 'Sick Leave': 8 },
        recurringAllowances: [],
        recurringDeductions: [{ name: 'Welfare Dues', amount: 30 }],
        bankDetails: { bankName: 'Absa Bank', accountNumber: '555444333', branchName: 'Spintex' }
    },
    {
        staffId: 'space_manager1',
        userId: 'space_manager1',
        employeeId: 'GAMMED/HR/004',
        firstName: 'Space',
        lastName: 'Manager',
        gender: 'Male',
        dateOfBirth: '1990-01-01',
        employmentStatus: 'Active',
        positionId: 'pos-admin',
        leaveBalances: { 'Annual Leave': 20, 'Sick Leave': 10 },
        recurringAllowances: [],
        recurringDeductions: [],
        bankDetails: { bankName: 'Fidelity Bank', accountNumber: '123456789', branchName: 'Legon' },
    },
    {
        staffId: 'housekeeper1',
        userId: 'housekeeper1',
        employeeId: 'GAMMED/HR/005',
        firstName: 'House',
        lastName: 'Keeper',
        gender: 'Female',
        dateOfBirth: '1988-01-01',
        employmentStatus: 'Active',
        positionId: 'pos-admin', // Placeholder
        leaveBalances: { 'Annual Leave': 18, 'Sick Leave': 10 },
        recurringAllowances: [],
        recurringDeductions: [],
        bankDetails: { bankName: 'Fidelity Bank', accountNumber: '111222333', branchName: 'Legon' },
    },
    {
        staffId: 'rad1',
        userId: 'rad1',
        employeeId: 'GAMMED/HR/006',
        firstName: 'Amina',
        lastName: 'El-Rufai',
        gender: 'Female',
        dateOfBirth: '1985-05-05',
        employmentStatus: 'Active',
        positionId: 'pos-doc',
        recurringAllowances: [],
        recurringDeductions: [],
        bankDetails: { bankName: 'Stanbic Bank', accountNumber: '456123789', branchName: 'Airport City' }
    },
    {
        staffId: 'pharma1',
        userId: 'pharma1',
        employeeId: 'GAMMED/HR/007',
        firstName: 'James',
        lastName: 'Boateng',
        gender: 'Male',
        dateOfBirth: '1988-08-08',
        employmentStatus: 'Active',
        positionId: 'pos-admin', // Placeholder
        recurringAllowances: [],
        recurringDeductions: [],
        bankDetails: { bankName: 'EcoBank', accountNumber: '789456123', branchName: 'East Legon' }
    },
    {
        staffId: 'labtech1',
        userId: 'labtech1',
        employeeId: 'GAMMED/HR/008',
        firstName: 'Lab',
        lastName: 'Technician',
        gender: 'Female',
        dateOfBirth: '1992-12-12',
        employmentStatus: 'Active',
        positionId: 'pos-jnr-nurse', // Placeholder
        recurringAllowances: [],
        recurringDeductions: [],
        bankDetails: { bankName: 'CalBank', accountNumber: '321654987', branchName: 'Tema' }
    },
    {
        staffId: 'otc1',
        userId: 'otc1',
        employeeId: 'GAMMED/HR/009',
        firstName: 'OT',
        lastName: 'Coordinator',
        gender: 'Male',
        dateOfBirth: '1989-09-09',
        employmentStatus: 'Active',
        positionId: 'pos-snr-nurse', // Placeholder
        recurringAllowances: [],
        recurringDeductions: [],
        bankDetails: { bankName: 'Republic Bank', accountNumber: '654987321', branchName: 'Osu' }
    },
    {
        staffId: 'billing1',
        userId: 'billing1',
        employeeId: 'GAMMED/HR/010',
        firstName: 'Billing',
        lastName: 'Clerk',
        gender: 'Female',
        dateOfBirth: '1995-04-04',
        employmentStatus: 'Active',
        positionId: 'pos-admin', // Placeholder
        recurringAllowances: [],
        recurringDeductions: [],
        bankDetails: { bankName: 'GT Bank', accountNumber: '147258369', branchName: 'Accra Mall' }
    },
    {
        staffId: 'reception1',
        userId: 'reception1',
        employeeId: 'GAMMED/HR/011',
        firstName: 'Reception',
        lastName: 'Staff',
        gender: 'Female',
        dateOfBirth: '1998-01-01',
        employmentStatus: 'Active',
        positionId: 'pos-admin', // Placeholder
        recurringAllowances: [],
        recurringDeductions: [],
        bankDetails: { bankName: 'GT Bank', accountNumber: '147258369', branchName: 'Accra Mall' }
    },
    {
        staffId: 'dietitian1',
        userId: 'dietitian1',
        employeeId: 'GAMMED/HR/012',
        firstName: 'Dietitian',
        lastName: 'User',
        gender: 'Male',
        dateOfBirth: '1991-11-11',
        employmentStatus: 'Active',
        positionId: 'pos-snr-nurse', // Placeholder
        recurringAllowances: [],
        recurringDeductions: [],
        bankDetails: { bankName: 'UBA', accountNumber: '369258147', branchName: 'Legon' }
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

export const mockInfectionReports: InfectionReport[] = [
    {
        reportId: 'inf-rep-2024-07',
        month: 'July 2024',
        totalPatientDays: 4500,
        infectionCount: 9,
        ratePer1000Days: 2.0,
        breakdownByWard: {
            'Surgical': 4,
            'Medical': 3,
            'ICU': 2
        }
    }
];

export const mockEfficacyReports: EfficacyReport[] = [
    {
        reportId: 'eff-rep-1',
        treatmentPlanTitle: 'Standard Hypertension Management',
        averageEfficacy: 4.5,
        totalCases: 50,
    },
    {
        reportId: 'eff-rep-2',
        treatmentPlanTitle: 'Aggressive Diabetes Control',
        averageEfficacy: 3.8,
        totalCases: 35,
    }
];

export const mockOtSessions: OTSession[] = [
    {
        sessionId: 'session-1',
        patientId: 'P-999999',
        otRoomId: 'OT-1',
        procedureName: 'Appendectomy',
        patientName: 'John Doe',
        leadSurgeonName: 'Dr. Evelyn Mensah',
        leadSurgeonId: 'doc1',
        startTime: new Date('2024-08-16T09:00:00Z'),
        endTime: new Date('2024-08-16T11:00:00Z'),
        status: 'Completed',
        postOpNotes: 'Procedure was successful. Patient tolerated well. Standard post-op care required.'
    },
    {
        sessionId: 'session-2',
        patientId: 'P-888888',
        otRoomId: 'OT-1',
        procedureName: 'Hernia Repair',
        patientName: 'Jane Smith',
        leadSurgeonName: 'Dr. Kofi Asante',
        leadSurgeonId: 'doc2',
        startTime: new Date('2024-08-16T12:00:00Z'),
        endTime: new Date('2024-08-16T14:30:00Z'),
        status: 'In Progress'
    },
    {
        sessionId: 'session-3',
        patientId: 'P-123456',
        otRoomId: 'OT-3',
        procedureName: 'Knee Replacement',
        patientName: 'Kwame Owusu',
        leadSurgeonName: 'Dr. Amina El-Rufai',
        leadSurgeonId: 'rad1', // Assuming radiologist can be a surgeon for mock data
        startTime: new Date('2024-08-17T10:00:00Z'),
        endTime: new Date('2024-08-17T13:00:00Z'),
        status: 'Scheduled'
    },
];

export const mockDietaryProfiles: DietaryProfile[] = [
    {
        profileId: 'P-123456',
        patientId: 'P-123456',
        allergies: ['Peanuts'],
        restrictions: ['Low Sodium', 'Low Sugar'],
        preferences: ['Prefers spicy food', 'Likes soups']
    }
];

export const mockMealOrders: MealOrder[] = [
    {
        mealOrderId: 'meal-1',
        patientId: 'P-123456',
        orderDateTime: new Date('2024-08-16T08:00:00Z').toISOString(),
        mealType: 'Breakfast',
        dietaryPlan: 'Low Sodium',
        mealItems: ['Oatmeal', 'Banana', 'Water'],
        status: 'Delivered'
    },
    {
        mealOrderId: 'meal-2',
        patientId: 'P-654321',
        orderDateTime: new Date('2024-08-16T12:00:00Z').toISOString(),
        mealType: 'Lunch',
        dietaryPlan: 'Diabetic',
        mealItems: ['Grilled Chicken Salad', 'Brown Rice'],
        status: 'Preparing'
    },
     {
        mealOrderId: 'meal-3',
        patientId: 'P-123456',
        orderDateTime: new Date('2024-08-16T12:05:00Z').toISOString(),
        mealType: 'Lunch',
        dietaryPlan: 'Low Sodium',
        mealItems: ['Banku and Tilapia', 'Water'],
        status: 'Ordered'
    }
];

export const mockPerformanceReviews: PerformanceReview[] = [
    {
        reviewId: 'rev-doc1-2023',
        employeeId: 'doc1',
        reviewerId: 'admin1',
        dateOfReview: '2023-12-15T00:00:00Z',
        ratingPeriodStart: '2023-01-01T00:00:00Z',
        ratingPeriodEnd: '2023-12-31T00:00:00Z',
        overallRating: 'Exceeds Expectations',
        strengths: 'Excellent patient care and leadership skills.',
        areasForDevelopment: 'Continue to mentor junior doctors.',
        goalsAchieved: [],
        trainingRecommendations: 'Consider leadership in medicine course.',
        nextReviewDate: '2024-12-15T00:00:00Z',
    }
];

export const mockTrainingCourses: TrainingCourse[] = [
    { courseId: 'TRN001', courseName: 'Advanced Cardiac Life Support', description: 'ACLS certification.', provider: 'American Heart Association', duration: '2 Days', type: 'Mandatory' },
    { courseId: 'TRN002', courseName: 'Introduction to Hospital Management', description: 'Course for new managers.', provider: 'GamMed HR', duration: '5 Days', type: 'Leadership' },
];

export const mockFacilityZones: FacilityZone[] = [
    { zoneId: 'Main-Lobby', name: 'Main Hospital Lobby', managerId: 'admin1', maintenanceRequests: 1 },
    { zoneId: 'Ward-A', name: 'General Medical Ward A', managerId: 'nurse1', maintenanceRequests: 0 },
    { zoneId: 'Radiology-Dept', name: 'Radiology Department', managerId: 'rad1', maintenanceRequests: 0 },
];

export const mockUtilityMeters: Meter[] = [
    { meterId: 'ELEC-MAIN', type: 'Electricity', location: 'Main Building', unit: 'kWh' },
    { meterId: 'WATER-MAIN', type: 'Water', location: 'Main Building', unit: 'm³' },
];

export const mockUtilityConsumption: UtilityConsumption[] = [
    { logId: 'log-e-1', date: '2024-08-15', meterId: 'ELEC-MAIN', type: 'Electricity', reading: 15000, consumption: 500 },
    { logId: 'log-e-2', date: '2024-08-14', meterId: 'ELEC-MAIN', type: 'Electricity', reading: 14500, consumption: 480 },
    { logId: 'log-w-1', date: '2024-08-15', meterId: 'WATER-MAIN', type: 'Water', reading: 800, consumption: 25 },
    { logId: 'log-w-2', date: '2024-08-14', meterId: 'WATER-MAIN', type: 'Water', reading: 775, consumption: 22 },
];

export const mockSecurityIncidents: SecurityIncident[] = [
    {
        incidentId: 'inc-1',
        timestamp: new Date('2024-08-16T02:30:00Z').toISOString(),
        type: 'Unauthorized Access',
        location: 'Pharmacy Storage',
        reportedByUserId: 'admin1',
        details: 'CCTV footage shows an individual attempting to access the pharmacy storage area after hours.',
        status: 'Under Investigation',
    },
    {
        incidentId: 'inc-2',
        timestamp: new Date('2024-08-15T15:00:00Z').toISOString(),
        type: 'Dispute',
        location: 'Parking Lot B',
        reportedByUserId: 'admin1',
        details: 'Verbal altercation between two visitors over a parking space. Resolved by security patrol.',
        status: 'Resolved',
        resolutionNotes: 'Parties were separated and warned. No further action needed.',
    }
];

export const mockHousekeepingTasks: HousekeepingTask[] = [
    {
        taskId: 'hk-1',
        type: 'Room Cleaning',
        location: 'Room C-102',
        status: 'Pending',
        dateCreated: new Date('2024-08-16T09:00:00Z').toISOString(),
        notes: 'Patient discharged. Terminal cleaning required.'
    },
    {
        taskId: 'hk-2',
        type: 'Waste Disposal',
        location: 'OR-B',
        status: 'Pending',
        dateCreated: new Date('2024-08-16T10:00:00Z').toISOString(),
        notes: 'Surgical waste requires pickup.'
    }
];

export const mockSavedReports: SavedReport[] = [
    {
        reportId: 'rep-1',
        userId: 'admin1',
        reportName: 'Monthly Admission Counts by Ward',
        description: 'Shows the total number of patient admissions for each ward over the last 30 days.',
        queryDetails: {
            collections: ['admissions'],
            filters: { 'dateRange': 'Last 30 Days' },
            metrics: ['count'],
            groupBy: 'ward'
        }
    },
    {
        reportId: 'rep-2',
        userId: 'admin1',
        reportName: 'Revenue by Patient Type (YTD)',
        description: 'Total revenue generated, grouped by patient pricing tier (private, corporate, public) for the year to date.',
        queryDetails: {
            collections: ['invoices'],
            filters: { 'dateRange': 'Year to Date' },
            metrics: ['sum:totalAmount'],
            groupBy: 'patientType'
        }
    }
];

export const mockMessages: Message[] = [
    {
        messageId: 'msg1',
        senderId: 'doc1',
        senderName: 'Dr. Evelyn Mensah',
        receiverId: 'patient1',
        messageBody: 'Hello Kwame, your recent lab results are back and look good. We will discuss them at your next appointment.',
        timestamp: new Date('2024-08-14T10:00:00Z').toISOString(),
        isRead: true,
    },
    {
        messageId: 'msg2',
        senderId: 'patient1',
        senderName: 'Kwame Owusu',
        receiverId: 'doc1',
        messageBody: 'Thank you, Doctor. That is great news!',
        timestamp: new Date('2024-08-14T11:30:00Z').toISOString(),
        isRead: true,
    },
    {
        messageId: 'msg3',
        senderId: 'doc1',
        senderName: 'Dr. Evelyn Mensah',
        receiverId: 'patient1',
        messageBody: 'You are welcome. Remember to continue monitoring your blood pressure at home.',
        timestamp: new Date('2024-08-14T11:32:00Z').toISOString(),
        isRead: false,
    },
     {
        messageId: 'msg4',
        senderId: 'nurse1',
        senderName: 'Florence Agyepong',
        receiverId: 'patient1',
        messageBody: 'Hi Kwame, just a reminder to fast before your procedure tomorrow.',
        timestamp: new Date('2024-08-15T16:00:00Z').toISOString(),
        isRead: false,
    }
];

export const mockReminders: Reminder[] = [
    {
        reminderId: 'rem-1',
        patientId: 'P-123456',
        type: 'Medication',
        scheduledDateTime: new Date('2024-08-16T20:00:00Z').toISOString(),
        message: 'Time to take your Atorvastatin (20mg).',
        isSent: false,
        relatedDocId: 'med-2'
    },
    {
        reminderId: 'rem-2',
        patientId: 'P-123456',
        type: 'Appointment',
        scheduledDateTime: new Date('2024-08-19T09:00:00Z').toISOString(), // For the appointment on the 20th
        message: 'Reminder: You have a virtual consultation with Dr. Kofi Asante tomorrow.',
        isSent: false,
        relatedDocId: 'AP-003'
    }
];

export const mockHealthContent: HealthContent[] = [
    {
        contentId: 'hc-1',
        title: 'Managing Your Hypertension',
        body: 'Hypertension, or high blood pressure, is a common condition... Here are five key things you can do:\n\n1. Monitor your blood pressure regularly.\n2. Reduce your salt intake.\n3. Engage in regular physical activity.\n4. Take your prescribed medications consistently.\n5. Manage stress through relaxation techniques.',
        keywords: ['hypertension', 'blood pressure'],
        fileUrl: '/public/hypertension_guide.pdf'
    },
    {
        contentId: 'hc-2',
        title: 'Understanding Your Lipid Panel Results',
        body: 'A lipid panel is a blood test that measures the amount of cholesterol and other fats in your blood...',
        keywords: ['lipid', 'cholesterol'],
    },
];

export const mockAuditLogs: AuditLog[] = [
  {
    logId: 'audit-1',
    timestamp: new Date('2024-08-16T10:10:00Z').toISOString(),
    userId: 'doc1',
    action: 'ACCESSED_PATIENT_EHR',
    details: { targetCollection: 'patients', targetDocId: 'P-123456' },
  },
  {
    logId: 'audit-2',
    timestamp: new Date('2024-08-16T10:05:00Z').toISOString(),
    userId: 'admin1',
    action: 'UPDATE_USER_ROLE',
    details: { targetCollection: 'users', targetDocId: 'nurse1', changes: { role: 'senior_nurse' } },
  },
  {
    logId: 'audit-3',
    timestamp: new Date('2024-08-16T09:55:00Z').toISOString(),
    userId: 'billing1',
    action: 'CREATE_INVOICE',
    details: { targetCollection: 'invoices', targetDocId: 'INV-004' },
  },
];


// Deprecated type, use PurchaseOrder instead
export type PharmacyOrder = PurchaseOrder;
    
// Deprecated type, use Asset instead
export type Resource = Asset;




    

    


    
