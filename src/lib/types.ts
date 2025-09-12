

/**
 * @fileoverview This file defines the core data structures (TypeScript types) for the GamMed ERP system.
 * Each type corresponds to a data model for a Firestore collection, serving as the single source of truth for the application's data architecture.
 * This ensures consistency between the frontend components and the backend database.
 */

// =========================================================================
// == Ward, Bed & OT Management
// =========================================================================

/**
 * Represents a single ward in the hospital.
 * Path: /wards/{wardId}
 */
export interface Ward {
  wardId: string; // Document ID
  name: string; // e.g., 'Pediatrics Ward', 'Surgical ICU'
  type: 'General' | 'ICU' | 'Maternity' | 'Pediatric' | 'Surgical';
  totalBeds: number;
  occupiedBeds: number;
  managers?: string[]; // Array of user IDs for ward managers
}


/**
 * Represents a hospital bed in the 'beds' collection.
 * These documents are updated frequently as patients are admitted, transferred, and discharged.
 */
export interface Bed {
    bed_id: string; // Unique bed identifier, e.g., 'C-101'
    wardName: string;
    room_number: string;
    status: 'occupied' | 'vacant' | 'cleaning' | 'maintenance' | 'Reserved';
    current_patient_id?: string | null; // Null if vacant or maintenance
    occupied_since?: string | null; // ISO 8601 format, set when occupied
    cleaningNeeded: boolean;
    created_at: string; // ISO 8601 format
    updated_at: string; // ISO 8601 format
}

/**
 * Represents an operating theatre in the 'operating_theatres' collection.
 * Path: /operating_theatres/{theatreId}
 */
export interface OperatingTheater {
  theatreId: string; // Document ID
  name: string; // e.g., 'OT-1', 'OT-2'
  isAvailable: boolean;
  lastUsed?: string; // ISO Timestamp
  specialty?: 'Orthopedic' | 'Cardiothoracic' | 'General' | 'Neurosurgery';
}

// =========================================================================
// == Radiology Information System (RIS)
// =========================================================================

/**
 * Represents a single available imaging study in the central radiology catalog.
 * Path: /radiology_studies/{studyId}
 */
export interface RadiologyStudy {
  studyId: string; // Document ID (e.g., 'CT-Chest', 'XRay-Leg')
  name: string; // e.g., 'CT Scan of Chest'
  description: string;
  price: number;
  estimatedTime: number; // in minutes
  isStat: boolean; // Indicates if it's an emergency study
}

/**
 * Represents a request for an imaging study made by a doctor.
 * Path: /radiology_orders/{orderId}
 */
export interface RadiologyOrder {
  orderId: string; // Document ID
  patientId: string; // Reference to patients
  doctorId: string; // Reference to users
  studyIds: string[]; // Array of references to radiology_studies
  dateOrdered: string; // ISO Timestamp
  scheduledDateTime?: string; // ISO Timestamp for patient appointment
  status: 'Pending Scheduling' | 'Scheduled' | 'Awaiting Report' | 'Completed';
  clinicalNotes?: string; // Doctor's notes on the reason for the study
  priority?: number; // e.g., 1 for STAT, 2 for Urgent, 3 for Routine
  assignedRadiologistId?: string; // Reference to users
  isReported?: boolean;
  dateAssigned?: string; // ISO Timestamp
}

/**
 * Represents the final report from the radiologist for a given order.
 * Path: /radiology_reports/{reportId}
 */
export interface RadiologyReport {
  reportId: string; // Document ID (could be same as orderId)
  orderId: string; // Reference to radiology_orders
  patientId: string; // Denormalized for security rules and easy access
  radiologistId: string; // Reference to users
  dateReported: string; // ISO Timestamp
  reportDetails: {
    impression: string;
    findings: string;
  };
  pacsLink?: string; // A unique URL or identifier that points to the imaging study on the PACS
  imageThumbnailUrl?: string; // A link to a thumbnail image for a quick preview in the EHR
  reportPdfUrl?: string; // URL to the generated PDF in Firebase Storage
  isFinal?: boolean; // A flag to prevent further editing after finalization
}


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
 * Path: /leave_requests/{leaveId}
 */
export interface LeaveRequest {
  leaveId: string;
  staffId: string;
  staffName: string;
  hodId?: string;
  leaveType: 'Annual Leave' | 'Sick Leave' | 'Specialist Leave' | 'On-Call Duty';
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  requestedAt: string; // ISO Timestamp
  duration?: number;
  submittedDate?: string;
  approvedByUserId?: string;
  approvalDate?: string;
}

// =========================================================================
// == Payroll & HR Management Data Models
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

/**
 * Represents a detailed performance review record.
 * Path: /performance_reviews/{reviewId}
 */
export interface PerformanceReview {
  reviewId: string;
  employeeId: string;
  reviewerId: string;
  dateOfReview: string; // ISO Timestamp
  ratingPeriodStart: string; // ISO Timestamp
  ratingPeriodEnd: string; // ISO Timestamp
  overallRating: 'Exceeds Expectations' | 'Meets Expectations' | 'Needs Improvement' | 'Unsatisfactory';
  strengths: string;
  areasForDevelopment: string;
  goalsAchieved: {
    goalDescription: string;
    achievedRating: 'Exceeded' | 'Met' | 'Partially Met' | 'Not Met';
  }[];
  trainingRecommendations: string;
  nextReviewDate: string; // ISO Timestamp
}

/**
 * Represents an available training course in the catalog.
 * Path: /training_courses/{courseId}
 */
export interface TrainingCourse {
  courseId: string;
  courseName: string;
  description: string;
  provider: string;
  duration: string;
  type: 'Mandatory' | 'Skill Development' | 'Leadership';
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
  uid: string; // Document ID, should match Firebase Auth UID
  userId?: string;
  email: string;
  name: string;
  role: 'admin' | 'doctor' | 'nurse' | 'pharmacist' | 'patient' | 'billing_clerk' | 'triage_officer' | 'lab_technician' | 'ot_coordinator' | 'receptionist' | 'radiologist' | 'dietitian';
  is_active: boolean;
  department?: string;
  specialty?: string;
  created_at: string;
  last_login: string;
  photoURL?: string;
  patient_id?: string; // If user is also a patient
  availability?: Record<string, string[]>;
  // For HR Module
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  qualifications?: {
    degree: string;
    institution: string;
    graduationYear: number;
  }[];
  certifications?: {
    name: string;
    issuingBody: string;
    issueDate: string;
    expiryDate?: string;
  }[];
  licenses?: {
    type: string;
    licenseNumber: string;
    expiryDate: string;
  }[];
  employmentStatus?: 'Active' | 'Inactive' | 'On Leave';
  hireDate?: string;
  leaveBalances?: Record<string, number>;
  currentOnCallDuty?: boolean;
}

/**
 * Represents an employee's HR document.
 * Path: /users/{userId}/documents/{documentId}
 */
export interface EmployeeDocument {
    documentId: string;
    type: 'Resume' | 'License' | 'Contract' | 'ID';
    storageUrl: string; // Link to Firebase Storage
    uploadDate: string; // ISO Timestamp
    expiryDate?: string; // Optional expiry date for licenses
}

/**
 * Represents an employee's attendance log.
 * Path: /attendance_logs/{logId}
 */
export interface AttendanceLog {
    logId: string;
    employeeId: string;
    clockInTime: string; // ISO Timestamp
    clockOutTime?: string; // ISO Timestamp
    date: string; // YYYY-MM-DD
}

/**
 * Represents a comprehensive HR record for a staff member.
 * This is the central source of truth for all HR and payroll calculations.
 * Path: /employees/{employeeId}
 */
export interface StaffProfile {
  staffId: string;
  userId: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  gender: 'Male' | 'Female' | 'Other';
  dateOfBirth: string; // ISO format
  employmentStatus: 'Active' | 'On Leave' | 'Terminated';
  positionId: string;
  hireDate?: string; // ISO format
  department?: string;
  qualifications?: {
    degree: string;
    institution: string;
    graduationYear: number;
  }[];
  certifications?: {
    name: string;
    issuingBody: string;
    issueDate: string;
    expiryDate?: string;
  }[];
  licenses?: {
    type: string;
    licenseNumber: string;
    expiryDate: string;
  }[];
  contactInfo?: {
    phone: string;
    email: string;
  };
  recurringAllowances: {
    name: string;
    amount: number;
  }[];
  recurringDeductions: {
    name: string;
    amount: number;
  }[];
  bankDetails: {
    bankName: string;
    accountNumber: string;
    branchName: string;
  };
  leaveBalances?: Record<string, number>;
  performanceReviews?: {
    reviewId: string;
    date: string; // ISO Timestamp
    reviewerId: string;
    overallRating: string;
  }[];
  trainingRecords?: {
    trainingId: string;
    courseName: string;
    completionDate: string; // ISO Timestamp
    provider: string;
  }[];
  developmentGoals?: {
    goalId: string;
    description: string;
    targetDate: string;
    status: 'Not Started' | 'In Progress' | 'Completed' | 'Deferred';
  }[];
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
   * For Inpatients: 'Admitted' | 'In Treatment' | 'Pending Discharge' | 'Discharged'.
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
  orderId?: string; // Link to radiology_orders
  technicianId?: string; // Link to users (for radiology technician)
  equipmentId?: string; // Link to equipment/resources
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
 * Represents a scheduled maintenance task for a piece of equipment.
 */
export interface MaintenanceSchedule {
  type: 'Preventive' | 'Corrective';
  frequency: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Annually' | 'As Needed';
  lastServiceDate?: string; // ISO Timestamp
  nextServiceDate?: string; // ISO Timestamp
}


/**
 * Represents a bookable hospital asset. This has been updated to be the comprehensive Asset Register model.
 * It can be medical equipment, a room, or even specialized staff.
 * Path: /assets/{assetId}
 */
export interface Asset {
  assetId: string; // Document ID
  name: string; // e.g., 'MRI Scanner 1', 'HP Laptop', 'Hospital Bed'
  type: 'Medical Equipment' | 'IT Equipment' | 'Furniture' | 'Building Component' | 'Room';
  modelNumber?: string;
  serialNumber?: string;
  purchaseDate?: string; // ISO Timestamp
  purchaseCost?: number;
  currentValue?: number;
  supplierId?: string; // Optional reference to suppliers collection
  location: string; // e.g., 'Radiology Wing, Basement', 'IT Server Room', 'Ward A'
  department: string; // e.g., 'Radiology', 'IT', 'Administration'
  status: 'Operational' | 'Under Maintenance' | 'Needs Repair' | 'Decommissioned' | 'Active' | 'Out of Service';
  warrantyEndDate?: string; // ISO Timestamp, optional
  assignedToUserId?: string; // Optional reference to a user
  // Fields for bookable resources
  isBookable?: boolean;
  operatingHours?: Record<string, string>;
  modality?: 'CT Scan' | 'MRI' | 'X-Ray' | 'Ultrasound'; // For radiology equipment
  maintenanceSchedule?: MaintenanceSchedule[];
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
// == e-Prescribing & Pharmacy Data Models
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
 * Represents a booked surgical procedure in the 'ot_sessions' collection.
 * This is the core data model for managing the OT schedule.
 */
export interface OTSession {
  sessionId: string; // Document ID (same as caseId)
  patientId: string; // Reference to 'patients' collection
  otRoomId: string; // Reference to the 'resources' collection (where OT rooms are defined)
  leadSurgeonId: string; // Reference to the lead surgeon in the 'users' collection
  procedureName: string; // e.g., 'Appendectomy', 'Total Knee Replacement'
  startTime: Date;
  endTime: Date;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Canceled' | 'Post-Op';
  surgicalTeam?: { userId: string, role: string }[]; // Array of team members
  preOpChecklist?: Record<string, 'Completed' | 'Pending' | 'N/A'>; // e.g., { 'Consent Signed': 'Completed' }
  postOpCarePlan?: string;
  patientName?: string; // Denormalized for display
  leadSurgeonName?: string; // Denormalized for display
  recoveryRoomEntryTime?: string; // ISO Timestamp
  dischargeFromRecoveryTime?: string; // ISO Timestamp
  recoveryStatus?: 'Monitoring' | 'Stable' | 'Discharged';
  postOpNotes?: string;
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
    painScore?: string; // 1-10 scale
    notes?: string;
    recordedByUserId: string; // Reference to users.uid
    recordedAt: string; // ISO 8601 Timestamp
}

/**
 * Represents a patient's care plan.
 * Path: /patients/{patientId}/care_plans/{planId}
 */
export interface CarePlan {
    planId: string; // Document ID
    patientId: string; // Reference to the parent patient document
    title: string; // e.g., "Post-Operative Wound Care"
    goal: string; // The primary objective of the care plan
    interventions: string[]; // List of nursing actions
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
  administeredAt: string; // ISO Timestamp
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
// == Dietary Management Data Models
// =========================================================================

/**
 * Stores individual patient dietary information.
 * Path: /dietary_profiles/{profileId} (where profileId === patientId)
 */
export interface DietaryProfile {
  profileId: string;
  patientId: string;
  allergies?: string[];
  restrictions?: string[];
  preferences?: string[];
  specialInstructions?: string;
}

/**
 * Represents each meal ordered for a patient.
 * Path: /meal_orders/{mealOrderId}
 */
export interface MealOrder {
  mealOrderId: string;
  patientId: string;
  orderDateTime: string; // ISO Timestamp
  mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  dietaryPlan: string; // e.g., 'Diabetic', 'Low Sodium'
  mealItems: string[];
  status: 'Ordered' | 'Preparing' | 'Delivered' | 'Canceled';
  deliveredByUserId?: string;
  deliveryTimestamp?: string; // ISO Timestamp
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

/**
 * Defines a physical zone or area within the hospital.
 * Path: /facility_zones/{zoneId}
 */
export interface FacilityZone {
  zoneId: string; // Document ID
  name: string; // e.g., 'Main Hospital Building', 'West Wing - 3rd Floor'
  managerId?: string; // User ID of the zone manager
  maintenanceRequests?: number; // Count of open requests for this zone
}

/**
 * Represents a work order for maintenance or repair.
 * Path: /work_orders/{workOrderId}
 */
export interface WorkOrder {
  workOrderId: string; // Document ID
  assetId?: string; // Optional: Link to a specific asset in the 'assets' collection.
  facilityIssue?: string; // Optional: Description of a non-equipment issue.
  reportedByUserId: string; // UID of the user who reported the issue.
  dateReported: string; // ISO Timestamp of when the issue was reported.
  description: string; // Detailed description of the problem.
  priority: 'Low' | 'Medium' | 'High';
  status: 'Open' | 'Assigned' | 'In Progress' | 'Resolved' | 'Closed';
  assignedToUserId?: string; // UID of the technician assigned to the work order.
  resolutionNotes?: string; // Notes from the technician on how the issue was resolved.
  dateResolved?: string; // ISO Timestamp of when the work was completed.
  cost?: number; // Cost of the repair
  partsUsed?: {
      partId: string;
      quantityUsed: number;
  }[];
}

/**
 * Represents a record of a reported issue by a user.
 * This is a client-side type for the user portal.
 */
export interface MyReportedIssue {
  issueId: string;
  dateReported: string;
  description: string;
  item: string;
  status: 'Open' | 'Assigned' | 'In Progress' | 'Resolved' | 'Closed';
}

/**
 * Represents a spare part for equipment maintenance.
 * Path: /spare_parts/{partId}
 */
export interface SparePart {
    partId: string; // Document ID
    name: string; // e.g., 'CT Scanner X-Ray Tube'
    partNumber: string; // Manufacturer's part number
    compatibleWith: string[]; // Array of assetIds this part is compatible with
    currentQuantity: number;
    reorderLevel: number;
    supplierId: string; // Reference to suppliers
    location: string; // e.g., 'Maintenance Depot A, Shelf 3'
}

/**
 * Represents a single, immutable transaction in the spare parts log.
 * Path: /spare_parts/{partId}/log/{logId}
 */
export interface SparePartLog {
  logId: string; // Document ID
  partId: string; // Added to make querying collection groups easier
  transactionType: 'Usage' | 'Restock' | 'Adjustment';
  quantityChange: number; // Negative for usage, positive for restock
  date: string; // ISO Timestamp
  userId: string; // UID of the user performing the transaction
  workOrderId?: string; // Link to the work order if used for a repair
  purchaseOrderId?: string; // Link to the PO if a restock
  notes?: string;
}

/**
 * Represents a meter for tracking utility consumption.
 * Path: /meters/{meterId}
 */
export interface Meter {
  meterId: string; // Document ID
  type: 'Electricity' | 'Water' | 'Gas';
  location: string;
  unit: 'kWh' | 'm³' | 'Gallon';
}

/**
 * Represents a chronological log of utility usage.
 * Path: /utility_consumption/{logId}
 */
export interface UtilityConsumption {
  logId: string; // Document ID
  date: string; // ISO Timestamp
  meterId: string; // Reference to meters collection
  type: 'Electricity' | 'Water' | 'Gas';
  reading: number;
  consumption: number; // Calculated value (current reading - previous reading)
}

/**
 * Represents a security incident log.
 * Path: /security_incidents/{incidentId}
 */
export interface SecurityIncident {
  incidentId: string; // Document ID
  timestamp: string; // ISO Timestamp
  type: 'Unauthorized Access' | 'Theft' | 'Dispute' | 'Violence' | 'Other';
  location: string;
  reportedByUserId: string;
  details: string;
  status: 'Reported' | 'Under Investigation' | 'Resolved';
  resolutionNotes?: string;
}

/**
 * Represents a housekeeping task.
 * Path: /housekeeping_tasks/{taskId}
 */
export interface HousekeepingTask {
  taskId: string; // Document ID
  type: 'Room Cleaning' | 'Disinfection' | 'General Area' | 'Waste Disposal';
  location: string; // e.g., 'Room 201', 'OR-B', 'Main Lobby'
  assignedToUserId: string; // Reference to housekeeping staff
  status: 'Pending' | 'In Progress' | 'Completed' | 'Skipped';
  dateCreated: string; // ISO Timestamp
  dateCompleted?: string; // ISO Timestamp
  notes?: string;
}

// =========================================================================
// == Performance Management Data Models
// =========================================================================

/**
 * Represents a detailed performance review record.
 * Path: /performance_reviews/{reviewId}
 */
export interface PerformanceReview {
  reviewId: string;
  employeeId: string;
  reviewerId: string;
  dateOfReview: string; // ISO Timestamp
  ratingPeriodStart: string; // ISO Timestamp
  ratingPeriodEnd: string; // ISO Timestamp
  overallRating: 'Exceeds Expectations' | 'Meets Expectations' | 'Needs Improvement' | 'Unsatisfactory';
  strengths: string;
  areasForDevelopment: string;
  goalsAchieved: {
    goalDescription: string;
    achievedRating: 'Exceeded' | 'Met' | 'Partially Met' | 'Not Met';
  }[];
  trainingRecommendations: string;
  nextReviewDate: string; // ISO Timestamp
}

/**
 * Represents an available training course in the catalog.
 * Path: /training_courses/{courseId}
 */
export interface TrainingCourse {
  courseId: string;
  courseName: string;
  description: string;
  provider: string;
  duration: string;
  type: 'Mandatory' | 'Skill Development' | 'Leadership';
}

/**
 * Represents an employee's HR document.
 * Path: /users/{userId}/documents/{documentId}
 */
export interface EmployeeDocument {
    documentId: string;
    type: 'Resume' | 'License' | 'Contract' | 'ID';
    storageUrl: string; // Link to Firebase Storage
    uploadDate: string; // ISO Timestamp
    expiryDate?: string; // Optional expiry date for licenses
}

/**
 * Represents an employee's attendance log.
 * Path: /attendance_logs/{logId}
 */
export interface AttendanceLog {
    logId: string;
    employeeId: string;
    clockInTime: string; // ISO Timestamp
    clockOutTime?: string; // ISO Timestamp
    date: string; // YYYY-MM-DD
}

/**
 * Represents a comprehensive HR record for a staff member.
 * This is the central source of truth for all HR and payroll calculations.
 * Path: /employees/{employeeId}
 */
export interface StaffProfile {
  staffId: string;
  userId: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  gender: 'Male' | 'Female' | 'Other';
  dateOfBirth: string; // ISO format
  employmentStatus: 'Active' | 'On Leave' | 'Terminated';
  positionId: string;
  hireDate?: string; // ISO format
  department?: string;
  qualifications?: {
    degree: string;
    institution: string;
    graduationYear: number;
  }[];
  certifications?: {
    name: string;
    issuingBody: string;
    issueDate: string;
    expiryDate?: string;
  }[];
  licenses?: {
    type: string;
    licenseNumber: string;
    expiryDate: string;
  }[];
  contactInfo?: {
    phone: string;
    email: string;
  };
  recurringAllowances: {
    name: string;
    amount: number;
  }[];
  recurringDeductions: {
    name: string;
    amount: number;
  }[];
  bankDetails: {
    bankName: string;
    accountNumber: string;
    branchName: string;
  };
  leaveBalances?: Record<string, number>;
  performanceReviews?: {
    reviewId: string;
    date: string; // ISO Timestamp
    reviewerId: string;
    overallRating: string;
  }[];
  trainingRecords?: {
    trainingId: string;
    courseName: string;
    completionDate: string; // ISO Timestamp
    provider: string;
  }[];
  developmentGoals?: {
    goalId: string;
    description: string;
    targetDate: string;
    status: 'Not Started' | 'In Progress' | 'Completed' | 'Deferred';
  }[];
}


// =========================================================================
// == Deprecated Types
// =========================================================================

/**
 * @deprecated Replaced by the more comprehensive `Asset` type.
 */
export type Resource = Asset;
/**
 * @deprecated Replaced by the more comprehensive `PurchaseOrder` type.
 */
export type PharmacyOrder = PurchaseOrder;
/**
 * @deprecated Replaced by the more comprehensive `WorkOrder` type.
 */
export type MaintenanceRequest = WorkOrder;
