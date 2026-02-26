import { Hospital, User, Patient, Appointment, Admission, Bed, Referral, LabResult, ClinicalNote, VitalsLog, CarePlan, MedicationRecord, PatientAlert, ImmunizationRecord, Vaccine, Asset, ResourceBooking, WaitingListEntry, Invoice, Claim, FinancialTransaction, Prescription, PricingTable, Receipt, Bill, Supplier, LedgerAccount, LedgerEntry, StaffExpenseClaim, LeaveRequest, PayrollRun, PayrollRecord, StaffProfile, PayrollConfiguration, Allowance, Deduction, Position, InventoryItem, PurchaseOrder, PrescribedMedication, ControlledSubstance, ControlledSubstanceLog, LabTest, SampleAudit, EquipmentLog, LabReport, RadiologyStudy, RadiologyOrder, RadiologyReport, OTSession, DietaryProfile, MealOrder, PerformanceReview, TrainingCourse, FacilityZone, WorkOrder, SparePart, SparePartLog, Meter, UtilityConsumption, SecurityIncident, HousekeepingTask, DepreciationRecord, InfectionReport, EfficacyReport, SavedReport, Message, Reminder, HealthContent, AuditLog, Diagnosis, RequestForQuotation } from './types';

const now = new Date('2024-08-16T10:15:00.000Z');

// --------------------------------------------------------------------
// == TENANT MASTER DATA ==
// --------------------------------------------------------------------

export const mockHospitals: Hospital[] = [
  {
    hospitalId: 'GAMMED_INTERNAL',
    name: 'GamMed Platform Operations',
    slug: 'gammed-internal',
    status: 'active',
    subscriptionTier: 'enterprise',
    createdAt: new Date('2020-01-01').toISOString(),
  },
  {
    hospitalId: 'hosp-1',
    name: 'City General Hospital',
    slug: 'city-general',
    status: 'active',
    subscriptionTier: 'professional',
    createdAt: new Date('2020-01-01').toISOString(),
  },
  {
    hospitalId: 'hosp-2',
    name: 'St. Mary Specialized Clinic',
    slug: 'st-mary',
    status: 'active',
    subscriptionTier: 'clinic-starter',
    createdAt: new Date('2021-06-15').toISOString(),
  }
];

// --------------------------------------------------------------------
// == USER & STAFF PROFILES ==
// --------------------------------------------------------------------

export const allUsers: User[] = [
  {
    uid: 'GAMMED_INTERNAL_superadmin@gammed.com',
    hospitalId: 'GAMMED_INTERNAL',
    email: 'superadmin@gammed.com',
    name: 'Platform Owner',
    role: 'super_admin',
    is_active: true,
    created_at: now.toISOString(),
    last_login: now.toISOString(),
    photoURL: 'https://picsum.photos/seed/superadmin/200',
    features: ['surgical_module'],
  },
  {
    uid: 'hosp-1_director@cityhosp.com',
    hospitalId: 'hosp-1',
    email: 'director@cityhosp.com',
    name: 'Dr. Samuel Mensah',
    role: 'director',
    is_active: true,
    created_at: now.toISOString(),
    last_login: now.toISOString(),
    photoURL: 'https://picsum.photos/seed/director1/200',
    features: ['surgical_module'],
  },
  {
    uid: 'hosp-1_admin@gammed.com',
    hospitalId: 'hosp-1',
    email: 'admin@gammed.com',
    name: 'Admin User',
    role: 'admin',
    is_active: true,
    created_at: now.toISOString(),
    last_login: now.toISOString(),
    photoURL: 'https://picsum.photos/seed/admin1/200',
    features: ['surgical_module'],
  },
  {
    uid: 'hosp-1_e.mensah@gammed.com',
    hospitalId: 'hosp-1',
    email: 'e.mensah@gammed.com',
    name: 'Dr. Evelyn Mensah',
    role: 'doctor',
    is_active: true,
    specialty: 'Cardiology',
    department: 'Cardiology',
    hodId: 'hosp-1_admin@gammed.com',
    created_at: now.toISOString(),
    last_login: now.toISOString(),
    availability: { '2024-08-16': ['09:00', '10:00', '11:00', '14:00', '15:00'] },
    photoURL: 'https://picsum.photos/seed/doc1/200',
    features: ['surgical_module'],
  },
  {
    uid: 'hosp-1_f.agyepong@gammed.com',
    hospitalId: 'hosp-1',
    email: 'f.agyepong@gammed.com',
    name: 'F. Agyepong',
    role: 'nurse',
    is_active: true,
    department: 'Nursing',
    created_at: now.toISOString(),
    last_login: now.toISOString(),
    photoURL: 'https://picsum.photos/seed/nurse1/200',
    features: ['surgical_module'],
  },
  {
    uid: 'hosp-2_doctor@stmary.com',
    hospitalId: 'hosp-2',
    email: 'doctor@stmary.com',
    name: 'Dr. Samuel Boateng',
    role: 'doctor',
    is_active: true,
    specialty: 'General Practice',
    department: 'OPD',
    created_at: now.toISOString(),
    last_login: now.toISOString(),
    photoURL: 'https://picsum.photos/seed/doch21/200',
  }
];

export const mockStaffProfiles: StaffProfile[] = [
  {
    staffId: 'hosp-1_e.mensah@gammed.com',
    hospitalId: 'hosp-1',
    firstName: 'Evelyn',
    lastName: 'Mensah',
    positionId: 'POS-1',
    department: 'Cardiology',
    employmentStatus: 'Active',
    recurringAllowances: [{ name: 'Housing', amount: 500 }, { name: 'Transport', amount: 200 }],
    recurringDeductions: [{ name: 'Staff Welfare', amount: 50 }],
    leaveBalances: { 'Annual Leave': 15, 'Sick Leave': 10 },
  },
  {
    staffId: 'hosp-1_f.agyepong@gammed.com',
    hospitalId: 'hosp-1',
    firstName: 'Felicia',
    lastName: 'Agyepong',
    positionId: 'POS-2',
    department: 'Nursing',
    employmentStatus: 'Active',
    recurringAllowances: [{ name: 'Transport', amount: 150 }],
    recurringDeductions: [],
    leaveBalances: { 'Annual Leave': 20, 'Sick Leave': 12 },
  }
];

// --------------------------------------------------------------------
// == PATIENTS & CLINICAL DATA ==
// --------------------------------------------------------------------

export const allPatients: Patient[] = [
  {
    patient_id: 'hosp-1_MRN123456',
    hospitalId: 'hosp-1',
    mrn: '123456',
    title: 'Mr',
    first_name: 'Kwame',
    last_name: 'Owusu',
    full_name: 'Kwame Owusu',
    full_name_lowercase: 'kwame owusu',
    phone_search: '233241234567',
    dob: '1985-05-20',
    gender: 'Male',
    patientType: 'private',
    maritalStatus: 'Married',
    occupation: 'Software Engineer',
    contact: {
      primaryPhone: '+233241234567',
      email: 'k.owusu@email.com',
      address: { street: '123 Osu Street', city: 'Accra', region: 'Greater Accra', country: 'Ghana' },
    },
    emergency_contact: { name: 'Adwoa Owusu', relationship: 'Spouse', phone: '+233204123789' },
    is_admitted: true,
    current_admission_id: 'A-001',
    status: 'active',
    created_at: new Date('2023-10-15T09:00:00Z').toISOString(),
    updated_at: now.toISOString(),
    allergies: ['Penicillin'],
  },
  {
    patient_id: 'hosp-1_MRN654321',
    hospitalId: 'hosp-1',
    mrn: '654321',
    title: 'Mrs',
    first_name: 'Abena',
    last_name: 'Mensah',
    full_name: 'Abena Mensah',
    full_name_lowercase: 'abena mensah',
    phone_search: '233241999888',
    dob: '1992-11-05',
    gender: 'Female',
    patientType: 'corporate',
    maritalStatus: 'Single',
    occupation: 'Marketing Manager',
    contact: {
      primaryPhone: '+233241999888',
      email: 'a.mensah@email.com',
      address: { street: '45 Ring Road', city: 'Accra', region: 'Greater Accra', country: 'Ghana' },
    },
    emergency_contact: { name: 'Kofi Mensah', relationship: 'Father', phone: '+233201112223' },
    is_admitted: false,
    status: 'active',
    created_at: new Date('2024-01-10T11:00:00Z').toISOString(),
    updated_at: now.toISOString(),
  }
];

export const allAdmissions: Admission[] = [
  {
    admission_id: 'A-001',
    hospitalId: 'hosp-1',
    patient_id: 'hosp-1_MRN123456',
    type: 'Inpatient',
    admission_date: new Date('2024-07-28T10:30:00Z').toISOString(),
    reasonForVisit: 'Severe chest pain and elevated BP',
    ward: 'Cardiology',
    bed_id: 'C-101',
    attending_doctor_id: 'hosp-1_e.mensah@gammed.com',
    attending_doctor_name: 'Dr. Evelyn Mensah',
    status: 'Admitted',
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    readmission_flag: false,
  },
  {
    admission_id: 'A-002',
    hospitalId: 'hosp-1',
    patient_id: 'hosp-1_MRN123456',
    type: 'Inpatient',
    admission_date: new Date('2024-06-15T09:00:00Z').toISOString(),
    discharge_date: new Date('2024-06-20T14:00:00Z').toISOString(),
    reasonForVisit: 'Hypertension monitoring',
    ward: 'Cardiology',
    bed_id: 'C-105',
    attending_doctor_id: 'hosp-1_e.mensah@gammed.com',
    attending_doctor_name: 'Dr. Evelyn Mensah',
    status: 'Discharged',
    summary_pdf_url: '/mock-summary.pdf',
    created_at: new Date('2024-06-15T09:00:00Z').toISOString(),
    updated_at: now.toISOString(),
    readmission_flag: true,
  }
];

export const allAppointments: Appointment[] = [
  {
    id: 'AP-001',
    appointment_id: 'AP-001',
    hospitalId: 'hosp-1',
    patient_id: 'hosp-1_MRN123456',
    patient_name: 'Kwame Owusu',
    doctor_id: 'hosp-1_e.mensah@gammed.com',
    doctor_name: 'Dr. Evelyn Mensah',
    appointment_date: new Date('2024-08-16T10:30:00.000Z').toISOString(),
    time_slot: '10:30 AM',
    reason: 'Follow-up cardiology consultation',
    createdAt: now.toISOString(),
    end_time: new Date('2024-08-16T11:00:00.000Z').toISOString(),
    duration: 30,
    type: 'follow-up',
    department: 'Cardiology',
    status: 'confirmed',
    isBilled: false,
    isConfirmed: true,
    bookingMethod: 'Front Desk',
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  }
];

export const mockNotes: ClinicalNote[] = [
  {
    noteId: 'N-001',
    hospitalId: 'hosp-1',
    patientId: 'hosp-1_MRN123456',
    noteType: 'Consultation',
    recordedByUserId: 'hosp-1_e.mensah@gammed.com',
    noteText: 'Patient presented with stable BP. Advised to continue current medication and reduce sodium intake.',
    recordedAt: new Date('2024-08-16T10:45:00Z').toISOString(),
  },
  {
    noteId: 'N-002',
    hospitalId: 'hosp-1',
    patientId: 'hosp-1_MRN123456',
    noteType: 'Nursing Note',
    recordedByUserId: 'hosp-1_f.agyepong@gammed.com',
    noteText: 'Vitals stable. Patient compliant with dietary restrictions.',
    recordedAt: new Date('2024-08-16T11:30:00Z').toISOString(),
  }
];

export const mockDiagnoses: Diagnosis[] = [
  {
    id: 'D-001',
    diagnosisId: 'D-001',
    hospitalId: 'hosp-1',
    patientId: 'hosp-1_MRN123456',
    diagnosisText: 'Essential Hypertension',
    icd10Code: 'I10',
    diagnosedAt: new Date('2023-10-15T10:00:00Z').toISOString(),
    diagnosedByDoctorId: 'hosp-1_e.mensah@gammed.com',
    isPrimary: true,
  }
];

export const mockCarePlans: CarePlan[] = [
  {
    planId: 'CP-001',
    hospitalId: 'hosp-1',
    patientId: 'hosp-1_MRN123456',
    title: 'Hypertension Management Plan',
    goal: 'Maintain BP below 130/80 mmHg',
    interventions: ['Daily BP monitoring', 'Low sodium diet', 'Administer Amlodipine 5mg daily'],
    status: 'Active',
    createdBy: 'hosp-1_e.mensah@gammed.com',
    createdAt: new Date('2023-10-15T10:30:00Z').toISOString(),
    updatedBy: 'hosp-1_e.mensah@gammed.com',
    updatedAt: now.toISOString(),
  }
];

// --------------------------------------------------------------------
// == PHARMACY & INVENTORY ==
// --------------------------------------------------------------------

export const mockInventory: InventoryItem[] = [
  {
    itemId: 'MED-001',
    hospitalId: 'hosp-1',
    name: 'Amlodipine 5mg',
    type: 'Anti-hypertensive',
    unit: 'Tablet',
    reorderLevel: 100,
    currentQuantity: 450,
    unitPrice: 1.50,
    batches: [
      { batchNumber: 'B-101', expiryDate: '2025-12-31T00:00:00Z', currentQuantity: 200, dateReceived: '2024-01-10T00:00:00Z' },
      { batchNumber: 'B-102', expiryDate: '2026-06-30T00:00:00Z', currentQuantity: 250, dateReceived: '2024-05-15T00:00:00Z' }
    ]
  },
  {
    itemId: 'MED-002',
    hospitalId: 'hosp-1',
    name: 'Paracetamol 500mg',
    type: 'Analgesic',
    unit: 'Tablet',
    reorderLevel: 200,
    currentQuantity: 8,
    unitPrice: 0.50,
    batches: [
      { batchNumber: 'B-201', expiryDate: '2025-06-30T00:00:00Z', currentQuantity: 8, dateReceived: '2024-02-10T00:00:00Z' }
    ]
  }
];

export const mockPrescriptions: Prescription[] = [
  {
    prescriptionId: 'RX-001',
    hospitalId: 'hosp-1',
    patientId: 'hosp-1_MRN123456',
    patientName: 'Kwame Owusu',
    doctorId: 'hosp-1_e.mensah@gammed.com',
    datePrescribed: now.toISOString(),
    status: 'Pending',
    medications: [{ medicationId: 'MED-001', name: 'Amlodipine', dosage: '5mg', frequency: 'Daily', quantity_to_dispense: 30 }]
  }
];

export const mockMedicationRecords: MedicationRecord[] = [
  {
    prescriptionId: 'RX-001',
    hospitalId: 'hosp-1',
    patientId: 'hosp-1_MRN123456',
    patientName: 'Kwame Owusu',
    medicationName: 'Amlodipine',
    dosage: '5mg',
    frequency: 'Daily',
    instructions: 'Take one tablet every morning.',
    prescribedByDoctorId: 'hosp-1_e.mensah@gammed.com',
    prescribedByDoctorName: 'Dr. Evelyn Mensah',
    prescribedAt: now.toISOString(),
    status: 'Active'
  }
];

export const mockSuppliers: Supplier[] = [
  {
    supplierId: 'V-001',
    hospitalId: 'hosp-1',
    name: 'Ghana Medical Supplies Ltd',
    contactInfo: { person: 'John K. Frimpong', email: 'john@ghanameds.com', phone: '+233240000001', address: 'Accra Industrial Area' },
    paymentTerms: 'Net 30',
  }
];

export const mockPurchaseOrders: PurchaseOrder[] = [
  {
    poId: 'PO-001',
    hospitalId: 'hosp-1',
    dateOrdered: now.toISOString(),
    status: 'Submitted',
    orderedByUserId: 'hosp-1_admin@gammed.com',
    supplierId: 'V-001',
    orderedItems: [{ itemId: 'MED-001', name: 'Amlodipine 5mg', quantity: 500, unit_cost: 0.50 }],
    totalAmount: 250.00
  }
];

// --------------------------------------------------------------------
// == LAB & RADIOLOGY ==
// --------------------------------------------------------------------

export const mockLabResults: LabResult[] = [
  {
    id: 'L-001',
    testId: 'L-001',
    hospitalId: 'hosp-1',
    patientId: 'hosp-1_MRN123456',
    patientName: 'Kwame Owusu',
    testName: 'Full Blood Count (FBC)',
    status: 'Validated',
    orderedAt: new Date('2024-08-15T09:00:00Z').toISOString(),
    completedAt: now.toISOString(),
    isBilled: true,
    resultPdfUrl: '/mock-lab-result.pdf',
    sampleDetails: {
      barcode: 'SAMPLE-001',
      sampleStatus: 'Received in Lab',
      collectionDate: new Date('2024-08-15T10:00:00Z').toISOString(),
      collectedByUserId: 'hosp-1_f.agyepong@gammed.com',
      auditLog: [{ auditId: 'A-1', hospitalId: 'hosp-1', timestamp: now.toISOString(), action: 'Sample Received', location: 'Main Lab', userId: 'hosp-1_admin@gammed.com' }]
    },
    resultDetails: { WBC: '7.5', RBC: '5.2', HGB: '14.5' }
  }
];

export const mockRadiologyOrders: RadiologyOrder[] = [
  {
    id: 'RAD-001',
    orderId: 'RAD-001',
    hospitalId: 'hosp-1',
    patientId: 'hosp-1_MRN123456',
    patientName: 'Kwame Owusu',
    patientMrn: '123456',
    doctorId: 'hosp-1_e.mensah@gammed.com',
    doctorName: 'Dr. Evelyn Mensah',
    dateOrdered: now.toISOString(),
    created_at: now.toISOString(),
    test_name: 'Chest X-Ray',
    modality: 'X-Ray',
    indication: 'Persistent cough',
    status: 'Pending Scheduling',
    priority: 2,
  }
];

// --------------------------------------------------------------------
// == FINANCIALS & BILLING ==
// --------------------------------------------------------------------

export const mockLedgerAccounts: LedgerAccount[] = [
  { accountId: '1010', hospitalId: 'hosp-1', accountName: 'Cash at Bank', accountCode: '1010', accountType: 'Asset', balance: 50000, isSubLedger: false, createdAt: '2024-01-01T00:00:00Z' },
  { accountId: '1020', hospitalId: 'hosp-1', accountName: 'Accounts Receivable', accountCode: '1020', accountType: 'Asset', balance: 15000, isSubLedger: false, createdAt: '2024-01-01T00:00:00Z' }
];

export const mockLedgerEntries: LedgerEntry[] = [
  { entryId: 'E-001', hospitalId: 'hosp-1', accountId: '1010', date: now.toISOString(), description: 'Opening Balance Migration', debit: 50000 }
];

export const mockInvoices: Invoice[] = [
  {
    invoiceId: 'INV-001',
    hospitalId: 'hosp-1',
    patientId: 'hosp-1_MRN123456',
    patientName: 'Kwame Owusu',
    patientType: 'private',
    issueDate: new Date('2024-08-01T09:00:00Z').toISOString(),
    dueDate: new Date('2024-08-31T09:00:00Z').toISOString(),
    billedItems: [{ serviceType: 'Consultation', linkedServiceId: 'AP-001', billingCode: 'A001', price: 150 }],
    subtotal: 150,
    vatOption: 'zero',
    vat: 0, nhia: 0, getfund: 0, covidLevy: 0, totalTax: 0,
    grandTotal: 150,
    amountDue: 150,
    status: 'Pending Payment'
  }
];

// --------------------------------------------------------------------
// == FACILITIES & SPACE ==
// --------------------------------------------------------------------

export const mockResources: Asset[] = [
  {
    assetId: 'EQUIP-001',
    hospitalId: 'hosp-1',
    name: 'Siemens CT Scanner',
    type: 'Medical Equipment',
    department: 'Radiology',
    location: 'Imaging Suite A',
    status: 'Operational',
    isBookable: true,
    modality: 'CT Scan'
  }
];

export const allBeds: Bed[] = [
  { id: 'C-101', bed_id: 'C-101', hospitalId: 'hosp-1', wardName: 'Cardiology', wardId: 'ward-1', bedNumber: 'Bed 101', room_number: '10', status: 'occupied', current_patient_id: 'hosp-1_MRN123456', currentPatientId: 'hosp-1_MRN123456', occupied_since: '2024-07-28T10:30:00Z', occupiedSince: '2024-07-28T10:30:00Z', cleaningNeeded: false, type: 'Manual', created_at: now.toISOString(), createdAt: now.toISOString(), updated_at: now.toISOString(), updatedAt: now.toISOString() },
  { id: 'C-102', bed_id: 'C-102', hospitalId: 'hosp-1', wardName: 'Cardiology', wardId: 'ward-1', bedNumber: 'Bed 102', room_number: '10', status: 'vacant', current_patient_id: null, currentPatientId: null, cleaningNeeded: false, type: 'Manual', created_at: now.toISOString(), createdAt: now.toISOString(), updated_at: now.toISOString(), updatedAt: now.toISOString() }
];

export const mockFacilityZones: FacilityZone[] = [
  { zoneId: 'ZONE-1', hospitalId: 'hosp-1', name: 'West Wing - Level 1', managerId: 'hosp-1_admin@gammed.com' }
];

export const mockWorkOrders: WorkOrder[] = [
  {
    workOrderId: 'WO-001',
    hospitalId: 'hosp-1',
    assetId: 'EQUIP-001',
    description: 'Minor calibration drift noted.',
    priority: 'Medium',
    status: 'Open',
    dateReported: now.toISOString(),
    reportedByUserId: 'hosp-1_f.agyepong@gammed.com'
  }
];

// --------------------------------------------------------------------
// == ADMINISTRATIVE LOGS ==
// --------------------------------------------------------------------

export const mockAlerts: PatientAlert[] = [
  {
    alertId: 'AL-001',
    hospitalId: 'hosp-1',
    patientId: 'hosp-1_MRN123456',
    severity: 'Critical',
    alert_message: 'Patient BP critically high: 185/115',
    triggeredAt: now.toISOString(),
    isAcknowledged: false
  }
];

export const mockAuditLogs: AuditLog[] = [
  {
    logId: 'LOG-001',
    hospitalId: 'hosp-1',
    timestamp: now.toISOString(),
    userId: 'hosp-1_admin@gammed.com',
    action: 'USER_LOGIN',
    details: { targetCollection: 'users', targetDocId: 'hosp-1_admin@gammed.com' }
  }
];

export const mockLabReports: LabReport[] = [
  {
    reportId: 'REP-001',
    hospitalId: 'hosp-1',
    month: 'August 2024',
    testVolumes: [
      { testName: 'FBC', volume: 120 },
      { testName: 'Malaria RDT', volume: 85 },
      { testName: 'UEC', volume: 45 },
      { testName: 'Lipid Profile', volume: 30 },
    ],
    turnaroundTimes: [
      { testName: 'FBC', avgTAT: 2.5 },
      { testName: 'Malaria RDT', avgTAT: 0.5 },
      { testName: 'UEC', avgTAT: 4.0 },
      { testName: 'Lipid Profile', avgTAT: 6.0 },
    ],
    abnormalResultTrends: [
      { testName: 'FBC', abnormalPercentage: 15 },
      { testName: 'Malaria RDT', abnormalPercentage: 40 },
      { testName: 'UEC', abnormalPercentage: 10 },
      { testName: 'Lipid Profile', abnormalPercentage: 25 },
    ]
  }
];

export const mockReferrals: Referral[] = [];
export const mockBills: Bill[] = [];
export const mockStaffClaims: StaffExpenseClaim[] = [];
export const mockClaims: Claim[] = [];
export const mockPayments: FinancialTransaction[] = [];
export const mockWaitingList: WaitingListEntry[] = [];
export const mockLeaveRequests: LeaveRequest[] = [];
export const mockPayrollRuns: PayrollRun[] = [];
export const mockPayrollRecords: PayrollRecord[] = [];
export const mockOtSessions: OTSession[] = [];
export const mockDietaryProfiles: DietaryProfile[] = [];
export const mockMealOrders: MealOrder[] = [];
export const mockPerformanceReviews: PerformanceReview[] = [];
export const mockTrainingCourses: TrainingCourse[] = [];
export const mockSpareParts: SparePart[] = [];
export const mockSparePartsLog: SparePartLog[] = [];
export const mockUtilityMeters: Meter[] = [];
export const mockUtilityConsumption: UtilityConsumption[] = [];
export const mockSecurityIncidents: SecurityIncident[] = [];
export const mockHousekeepingTasks: HousekeepingTask[] = [];
export const mockDepreciationRecords: DepreciationRecord[] = [];
export const mockSavedReports: SavedReport[] = [];
export const mockMessages: Message[] = [];
export const mockReminders: Reminder[] = [];
export const mockHealthContent: HealthContent[] = [];
export const mockVaccineCatalog: Vaccine[] = [];
export const mockImmunizationRecords: ImmunizationRecord[] = [];
export const mockLabTestCatalog: LabTest[] = [];
export const mockRadiologyStudies: RadiologyStudy[] = [];
export const mockRadiologyReports: RadiologyReport[] = [];
export const mockResourceBookings: ResourceBooking[] = [];
export const mockInfectionReports: InfectionReport[] = [];
export const mockEfficacyReports: EfficacyReport[] = [];
export const mockRfqs: RequestForQuotation[] = [];
export const mockEquipmentLogs: EquipmentLog[] = [];
export const mockControlledSubstanceLog: ControlledSubstanceLog[] = [];
export const mockControlledSubstances: ControlledSubstance[] = [];
export const mockAllowances: Allowance[] = [];
export const mockDeductions: Deduction[] = [];

export const mockPayrollConfig: PayrollConfiguration = {
  ssnitEmployeeContribution: 0.055,
  ssnitEmployerContribution: 0.13,
  tier2EmployerContribution: 0.05,
  ssnitCeiling: 35000,
  taxBands: [
    { limit: 4824, rate: 0 },
    { limit: 6144, rate: 0.05 },
    { limit: 7704, rate: 0.10 },
    { limit: 43704, rate: 0.175 },
    { limit: 240000, rate: 0.25 },
    { limit: 600000, rate: 0.30 },
    { limit: Infinity, rate: 0.35 }
  ]
};

export const mockPositions: Position[] = [
  { positionId: 'POS-1', hospitalId: 'hosp-1', title: 'Senior Consultant Physician', baseAnnualSalary: 120000 },
  { positionId: 'POS-2', hospitalId: 'hosp-1', title: 'Registered Nurse', baseAnnualSalary: 48000 }
];

export const mockPricingTables: PricingTable[] = [
  { pricingId: 'private', hospitalId: 'hosp-1', description: 'Standard Private Patient Pricing', rate_card: { 'A001': 150, 'L001': 80 } },
  { pricingId: 'corporate', hospitalId: 'hosp-1', description: 'Insurance/Corporate Partner Pricing', rate_card: { 'A001': 120, 'L001': 65 } }
];
