
/**
 * @fileoverview This file defines the core data structures (TypeScript types) for the GamMed ERP system.
 * Each type corresponds to a data model for a Firestore collection, serving as the single source of truth for the application's data architecture.
 * This ensures consistency between the frontend components and the backend database.
 */

// =========================================================================
// == Access Control & Security
// =========================================================================

/**
 * Represents a user role in the central 'roles' collection.
 * This defines the permissions for each role across the application.
 */
export interface Role {
  roleId: string; // e.g., 'doctor', 'admin'
  permissions: {
    [collectionName: string]: {
      read?: boolean;
      write?: boolean;
      create?: boolean;
      delete?: boolean;
    };
  };
}

/**
 * Represents an immutable audit log entry.
 * Path: /audit_logs/{logId}
 */
export interface AuditLog {
  logId: string;
  timestamp: string; // ISO Timestamp
  userId: string; // UID of the user who performed the action
  action: string; // e.g., 'ACCESSED_PATIENT_RECORD', 'UPDATED_INVOICE'
  details: {
    targetCollection: string;
    targetDocId: string;
    changes?: Record<string, any>; // For update actions
    ipAddress?: string; // For security auditing
  };
}


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
  description?: string; // Optional description for display
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
  description: string;
  amount: number;
  date: string; // ISO Timestamp
  category: 'Utilities' | 'Inventory' | 'Rent' | 'Maintenance' | 'Other';
  status: 'Paid' | 'Pending';
}

/**
 * Represents a pre-aggregated financial summary for fast dashboard loading.
 * Path: /financial_summaries/{summaryId}
 */
export interface FinancialSummary {
  summaryId: string; // e.g., 'monthly_summary_2025-09'
  period: string; // e.g., '2025-09'
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  breakdown: Record<string, Record<string, number>>; // e.g., { "Revenue": { "Lab": 15000 }, "Expenses": { "Payroll": 30000 } }
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
  overallRating: 'Exceeds Expectations' | 'Meets Expectations' | 'Needs Improvement' | 'Unsatisfactory' | 'Pending';
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
 * Represents a single development goal for a staff member.
 */
export interface DevelopmentGoal {
  goalId: string;
  description: string;
  targetDate: string; // ISO Date YYYY-MM-DD
  status: 'Not Started' | 'In Progress' | 'Completed' | 'Deferred';
}

// =========================================================================
// == Clinical Decision Support (CDS) & Reporting Data Models
// =========================================================================

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
 * Represents a hospital-acquired infection (HAI) record.
 * Path: /infections/{infectionId}
 */
export interface Infection {
    infectionId: string; // Document ID
    patientId: string; // Reference to patients
    type: 'Surgical Site Infection' | 'UTI' | 'Pneumonia' | 'Bloodstream Infection';
    dateIdentified: string; // ISO Timestamp
    source: 'Post-op' | 'Catheter' | 'Ventilator' | 'Central Line';
    status: 'Active' | 'Resolved';
}

export interface MyReportedIssue {
  issueId: string;
  dateReported: string;
  description: string;
  item: string;
  status: string;
}

export interface Report {
    id: string;
    name: string;
    description: string;
    data: any[];
}
export interface LabReport {
    reportId: string;
    date: string;
    testVolumes: { testName: string; volume: number }[];
    turnaroundTimes: { testName: string; avgTAT: number }[];
    abnormalResultTrends: { testName: string; abnormalPercentage: number }[];
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
  role: 'admin' | 'doctor' | 'nurse' | 'pharmacist' | 'patient' | 'billing_clerk' | 'triage_officer' | 'lab_technician' | 'ot_coordinator' | 'receptionist' | 'radiologist' | 'dietitian' | 'housekeeping' | 'space_manager';
  is_active: boolean;
  department?: string;
  specialty?: string;
  created_at: string;
  last_login: string;
  photoURL?: string;
  patient_id?: string; // If user is also a patient
  availability?: Record<string, string[]>;
  isMfaEnabled?: boolean;
  failedLoginAttempts?: number;
  hodId?: string;
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
  developmentGoals?: DevelopmentGoal[];
}

/**
 * Represents a user-defined report template for ad-hoc reporting.
 * Path: /saved_reports/{reportId}
 */
export interface SavedReport {
  reportId: string; // Document ID
  userId: string; // Reference to users collection, who created the report
  reportName: string;
  description?: string;
  queryDetails: {
    collections: string[]; // e.g., ['patients', 'invoices']
    filters: Record<string, any>; // e.g., { "dateRange": ["2025-01-01", "2025-03-31"], "patientType": "Inpatient" }
    metrics: string[]; // e.g., ['patientCount', 'totalRevenue']
    groupBy?: string; // e.g., 'doctorId', 'department'
  };
}


// =========================================================================
// == Health Education & Reminders
// =========================================================================

/**
 * Represents a piece of health education material.
 * Path: /health_content/{contentId}
 */
export interface HealthContent {
  contentId: string;
  title: string;
  body: string; // The main content, can be markdown or plain text
  keywords: string[]; // For tagging and searching, e.g., ['hypertension', 'blood pressure']
  fileUrl?: string; // Optional link to a PDF or video
}

/**
 * Represents a scheduled reminder for a patient.
 * Path: /reminders/{reminderId}
 */
export interface Reminder {
  reminderId: string;
  patientId: string;
  type: 'Appointment' | 'Medication' | 'Immunization';
  scheduledDateTime: string; // ISO Timestamp
  message: string;
  isSent: boolean;
  relatedDocId?: string; // Optional link to the original document, e.g., appointmentId
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

export interface InfectionReport {
    reportId: string;
    month: string;
    totalPatientDays: number;
    infectionCount: number;
    ratePer1000Days: number;
    breakdownByWard: Record<string, number>;
}

export interface EfficacyReport {
    reportId: string;
    treatmentPlanTitle: string;
    averageEfficacy: number;
    totalCases: number;
}

/**
 * Represents a patient document in the 'patients' collection.
 * The document ID for a patient should be a unique, system-generated Patient ID (e.g., P-240808-0001).
 * This ensures uniqueness and helps in creating scalable, predictable paths to patient data.
 */
export interface Patient {
  patient_id: string; // Document ID, e.g., P-123456
  title?: string;
  first_name: string;
  last_name: string;
  full_name: string; // Denormalized for searching/display
  otherNames?: string;
  ghanaCardId?: string;
  dob: string; // ISO 8601 format
  gender: 'Male' | 'Female' | 'Other';
  maritalStatus?: 'Single' | 'Married' | 'Divorced' | 'Widowed';
  occupation?: string;
  patientType: string; // e.g., 'private', 'corporate', 'public' - links to a pricing tier
  contact: {
    primaryPhone: string;
    alternatePhone?: string;
    email?: string;
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
    allergies?: string[];
    preExistingConditions?: string[];
  };
  is_admitted: boolean;
  current_admission_id?: string | null;
  status: 'active' | 'inactive' | 'deceased';
  lastVisitDate?: string;
  created_at: string; // ISO 8601 format
  updated_at: string; // ISO 8601 format
  portalAccess?: boolean; // Flag for patient portal access
}

/**
 * Represents an appointment in the 'appointments' collection.
 * This collection is used for scheduling all types of patient appointments.
 */
export interface Appointment {
  appointment_id: string;
  patient_id: string;
  patient_name: string;
  doctor_id: string;
  doctor_name: string;
  appointment_date: string; // ISO 8601 format
  end_time: string; // ISO 8601 format
  duration: number; // in minutes
  type: 'consultation' | 'follow-up' | 'procedure';
  department: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show' | 'confirmed';
  isBilled: boolean;
  isConfirmed: boolean;
  bookingMethod: 'Online Portal' | 'Front Desk' | 'Referral';
  notes?: string;
  isVirtual?: boolean; // Flag for telemedicine appointments
  telemedicineLink?: string; // URL for the virtual consultation
  created_at: string; // ISO 8601 format
  updated_at: string; // ISO 8601 format
}

/**
 * Represents a patient's admission history in a sub-collection under the patient.
 * Path: /patients/{patientId}/admissions/{admissionId}
 */
export interface Admission {
  admission_id: string;
  patient_id: string;
  type: 'Inpatient' | 'Outpatient' | 'Emergency';
  admission_date: string; // ISO 8601 format
  discharge_date?: string | null; // ISO 8601 format
  reasonForVisit: string;
  ward: string;
  bed_id: string;
  attending_doctor_id: string;
  attending_doctor_name: string; // Denormalized for display
  status: 'Admitted' | 'Discharged' | 'Pending Discharge';
  dischargeSummary?: string; // The final clinical summary written by the doctor
  patientInstructions?: string; // Patient-friendly discharge instructions
  summary_pdf_url?: string; // URL to the generated PDF summary in Firebase Storage
  isSummaryFinalized?: boolean;
  finalBillId?: string; // Link to the final invoice
  created_at: string;
  updated_at: string;
  readmissionFlag?: boolean;
}

/**
 * Represents a referral document in the central 'referrals' collection.
 * This tracks patients referred to the hospital from external providers.
 */
export interface Referral {
  referral_id: string;
  referringProvider: string;
  referralDate: string; // ISO Timestamp
  patientDetails: {
    name: string;
    phone: string;
    dob: string;
  };
  reasonForReferral: string;
  priority: 'Routine' | 'Urgent' | 'Emergency';
  assignedDepartment: string;
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  status: 'Pending Review' | 'Assigned' | 'Scheduled' | 'Completed';
  appointmentId?: string; // Link to the appointment created from this referral
  notes?: string; // Optional internal notes
  created_at: string; // ISO 8601 format
  updated_at: string; // ISO 8601 format
}

/**
 * Represents a single clinical note in a sub-collection under the patient.
 * Path: /patients/{patientId}/clinical_notes/{noteId}
 */
export interface ClinicalNote {
  noteId: string;
  patientId: string;
  noteType: 'Consultation' | 'Nursing Note' | 'Discharge Summary';
  recordedByUserId: string;
  noteText: string;
  recordedAt: string; // ISO 8601 format
}

/**
 * Represents a single vitals log entry in a sub-collection under the patient.
 * Path: /patients/{patientId}/vitals/{vitalId}
 */
export interface VitalsLog {
  vitalId: string;
  patientId: string;
  bloodPressure: string;
  heartRate: string;
  temperature: string;
  respiratoryRate: string;
  oxygenSaturation: string;
  painScore?: string;
  notes?: string;
  recordedByUserId: string;
  recordedAt: string; // ISO 8601 format
}

/**
 * Represents data from a remote patient monitoring device.
 * Path: /remote_patient_data/{dataId}
 */
export interface RemotePatientData {
    dataId: string;
    patientId: string;
    dataType: 'Blood Pressure' | 'Heart Rate' | 'Oxygen Saturation' | 'Glucose';
    value: number | { systolic: number, diastolic: number };
    timestamp: string; // ISO Timestamp
}


/**
 * Represents a patient's care plan.
 * Path: /patients/{patientId}/care_plans/{planId}
 */
export interface CarePlan {
  planId: string;
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

/**
 * Represents a single medication record in a patient's EHR.
 * This is the medication history for the patient.
 * Path: /patients/{patientId}/medication_history/{prescriptionId}
 */
export interface MedicationRecord {
  prescriptionId: string; // Document ID
  patientId: string;
  patientName: string; // Denormalized for display
  medicationName: string;
  dosage: string;
  frequency: string;
  instructions: string;
  prescribedByDoctorId: string;
  prescribedByDoctorName: string; // Denormalized
  prescribedAt: string; // ISO 8601 format
  status: 'Active' | 'Discontinued' | 'Completed' | 'Filled';
}

/**
 * Represents a single prescription containing one or more medications.
 * This is the operational document sent to the pharmacy.
 * Path: /prescriptions/{prescriptionId}
 */
export interface Prescription {
  prescriptionId: string;
  patientId: string;
  patientName: string; // Denormalized for display
  doctorId: string;
  datePrescribed: string; // ISO 8601 format
  status: 'Pending' | 'Dispensed' | 'Canceled';
  isDispensed: boolean;
  medications: PrescribedMedication[];
}

/**
 * Represents a single prescribed medication within a prescription.
 */
export interface PrescribedMedication {
    itemId: string; // Link to the inventory item
    name: string;
    dosage: string;
    frequency: string;
    duration: number; // in days
    quantity_to_dispense: number;
}

/**
 * Represents a vaccine in the central catalog.
 * Path: /vaccine_catalog/{vaccineId}
 */
export interface Vaccine {
  vaccineId: string; // e.g., 'BCG', 'MMR'
  name: string;
  schedule: {
    dose: number;
    intervalMonths?: number;
    intervalYears?: number;
  }[];
  brandNames: string[];
}

/**
 * Represents an immunization record for a patient.
 * Path: /patients/{patientId}/immunizations/{immunizationId}
 */
export interface ImmunizationRecord {
  immunizationId: string;
  patientId: string;
  vaccineName: string; // Denormalized from catalog
  doseNumber: number;
  administeredAt: string; // ISO Timestamp
  nextDueDate?: string | null; // ISO Timestamp
  administeredByUserId: string; // Nurse/Doctor ID
  notes?: string;
}

/**
 * Represents a physical or digital asset owned by the hospital.
 * Path: /assets/{assetId}
 */
export interface Asset {
  assetId: string; // Document ID
  name: string; // e.g., 'MRI Scanner 1'
  modelNumber?: string;
  serialNumber?: string;
  type: 'Medical Equipment' | 'IT Equipment' | 'Furniture' | 'Building Component' | 'Room';
  department: string;
  location: string;
  operatingHours?: Record<string, string>; // e.g., { "Mon-Fri": "08:00-20:00" }
  isBookable: boolean; // Can this resource be scheduled?
  status: 'Operational' | 'Under Maintenance' | 'Needs Repair' | 'Decommissioned';
  modality?: string; // Specific for radiology equipment, e.g., 'MRI', 'CT Scan'
  purchaseDate?: string;
  purchaseCost?: number;
  currentBookValue?: number;
  warrantyEndDate?: string;
  maintenanceSchedule?: {
      type: 'Preventive' | 'Corrective';
      frequency: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Annually';
      lastServiceDate: string;
      nextServiceDate: string;
  }[];
}

/**
 * Represents a single booking for a schedulable resource.
 * Path: /resource_bookings/{bookingId}
 */
export interface ResourceBooking {
  bookingId: string; // Document ID
  resourceId: string; // Reference to 'assets'
  bookedByUserId: string;
  startTime: string; // ISO Timestamp
  endTime: string; // ISO Timestamp
  status: 'Confirmed' | 'Canceled' | 'Tentative';
  reason: string;
  relatedAppointmentId?: string; // Optional link to an appointment
}

/**
 * Represents a single entry on a waiting list for a service.
 * Path: /waiting_lists/{waitinglistId}
 */
export interface WaitingListEntry {
  waitinglistId: string;
  patientId: string;
  requestedService: string;
  requestedServiceId?: string; // Optional ID for the service, e.g., a specific procedure or OT room
  priority: 'Routine' | 'Urgent' | 'Elective';
  dateAdded: string; // ISO Timestamp
  status: 'Active' | 'Scheduled' | 'Canceled';
  notes?: string;
}


/**
 * Represents a surgical session in the Operating Theatre.
 * Path: /ot_sessions/{sessionId}
 */
export interface OTSession {
  sessionId: string;
  patientId: string;
  otRoomId: string;
  procedureName: string;
  patientName: string;
  leadSurgeonName: string;
  leadSurgeonId: string;
  startTime: Date;
  endTime: Date;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Canceled' | 'Post-Op';
  postOpNotes?: string;
  recoveryStatus?: 'Monitoring' | 'Stable' | 'Discharged';
  recoveryRoomEntryTime?: string;
}

/**
 * Represents a patient's dietary profile.
 * Path: /dietary_profiles/{profileId} (where profileId is usually the patientId)
 */
export interface DietaryProfile {
  profileId: string; // Document ID (usually same as patientId)
  patientId: string;
  allergies?: string[];
  restrictions?: string[]; // e.g., 'Low Sodium', 'Diabetic'
  preferences?: string[];
}

/**
 * Represents a single meal order for a patient.
 * Path: /meal_orders/{mealOrderId}
 */
export interface MealOrder {
  mealOrderId: string;
  patientId: string;
  orderDateTime: string; // ISO Timestamp
  mealType: 'Breakfast' | 'Lunch' | 'Dinner';
  dietaryPlan: string; // e.g., 'Low Sodium', 'Diabetic', 'Standard'
  mealItems: string[];
  status: 'Ordered' | 'Preparing' | 'Delivered' | 'Canceled';
}

/**
 * Represents a facility zone for maintenance purposes.
 * Path: /facility_zones/{zoneId}
 */
export interface FacilityZone {
  zoneId: string;
  name: string;
  managerId?: string;
  maintenanceRequests: number;
}

/**
 * Represents a maintenance work order.
 * Path: /work_orders/{workOrderId}
 */
export interface WorkOrder {
  workOrderId: string;
  assetId?: string;
  facilityIssue?: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Open' | 'Assigned' | 'In Progress' | 'Resolved' | 'Closed';
  reportedByUserId: string;
  dateReported: string;
  assignedToUserId?: string;
  dateAssigned?: string;
  dateResolved?: string;
}

/**
 * Represents a spare part in inventory.
 * Path: /spare_parts/{partId}
 */
export interface SparePart {
  partId: string;
  name: string;
  partNumber: string;
  compatibleWith: string[]; // Array of assetIds
  currentQuantity: number;
  reorderLevel: number;
  supplierId: string;
  location: string;
}

/**
 * Represents a log entry for a spare part transaction.
 * Path: /spare_parts/{partId}/transactions/{logId}
 */
export interface SparePartLog {
  logId: string;
  partId: string;
  transactionType: 'Usage' | 'Restock' | 'Adjustment';
  quantityChange: number;
  date: string;
  userId: string;
  workOrderId?: string;
  purchaseOrderId?: string;
  notes?: string;
}

/**
 * Represents a utility meter.
 * Path: /utility_meters/{meterId}
 */
export interface Meter {
  meterId: string;
  type: 'Electricity' | 'Water' | 'Gas';
  location: string;
  unit: string; // e.g., kWh, m³
}

/**
 * Represents a single reading or consumption log for a utility.
 * Path: /utility_consumption/{logId}
 */
export interface UtilityConsumption {
  logId: string;
  date: string;
  meterId: string;
  type: 'Electricity' | 'Water' | 'Gas';
  reading: number;
  consumption: number;
}

/**
 * Represents a security incident log.
 * Path: /security_incidents/{incidentId}
 */
export interface SecurityIncident {
  incidentId: string;
  timestamp: string; // ISO Timestamp
  type: 'Unauthorized Access' | 'Theft' | 'Dispute' | 'Violence' | 'Other';
  location: string;
  reportedByUserId: string;
  details: string;
  status: 'New' | 'Under Investigation' | 'Resolved';
  resolutionNotes?: string;
}

/**
 * Represents a housekeeping task.
 * Path: /housekeeping_tasks/{taskId}
 */
export interface HousekeepingTask {
  taskId: string;
  type: 'Room Cleaning' | 'Waste Disposal' | 'Linen Change';
  location: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  dateCreated: string;
  assignedToUserId?: string;
  dateCompleted?: string;
  notes?: string;
}

/**
 * Represents a depreciation record for an asset.
 * Path: /assets/{assetId}/depreciation_history/{recordId}
 */
export interface DepreciationRecord {
  recordId: string;
  assetId: string;
  dateCalculated: string;
  period: 'Monthly' | 'Annually';
  depreciationAmount: number;
  accumulatedDepreciation: number;
  bookValue: number;
}

/**
 * Represents a secure message between a patient and a provider.
 */
export interface Message {
  messageId: string;
  senderId: string;
  senderName: string; // Denormalized for display
  receiverId: string;
  messageBody: string;
  timestamp: string; // ISO Timestamp
  isRead: boolean;
}

/**
 * Represents a patient's medical diagnosis.
 * Path: /patients/{patientId}/diagnoses/{diagnosisId}
 */
export interface Diagnosis {
  diagnosisId: string;
  icd10Code: string;
  diagnosisText: string;
  isPrimary: boolean;
  diagnosedByDoctorId: string;
  diagnosedAt: string; // ISO Timestamp
}
    

    


