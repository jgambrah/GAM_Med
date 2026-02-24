
/**
 * @fileoverview Updated types for the Referral Module.
 */

// ... (other existing types)

export interface Referral {
  id?: string;
  referral_id: string; // Legacy field
  fromHospitalId: string;
  fromHospitalName: string;
  toHospitalId: string;
  toHospitalName?: string;
  patientId: string;
  patientName: string;
  clinicalSummary: string;
  status: 'Pending' | 'Accepted' | 'Rejected' | 'Completed';
  priority: 'Routine' | 'Urgent' | 'Emergency';
  createdAt: string;
  updatedAt?: string;
}

// ... (rest of types file)
export interface Hospital {
  hospitalId: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended';
  subscriptionTier: 'basic' | 'premium';
  createdAt: string;
  isInternal?: boolean;
}

export interface User {
  uid: string;
  hospitalId: string;
  email: string;
  name: string;
  role: 'super_admin' | 'director' | 'admin' | 'doctor' | 'nurse' | 'pharmacist' | 'patient' | 'billing_clerk' | 'lab_technician' | 'ot_coordinator' | 'receptionist' | 'radiologist' | 'dietitian' | 'housekeeping' | 'space_manager' | 'supplier';
  is_active: boolean;
  department?: string;
  specialty?: string;
  created_at: string;
  last_login: string;
  photoURL?: string;
  patient_id?: string;
  availability?: Record<string, string[]>;
  isMfaEnabled?: boolean;
  failedLoginAttempts?: number;
  hodId?: string;
  qualifications?: Qualification[];
  certifications?: Certification[];
  licenses?: License[];
  employmentStatus?: 'Active' | 'Inactive' | 'On Leave';
  hireDate?: string;
  leaveBalances?: Record<string, number>;
  features?: string[];
}

export interface Patient {
  patient_id: string;
  hospitalId: string;
  mrn: string;
  title: string;
  first_name: string;
  last_name: string;
  full_name: string;
  full_name_lowercase: string;
  phone_search: string;
  otherNames?: string;
  ghanaCardId?: string;
  dob: string;
  gender: 'Male' | 'Female' | 'Other';
  maritalStatus?: 'Single' | 'Married' | 'Divorced' | 'Widowed';
  occupation?: string;
  patientType: 'private' | 'corporate' | 'public';
  contact: {
    primaryPhone: string;
    alternatePhone?: string;
    email: string;
    address: {
      street: string;
      city: string;
      region: string;
      country: string;
    };
  };
  emergency_contact: {
    name: string;
    relationship: string;
    phone: string;
  };
  insurance?: {
    provider_name: string;
    policy_number: string;
    isActive: boolean;
    expiry_date: string;
  };
  allergies?: string[];
  medicalHistory?: {
    allergies: string[];
    preExistingConditions: string[];
  };
  is_admitted: boolean;
  current_admission_id?: string | null;
  status: 'active' | 'inactive' | 'deceased';
  lastVisitDate?: string;
  created_at: string;
  updated_at: string;
  isTemporary?: boolean;
}

export interface Appointment {
  id: string;
  hospitalId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  appointmentDate: string;
  timeSlot: string;
  status: 'Scheduled' | 'Arrived' | 'In-Consultation' | 'Completed' | 'Cancelled';
  reason: string;
  createdAt: string;
  department?: string;
}

export interface Admission {
  admission_id: string;
  hospitalId: string;
  patient_id: string;
  type: 'Inpatient' | 'Outpatient' | 'Emergency';
  admission_date: string;
  discharge_date?: string | null;
  reasonForVisit: string;
  ward: string;
  bed_id: string;
  attending_doctor_id: string;
  attending_doctor_name: string;
  status: 'Admitted' | 'Discharged' | 'Pending Discharge' | 'Cancelled';
  readmissionFlag?: boolean;
  summary_pdf_url?: string;
  created_at: string;
  updated_at: string;
  readmission_flag?: boolean;
}

export interface Ward {
  id: string;
  hospitalId: string;
  name: string;
  type: string;
}

export interface Bed {
  id: string;
  hospitalId: string;
  wardId: string;
  bedNumber: string;
  status: 'Available' | 'Occupied' | 'Cleaning' | 'Maintenance' | 'Reserved';
  currentPatientId?: string | null;
  currentPatientName?: string | null;
  type: string;
  occupiedSince?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LabResult {
  testId: string;
  hospitalId: string;
  patientId: string;
  patientName: string;
  testName: string;
  status: 'Ordered' | 'In Progress' | 'Completed' | 'Cancelled' | 'Draft' | 'Validated' | 'Final';
  orderedAt: string;
  completedAt?: string;
  isBilled: boolean;
  resultPdfUrl?: string;
  sampleDetails?: {
    barcode: string;
    sampleStatus: string;
    collectionDate: string;
    collectedByUserId: string;
    auditLog?: SampleAudit[];
  };
  resultDetails?: any;
}

export interface MedicationRecord {
  prescriptionId: string;
  hospitalId: string;
  patientId: string;
  patientName: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  instructions: string;
  prescribedByDoctorId: string;
  prescribedByDoctorName: string;
  prescribedAt: string;
  status: 'Active' | 'Filled' | 'Discontinued' | 'Completed';
}

export interface LedgerAccount {
  accountId: string;
  hospitalId: string;
  accountName: string;
  accountCode: string;
  accountType: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  balance: number;
  isSubLedger: boolean;
  parentAccountId?: string | null;
  createdAt: string;
}

export interface LedgerEntry {
  entryId: string;
  hospitalId: string;
  accountId: string;
  date: string;
  description: string;
  debit?: number;
  credit?: number;
}

export interface Invoice {
  invoiceId: string;
  hospitalId: string;
  patientId: string;
  patientName: string;
  patientType: 'private' | 'corporate' | 'public';
  issueDate: string;
  dueDate: string;
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
  status: 'Pending Payment' | 'Paid' | 'Overdue' | 'Partially Paid' | 'Draft';
  invoicePdfUrl?: string;
  receipts?: Receipt[];
}

export interface InvoiceLineItem {
  serviceType: string;
  linkedServiceId: string;
  billingCode: string;
  price: number;
}

export interface AuditLog {
  logId: string;
  hospitalId: string;
  timestamp: string;
  userId: string;
  action: string;
  details: {
    targetCollection: string;
    targetDocId: string;
    changes?: any;
  };
}

export interface Qualification { degree: string; institution: string; graduationYear: number; }
export interface Certification { name: string; issuingBody: string; issueDate: string; expiryDate?: string; }
export interface License { type: string; licenseNumber: string; expiryDate: string; }

export interface Asset {
  assetId: string;
  hospitalId: string;
  name: string;
  type: string;
  department: string;
  location: string;
  status: 'Operational' | 'Under Maintenance' | 'Needs Repair' | 'Decommissioned';
  isBookable: boolean;
  modality?: string;
  modelNumber?: string;
  serialNumber?: string;
  purchaseDate?: string;
  purchaseCost?: number;
  currentBookValue?: number;
  warrantyEndDate?: string;
  maintenanceSchedule?: {
    type: string;
    frequency: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Annually';
    lastServiceDate: string;
    nextServiceDate: string;
  }[];
}

export interface MedicalEquipment {
  id: string;
  hospitalId: string;
  serialNumber: string;
  name: string;
  category: string;
  status: 'Available' | 'In Use' | 'Maintenance' | 'Faulty';
  wardId?: string;
  wardName?: string;
  currentPatientId?: string;
  currentPatientName?: string;
  lastMaintenance?: string;
  nextMaintenance?: string;
  oxygenLevel?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceBooking {
  bookingId: string;
  hospitalId: string;
  resourceId: string;
  bookedByUserId: string;
  startTime: string;
  endTime: string;
  reason: string;
  status: 'Confirmed' | 'Pending' | 'Canceled' | 'Completed';
  relatedAppointmentId?: string;
}

export interface WaitingListEntry {
  waitinglistId: string;
  hospitalId: string;
  patientId: string;
  requestedService: string;
  priority: 'Routine' | 'Urgent' | 'Elective';
  dateAdded: string;
  status: 'Active' | 'Scheduled' | 'Canceled';
  notes?: string;
}

export interface StaffExpenseClaim {
  claimId: string;
  hospitalId: string;
  staffId: string;
  staffName: string;
  hodId?: string;
  amount: number;
  netAmount?: number;
  whtAmount?: number;
  description: string;
  expenseAccountId: string;
  submissionDate: string;
  approvalStatus: 'Pending HOD' | 'Approved' | 'Rejected';
  paymentStatus: 'Unpaid' | 'Accrued' | 'Paid';
  attachmentUrl?: string;
  rejectionReason?: string;
  isNetPaid?: boolean;
  isWhtPosted?: boolean;
}

export interface LeaveRequest {
  leaveId: string;
  hospitalId: string;
  staffId: string;
  staffName: string;
  hodId?: string;
  leaveType: 'Annual Leave' | 'Sick Leave' | 'Specialist Leave' | 'On-Call Duty';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  requestedAt: string;
  approvedByUserId?: string;
  approvalDate?: string;
  attachmentUrl?: string;
}

export interface PayrollRun {
  runId: string;
  hospitalId: string;
  payPeriod: string;
  payDate: string;
  status: 'Processing' | 'Review' | 'Completed' | 'Posted';
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  totalTaxes: number;
  totalEmployees: number;
  initiatedByUserId: string;
  createdAt: string;
  finalizedByUserId?: string;
  finalizedAt?: string;
  postedAt?: string;
  deductionTotals?: Record<string, number>;
}

export interface PayrollRecord {
  recordId: string;
  hospitalId: string;
  staffId: string;
  staffName: string;
  grossPay: number;
  netPay: number;
  taxAmount: number;
  deductions: Record<string, number>;
  allowances: Record<string, number>;
  payslipUrl: string;
}

export interface StaffProfile {
  staffId: string;
  hospitalId: string;
  firstName: string;
  lastName: string;
  positionId: string;
  department: string;
  employmentStatus: 'Active' | 'Inactive' | 'On Leave';
  recurringAllowances: { name: string; amount: number }[];
  recurringDeductions: { name: string; amount: number }[];
  leaveBalances?: Record<string, number>;
  trainingRecords?: { trainingId: string; courseName: string; completionDate: string; provider: string }[];
  developmentGoals?: DevelopmentGoal[];
}

export interface DevelopmentGoal {
  goalId: string;
  hospitalId: string;
  description: string;
  targetDate: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
}

export interface PayrollConfiguration {
  ssnitEmployeeContribution: number;
  ssnitEmployerContribution: number;
  tier2EmployerContribution: number;
  ssnitCeiling: number;
  taxBands: { limit: number; rate: number }[];
}

export interface Allowance {
  allowanceId: string;
  hospitalId: string;
  name: string;
  isTaxable: boolean;
}

export interface Deduction {
  id: string;
  hospitalId: string;
  name: string;
}

export interface Position {
  positionId: string;
  hospitalId: string;
  title: string;
  baseAnnualSalary: number;
}

export interface InventoryItem {
  itemId: string;
  hospitalId: string;
  name: string;
  type: string;
  reorderLevel: number;
  currentQuantity: number;
  unitPrice: number;
  unit?: string;
  batches?: { batchNumber: string; expiryDate: string; currentQuantity: number; dateReceived: string }[];
}

export interface PurchaseOrder {
  poId: string;
  hospitalId: string;
  dateOrdered: string;
  status: 'Submitted' | 'Received';
  orderedByUserId: string;
  supplierId: string;
  orderedItems: { itemId: string; name: string; quantity: number; unit_cost: number }[];
  totalAmount: number;
}

export interface RequestForQuotation {
  rfqId: string;
  hospitalId: string;
  title: string;
  dateCreated: string;
  deadline: string;
  status: 'Open for Bids' | 'Closed';
  items: { itemId: string; name: string; quantity: number }[];
  quotes?: Quote[];
  activityLog?: { timestamp: string; activity: string }[];
}

export interface Quote {
  quoteId: string;
  hospitalId: string;
  supplierId: string;
  supplierName: string;
  dateSubmitted: string;
  totalAmount: number;
  items?: { itemId: string; unitPrice: number; notes: string }[];
  status: 'Submitted' | 'Awarded' | 'Not Awarded';
}

export interface Supplier {
  supplierId: string;
  hospitalId: string;
  name: string;
  contactInfo: { person: string; email: string; phone: string; address: string };
  paymentTerms: 'Net 30' | 'Net 60' | 'Cash on Delivery';
  contractDetails?: { contractNumber: string; startDate: string; endDate: string };
}

export interface Prescription {
  prescriptionId: string;
  hospitalId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  datePrescribed: string;
  status: 'Pending' | 'Dispensed' | 'Canceled';
  medications: PrescribedMedication[];
}

export interface PrescribedMedication {
  medicationId: string;
  name: string;
  dosage: string;
  frequency: string;
  quantity_to_dispense: number;
}

export interface ControlledSubstance {
  substanceId: string;
  hospitalId: string;
  name: string;
  strength: string;
  form: string;
  totalQuantity: number;
  unit: string;
}

export interface ControlledSubstanceLog {
  logId: string;
  hospitalId: string;
  substanceId: string;
  date: string;
  transactionType: 'Dispense' | 'Restock' | 'Audit' | 'Waste' | 'Adjustment';
  quantityChange: number;
  currentQuantity: number;
  userId: string;
  patientId?: string;
  witnessId?: string;
  reason: string;
}

export interface LabTest {
  testId: string;
  hospitalId: string;
  name: string;
}

export interface SampleAudit {
  auditId: string;
  hospitalId: string;
  timestamp: string;
  action: string;
  location: string;
  userId: string;
}

export interface EquipmentLog {
  logId: string;
  hospitalId: string;
  equipmentId: string;
  timestamp: string;
  barcodeScanned: string;
  isProcessed: boolean;
  error?: string;
}

export interface LabReport {
  reportId: string;
  hospitalId: string;
  month: string;
  testVolumes: { testName: string; volume: number }[];
  turnaroundTimes: { testName: string; avgTAT: number }[];
  abnormalResultTrends: { testName: string; abnormalPercentage: number }[];
}

export interface RadiologyStudy {
  studyId: string;
  hospitalId: string;
  name: string;
}

export interface RadiologyOrder {
  id: string;
  orderId: string;
  hospitalId: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  modality: string;
  indication: string;
  doctorId: string;
  doctorName: string;
  dateOrdered: string;
  status: 'Pending' | 'Scheduled' | 'Awaiting Report' | 'Completed';
  scheduledDateTime?: string;
  clinicalNotes?: string;
  priority: 'Routine' | 'Urgent';
  isReported?: boolean;
  imageURL?: string;
  impression?: string;
}

export interface RadiologyReport {
  reportId: string;
  hospitalId: string;
  orderId: string;
  patientId: string;
  radiologistId: string;
  dateReported: string;
  reportDetails: { impression: string; findings: string };
  pacsLink?: string;
  reportPdfUrl?: string;
  isFinal: boolean;
}

export interface OTSession {
  id: string;
  sessionId: string;
  hospitalId: string;
  patientId: string;
  patientName: string;
  patientMrn?: string;
  procedureName: string;
  surgeonId: string;
  surgeonName: string;
  anesthetistName: string;
  otRoomId: string;
  status: 'Scheduled' | 'In-Progress' | 'Post-Op' | 'Completed' | 'Cancelled';
  startTime: string;
  estimatedDuration: number;
  priority: 'Emergency' | 'Elective' | 'Urgent';
  recoveryStatus?: 'Monitoring' | 'Stable' | 'Discharged';
  recoveryRoomEntryTime?: string;
  dischargeFromRecoveryTime?: string;
}

export interface DietaryProfile {
  profileId: string;
  hospitalId: string;
  patientId: string;
  allergies?: string[];
  restrictions?: string[];
  preferences?: string[];
}

export interface MealOrder {
  mealOrderId: string;
  hospitalId: string;
  patientId: string;
  orderDateTime: string;
  mealType: string;
  dietaryPlan: string;
  status: 'Ordered' | 'Preparing' | 'Delivered' | 'Canceled';
}

export interface PerformanceReview {
  reviewId: string;
  hospitalId: string;
  employeeId: string;
  reviewerId: string;
  dateOfReview: string;
  ratingPeriodStart: string;
  ratingPeriodEnd: string;
  overallRating: string;
  strengths?: string;
  areasForDevelopment?: string;
  goalsAchieved?: string[];
  trainingRecommendations?: string;
  targetDate?: string;
}

export interface TrainingCourse {
  courseId: string;
  hospitalId: string;
  courseName: string;
  provider: string;
}

export interface FacilityZone {
  zoneId: string;
  hospitalId: string;
  name: string;
  managerId?: string;
}

export interface WorkOrder {
  workOrderId: string;
  hospitalId: string;
  assetId?: string;
  facilityIssue?: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Open' | 'Assigned' | 'In Progress' | 'Resolved' | 'Closed';
  dateReported: string;
  reportedByUserId: string;
}

export interface SparePart {
  partId: string;
  hospitalId: string;
  name: string;
  partNumber: string;
  currentQuantity: number;
  reorderLevel: number;
  location: string;
}

export interface SparePartLog {
  logId: string;
  hospitalId: string;
  partId: string;
  date: string;
  transactionType: 'Usage' | 'Restock' | 'Adjustment';
  quantityChange: number;
  userId: string;
  workOrderId?: string;
  purchaseOrderId?: string;
  notes: string;
}

export interface Meter {
  meterId: string;
  hospitalId: string;
  type: 'Water' | 'Electricity' | 'Gas';
  unit: string;
  location: string;
}

export interface UtilityConsumption {
  logId: string;
  hospitalId: string;
  meterId: string;
  date: string;
  consumption: number;
  type: string;
}

export interface SecurityIncident {
  incidentId: string;
  hospitalId: string;
  timestamp: string;
  type: 'Unauthorized Access' | 'Theft' | 'Dispute' | 'Violence' | 'Other';
  status: 'Under Investigation' | 'Resolved' | 'Escalated';
  details: string;
  location: string;
  reportedByUserId: string;
}

export interface HousekeepingTask {
  taskId: string;
  hospitalId: string;
  type: 'Room Cleaning' | 'Disinfection' | 'Laundry' | 'Waste Removal';
  location: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  dateCreated: string;
  notes?: string;
}

export interface DepreciationRecord {
  recordId: string;
  hospitalId: string;
  assetId: string;
  dateCalculated: string;
  depreciationAmount: number;
  bookValue: number;
  period: string;
}

export interface InfectionReport {
  reportId: string;
  hospitalId: string;
  month: string;
  infectionCount: number;
  ratePer1000Days: number;
  breakdownByWard: Record<string, number>;
}

export interface EfficacyReport {
  reportId: string;
  hospitalId: string;
  treatmentPlanTitle: string;
  averageEfficacy: number;
}

export interface SavedReport {
  reportId: string;
  hospitalId: string;
  userId: string;
  reportName: string;
  description: string;
  queryDetails: any;
}

export interface Message {
  messageId: string;
  hospitalId: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  messageBody: string;
  timestamp: string;
  isRead: boolean;
  attachmentUrl?: string;
  attachmentName?: string;
}

export interface Reminder {
  reminderId: string;
  hospitalId: string;
  patientId: string;
  type: 'Appointment' | 'Medication' | 'Follow-up';
  scheduledDateTime: string;
  message: string;
  isSent: boolean;
  relatedDocId?: string;
}

export interface Diagnosis {
  id: string;
  diagnosisId: string;
  hospitalId: string;
  patientId: string;
  diagnosisText: string;
  icd10Code: string;
  diagnosedAt: string;
  diagnosedByDoctorId: string;
  isPrimary: boolean;
}

export interface MortalityRecord {
  id: string;
  hospitalId: string;
  patientId: string;
  patientName: string;
  dateOfDeath: string;
  cause: string;
  certifiedBy: string;
  notes?: string;
}

export interface FinancialTransaction {
  transactionId: string;
  hospitalId: string;
  invoiceId: string;
  amount: number;
  paymentMethod: 'Cash' | 'Credit Card' | 'Mobile Money' | 'Insurance Payout';
  paymentDate: string;
  paymentId?: string;
}

export interface Receipt {
  receiptId: string;
  hospitalId: string;
  paymentId: string;
  invoiceId: string;
  amountPaid: number;
  dateIssued: string;
  documentLink: string;
}

export interface Bill {
  billId: string;
  hospitalId: string;
  supplierId: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  amountPaid?: number;
  status: 'Pending' | 'Partially Paid' | 'Paid' | 'Overdue' | 'Accrued';
  attachmentUrl?: string;
  whtAmount?: number;
  netAmount?: number;
  isNetPaid?: boolean;
  isWhtPosted?: boolean;
}

export interface ClinicalNote {
  noteId: string;
  hospitalId: string;
  patientId: string;
  noteType: string;
  recordedByUserId: string;
  noteText: string;
  recordedAt: string;
  createdAt?: string;
}

export interface VitalsLog {
  vitalId: string;
  hospitalId: string;
  patientId: string;
  bloodPressure: string;
  heartRate: string;
  temperature: string;
  respiratoryRate: string;
  oxygenSaturation: string;
  painScore?: string;
  notes?: string;
  recordedByUserId: string;
  recordedAt: string;
  createdAt?: string;
}

export interface CarePlan {
  planId: string;
  hospitalId: string;
  patientId: string;
  title: string;
  goal: string;
  interventions: string[];
  status: 'Active' | 'On Hold' | 'Completed' | 'Cancelled';
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

export interface PatientAlert {
  alertId: string;
  hospitalId: string;
  patientId?: string;
  severity: 'Critical' | 'Warning' | 'Information';
  alert_message: string;
  triggeredAt: string;
  isAcknowledged: boolean;
  type?: 'Patient' | 'Resource';
}

export interface ImmunizationRecord {
  immunizationId: string;
  hospitalId: string;
  patientId: string;
  vaccineName: string;
  doseNumber: number;
  administeredAt: string;
  nextDueDate?: string;
  administeredByUserId: string;
  notes?: string;
}

export interface Vaccine {
  vaccineId: string;
  hospitalId: string;
  name: string;
}

export interface PricingTable {
  pricingId: 'private' | 'corporate' | 'public';
  hospitalId: string;
  description: string;
  rate_card: Record<string, number>;
}

export interface HealthContent {
  contentId: string;
  hospitalId: string;
  title: string;
  body: string;
  keywords: string[];
  fileUrl?: string;
}
