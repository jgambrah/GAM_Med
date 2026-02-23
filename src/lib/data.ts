
import { Hospital, User, Patient, Appointment, Admission, Bed, Referral, LabResult, ClinicalNote, VitalsLog, CarePlan, MedicationRecord, PatientAlert, ImmunizationRecord, Vaccine, Asset, ResourceBooking, WaitingListEntry, Invoice, Claim, FinancialTransaction, Prescription, PricingTable, Receipt, Bill, Supplier, LedgerAccount, LedgerEntry, StaffExpenseClaim, LeaveRequest, PayrollRun, PayrollRecord, StaffProfile, PayrollConfiguration, Allowance, Deduction, Position, InventoryItem, PurchaseOrder, PrescribedMedication, ControlledSubstance, ControlledSubstanceLog, LabTest, SampleAudit, EquipmentLog, LabReport, RadiologyStudy, RadiologyOrder, RadiologyReport, OTSession, DietaryProfile, MealOrder, PerformanceReview, TrainingCourse, FacilityZone, WorkOrder, SparePart, SparePartLog, Meter, UtilityConsumption, SecurityIncident, HousekeepingTask, DepreciationRecord, InfectionReport, EfficacyReport, SavedReport, Message, Reminder, HealthContent, AuditLog, Diagnosis, RequestForQuotation } from './types';

const now = new Date('2024-08-16T10:15:00.000Z');

// Multi-tenant master data
export const mockHospitals: Hospital[] = [
  {
    hospitalId: 'hosp-1',
    name: 'City General Hospital',
    subdomain: 'city-general',
    isActive: true,
    createdAt: new Date('2020-01-01').toISOString(),
  },
  {
    hospitalId: 'hosp-2',
    name: 'St. Mary Specialized Clinic',
    subdomain: 'st-mary',
    isActive: true,
    createdAt: new Date('2021-06-15').toISOString(),
  }
];

// Mock Users with hospitalId
export const allUsers: User[] = [
  {
    uid: 'admin1',
    hospitalId: 'hosp-1',
    email: 'admin@gammed.com',
    name: 'Admin User',
    role: 'admin',
    is_active: true,
    created_at: now.toISOString(),
    last_login: now.toISOString(),
  },
  {
    uid: 'doc1',
    hospitalId: 'hosp-1',
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
    hospitalId: 'hosp-1',
    email: 'k.asante@gammed.com',
    name: 'Dr. Kofi Asante',
    role: 'doctor',
    is_active: true,
    hodId: 'doc1',
    specialty: 'Neurology',
    department: 'Neurology',
    created_at: now.toISOString(),
    last_login: now.toISOString(),
    availability: { '2024-08-16': ['09:30', '10:30', '11:30', '13:00', '14:30'] },
  },
  {
    uid: 'doc-h2-1',
    hospitalId: 'hosp-2',
    email: 'doctor@stmary.com',
    name: 'Dr. Samuel Boateng',
    role: 'doctor',
    is_active: true,
    specialty: 'General Practice',
    department: 'OPD',
    created_at: now.toISOString(),
    last_login: now.toISOString(),
  },
  {
    uid: 'nurse1',
    hospitalId: 'hosp-1',
    email: 'f.agyepong@gammed.com',
    name: 'Florence Agyepong',
    role: 'nurse',
    is_active: true,
    hodId: 'doc1',
    created_at: now.toISOString(),
    last_login: now.toISOString(),
  },
  {
    uid: 'patient1',
    hospitalId: 'hosp-1',
    email: 'k.owusu@email.com',
    name: 'Kwame Owusu',
    role: 'patient',
    is_active: true,
    patient_id: 'P-123456',
    created_at: now.toISOString(),
    last_login: now.toISOString(),
  },
];

// Mock Patient Data with hospitalId
export const allPatients: Patient[] = [
  {
    patient_id: 'P-123456',
    hospitalId: 'hosp-1',
    title: 'Mr',
    first_name: 'Kwame',
    last_name: 'Owusu',
    full_name: 'Kwame Owusu',
    dob: '1985-05-20',
    gender: 'Male',
    patientType: 'private',
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
  },
  {
    patient_id: 'P-H2-001',
    hospitalId: 'hosp-2',
    title: 'Mrs',
    first_name: 'Sarah',
    last_name: 'Mensah',
    full_name: 'Sarah Mensah',
    dob: '1970-08-12',
    gender: 'Female',
    patientType: 'public',
    contact: {
      primaryPhone: '+233200000001',
      email: 's.mensah@email.com',
      address: { street: 'Main Road', city: 'Kumasi', region: 'Ashanti', country: 'Ghana' },
    },
    emergency_contact: { name: 'John Mensah', relationship: 'Spouse', phone: '+233200000002' },
    is_admitted: false,
    status: 'active',
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  }
];

export const allAdmissions: Admission[] = [
  {
    admission_id: 'A-001',
    hospitalId: 'hosp-1',
    patient_id: 'P-123456',
    type: 'Inpatient',
    admission_date: new Date('2024-07-28T10:30:00Z').toISOString(),
    reasonForVisit: 'Follow-up on hypertension',
    ward: 'Cardiology',
    bed_id: 'C-101',
    attending_doctor_id: 'doc1',
    attending_doctor_name: 'Dr. Evelyn Mensah',
    status: 'Admitted',
    readmissionFlag: true,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  }
];

export const allBeds: Bed[] = [
    {
        bed_id: 'C-101',
        hospitalId: 'hosp-1',
        wardName: 'Cardiology',
        room_number: '10',
        status: 'occupied',
        current_patient_id: 'P-123456',
        occupied_since: new Date('2024-07-28T10:30:00Z').toISOString(),
        cleaningNeeded: false,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
    }
];

export const allAppointments: Appointment[] = [
  {
    appointment_id: 'AP-001',
    hospitalId: 'hosp-1',
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
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  }
];

export const mockReferrals: Referral[] = [];
export const mockLabResults: LabResult[] = [];
export const mockMedicationRecords: MedicationRecord[] = [];
export const mockAlerts: PatientAlert[] = [];
export const mockDiagnoses: Diagnosis[] = [];
export const mockInventory: InventoryItem[] = [];
export const mockSuppliers: Supplier[] = [];
export const mockLedgerAccounts: LedgerAccount[] = [];
export const mockLedgerEntries: LedgerEntry[] = [];
export const mockInvoices: Invoice[] = [];
export const mockStaffProfiles: StaffProfile[] = [];
export const mockLeaveRequests: LeaveRequest[] = [];
export const mockStaffClaims: StaffExpenseClaim[] = [];
export const mockPayrollRuns: PayrollRun[] = [];
export const mockPayrollRecords: PayrollRecord[] = [];
export const mockOtSessions: OTSession[] = [];
export const mockDietaryProfiles: DietaryProfile[] = [];
export const mockMealOrders: MealOrder[] = [];
export const mockPerformanceReviews: PerformanceReview[] = [];
export const mockTrainingCourses: TrainingCourse[] = [];
export const mockFacilityZones: FacilityZone[] = [];
export const mockWorkOrders: WorkOrder[] = [];
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
export const mockAuditLogs: AuditLog[] = [];
export const mockVaccineCatalog: Vaccine[] = [];
export const mockImmunizationRecords: ImmunizationRecord[] = [];
export const mockLabTestCatalog: LabTest[] = [];
export const mockRadiologyStudies: RadiologyStudy[] = [];
export const mockRadiologyOrders: RadiologyOrder[] = [];
export const mockRadiologyReports: RadiologyReport[] = [];
export const mockPricingTables: PricingTable[] = [];
export const mockBills: Bill[] = [];
export const mockPayments: FinancialTransaction[] = [];
export const mockPayrollConfig: PayrollConfiguration = { ssnitEmployeeContribution: 0, ssnitEmployerContribution: 0, tier2EmployerContribution: 0, ssnitCeiling: 0, taxBands: [] };
export const mockPositions: Position[] = [];
export const mockPurchaseOrders: PurchaseOrder[] = [];
export const mockRfqs: RequestForQuotation[] = [];
export const mockControlledSubstances: ControlledSubstance[] = [];
export const mockControlledSubstanceLog: ControlledSubstanceLog[] = [];
export const mockLabReports: LabReport[] = [];
export const mockResourceBookings: ResourceBooking[] = [];

export const mockResources: Asset[] = [
  {
    assetId: 'MRI-001',
    hospitalId: 'hosp-1',
    name: 'MRI Scanner - Ward A',
    type: 'Medical Equipment',
    department: 'Radiology',
    location: 'Building 1, Room 102',
    status: 'Operational',
    isBookable: true,
    modality: 'MRI',
    purchaseDate: '2022-01-15T00:00:00Z',
    purchaseCost: 1500000,
    currentBookValue: 1200000,
    warrantyEndDate: '2025-01-15T00:00:00Z',
    maintenanceSchedule: [{
        type: 'Preventive',
        frequency: 'Quarterly',
        lastServiceDate: '2024-06-20T00:00:00Z',
        nextServiceDate: '2024-09-20T00:00:00Z',
    }]
  }
];

export const mockInfectionReports: InfectionReport[] = [];
export const mockEfficacyReports: EfficacyReport[] = [];
export const mockNotes: ClinicalNote[] = [];
export const mockVitalsLog: VitalsLog[] = [];
