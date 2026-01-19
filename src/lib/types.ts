

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
 * Represents a scheduled appointment in the 'appointments' collection.
 * This is the central document for managing patient and resource scheduling.
 */
export interface Appointment {
  appointment_id: string; // Document ID
  patient_id: string; // Reference to 'patients' collection
  patient_name: string; // Denormalized for quick display
  doctor_id: string; // Reference to 'users' collection
  doctor_name: string; // Denormalized for quick display
  department: string; // e.g., 'Cardiology', 'Pediatrics'
  appointment_date: string; // ISO 8601 Timestamp for the start of the appointment
  end_time: string; // ISO 8601 Timestamp for the end
  duration: number; // in minutes
  type: 'consultation' | 'follow-up' | 'procedure';
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
  isBilled: boolean;
  isConfirmed: boolean;
  bookingMethod: 'Online Portal' | 'Front Desk' | 'Referral';
  notes?: string;
  isVirtual?: boolean; // Flag for telemedicine appointments
  telemedicineLink?: string; // URL for the virtual meeting
  created_at: string; // ISO 8601 Timestamp
  updated_at: string; // ISO 8601 Timestamp
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

/**
 * Represents a patient referral from an external provider.
 * Path: /referrals/{referralId}
 */
export interface Referral {
  referral_id: string; // Document ID
  referringProvider: string; // e.g., 'Korle Bu Polyclinic'
  referralDate: string; // ISO Timestamp
  patientDetails: {
    name: string;
    phone: string;
    dob: string; // YYYY-MM-DD
  };
  reasonForReferral: string;
  priority: 'Routine' | 'Urgent' | 'Emergency';
  assignedDepartment: string; // e.g., 'Cardiology'
  status: 'Pending Review' | 'Assigned' | 'Scheduled' | 'Completed';
  notes?: string; // Internal notes for triage
  patientId?: string; // Link to the created patient record
  assignedDoctorId?: string; // UID of the doctor assigned
  assignedDoctorName?: string; // Denormalized for display
  appointmentId?: string; // Link to the scheduled appointment
  created_at: string; // ISO Timestamp
  updated_at: string; // ISO Timestamp
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
  patientName?: string; // Denormalized for display
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
  patientName: string; // Denormalized
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
 * Represents a single quotation received from a supplier for an RFQ.
 */
export interface Quote {
    quoteId: string;
    supplierId: string;
    supplierName: string; // Denormalized for display
    dateSubmitted: string; // ISO Timestamp
    totalAmount: number;
    status: 'Submitted' | 'Awarded' | 'Not Awarded';
    items?: {
        itemId: string;
        unitPrice: number;
        notes?: string;
    }[];
    attachmentUrl?: string; // URL to the supplier's quote document
}

/**
 * Represents an entry in the activity log for an RFQ.
 */
export interface RfqActivityLogEntry {
    timestamp: string; // ISO Timestamp
    activity: string; // e.g., "RFQ Created", "Supplier notification sent", "Quote Received from XYZ"
    userId?: string; // User who performed the action, if applicable
}

/**
 * Represents a Request for Quotation sent to suppliers.
 * Path: /rfqs/{rfqId}
 */
export interface RequestForQuotation {
  rfqId: string; // Document ID
  title: string;
  dateCreated: string; // ISO Timestamp
  deadline: string; // ISO Timestamp for quote submissions
  status: 'Draft' | 'Open for Bids' | 'Evaluating' | 'Closed' | 'Canceled';
  items: {
      itemId: string;
      name: string; // Denormalized for display
      quantity: number;
  }[];
  invitedSuppliers?: string[]; // Array of supplier IDs
  quotes?: Quote[]; // Sub-collection or array of quote objects
  activityLog?: RfqActivityLogEntry[];
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
  status: 'Pending' | 'Paid' | 'Partially Paid' | 'Overdue' | 'Accrued';
  billedItems: BillLineItem[];
  whtAmount?: number;
  netAmount?: number;
  isNetPaid?: boolean;
  isWhtPosted?: boolean;
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
  amount: number;
  description: string;
  expenseAccountId: string; // Link to the LedgerAccount
  submissionDate: string; // ISO Timestamp
  approvalStatus: 'Pending HOD' | 'Approved' | 'Rejected';
  hodApprovalDate?: string; // ISO Timestamp
  rejectionReason?: string; // Reason for rejection, added by HOD
  paymentStatus: 'Unpaid' | 'Paid' | 'Accrued';
  paidDate?: string; // ISO Timestamp
  attachmentUrl?: string; // URL to the receipt/document
  netAmount?: number;
  whtAmount?: number;
  isNetPaid?: boolean;
  isWhtPosted?: boolean;
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
  attachmentUrl?: string;
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
  role: 'admin' | 'doctor' | 'nurse' | 'pharmacist' | 'patient' | 'billing_clerk' | 'triage_officer' | 'lab_technician' | 'ot_coordinator' | 'receptionist' | 'radiologist' | 'dietitian' | 'housekeeping' | 'space_manager' | 'supplier';
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
  qualifications?: Qualification[];
  certifications?: Certification[];
  licenses?: License[];
  employmentStatus?: 'Active' | 'Inactive' | 'On Leave';
  hireDate?: string;
  leaveBalances?: Record<string, number>;
  currentOnCallDuty?: boolean;
}

export interface Qualification {
    degree: string;
    institution: string;
    graduationYear: number;
}
export interface Certification {
    name: string;
    issuingBody: string;
    issueDate: string;
    expiryDate?: string;
}
export interface License {
    type: string;
    licenseNumber: string;
    expiryDate: string;
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

/**
 * Represents a patient record in the 'patients' collection.
 * This is the central document for all patient demographic and summary information.
 */
export interface Patient {
    patient_id: string; // Unique Patient Identifier, e.g., P-240808-0001
    title: string;
    first_name: string;
    last_name: string;
    full_name: string; // Concatenation for easy searching
    otherNames?: string;
    ghanaCardId?: string;
    dob: string; // ISO 8601 format date
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
      expiry_date: string; // ISO 8601 format
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
    created_at: string; // ISO 8601 format
    updated_at: string; // ISO 8601 format
  }

/**
 * Represents a patient's admission history.
 * This would typically be a sub-collection under a patient's document.
 * Path: /patients/{patientId}/admissions/{admissionId}
 */
export interface Admission {
  admission_id: string; // Document ID
  patient_id: string;
  type: 'Inpatient' | 'Outpatient' | 'Emergency';
  admission_date: string; // ISO 8601 Timestamp
  discharge_date?: string | null; // ISO 8601 Timestamp
  reasonForVisit: string;
  ward: string; // e.g., 'Cardiology', 'Maternity'
  bed_id: string; // e.g., 'C-101'
  attending_doctor_id: string;
  attending_doctor_name: string;
  status: 'Admitted' | 'Discharged' | 'Pending Discharge' | 'Cancelled';
  dischargeSummary?: {
    clinicalSummary: string;
    patientInstructions: string;
  };
  dischargeByDoctorId?: string;
  summary_pdf_url?: string;
  created_at: string; // ISO 8601 Timestamp
  updated_at: string; // ISO 8601 Timestamp
}
  

/**
 * Represents a clinical note in a patient's EHR.
 * Path: /patients/{patientId}/clinical_notes/{noteId}
 */
export interface ClinicalNote {
  noteId: string;
  patientId: string;
  noteType: 'Consultation' | 'Nursing Note' | 'Progress Note';
  recordedByUserId: string; // The UID of the user who wrote the note
  noteText: string;
  recordedAt: string; // ISO 8601 Timestamp
}
  

/**
 * Represents a log of a patient's vital signs at a specific time.
 * Path: /patients/{patientId}/vitals/{vitalId}
 */
export interface VitalsLog {
  vitalId: string;
  patientId: string;
  bloodPressure: string; // e.g., '120/80'
  heartRate: string; // e.g., '75'
  temperature: string; // e.g., '37.5'
  respiratoryRate: string; // e.g., '18'
  oxygenSaturation: string; // e.g., '98'
  painScore?: string; // e.g. '3'
  notes?: string;
  recordedByUserId: string;
  recordedAt: string; // ISO Timestamp
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
  createdBy: string; // User ID
  createdAt: string; // ISO Timestamp
  updatedBy: string; // User ID
  updatedAt: string; // ISO Timestamp
}
  

/**
 * Represents a medication entry in a patient's history.
 * Path: /patients/{patientId}/medication_history/{prescriptionId}
 */
export interface MedicationRecord {
  prescriptionId: string;
  patientId: string;
  patientName: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  instructions: string;
  prescribedByDoctorId: string;
  prescribedByDoctorName: string;
  prescribedAt: string; // ISO Timestamp
  status: 'Active' | 'Discontinued' | 'Completed' | 'Filled';
}
  
/**
 * Represents an entry in a log for when medication was administered.
 * Path: /patients/{patientId}/medication_administration_logs/{logId}
 */
export interface MedicationAdministrationLog {
  logId: string;
  prescriptionId: string; // Reference to the original prescription
  administeredAt: string; // ISO Timestamp
  administeredByUserId: string; // Nurse's UID
  notes?: string;
}

/**
 * Represents a single immunization record for a patient.
 * Path: /patients/{patientId}/immunizations/{immunizationId}
 */
export interface ImmunizationRecord {
  immunizationId: string;
  patientId: string;
  vaccineName: string;
  doseNumber: number;
  administeredAt: string; // ISO Timestamp
  nextDueDate?: string | null; // ISO Timestamp
  administeredByUserId: string;
  notes?: string;
}

/**
 * Represents a type of vaccine available in the hospital.
 * Path: /vaccine_catalog/{vaccineId}
 */
export interface Vaccine {
    vaccineId: string;
    name: string;
    schedule: { dose: number; intervalMonths?: number, intervalYears?: number }[];
    brandNames: string[];
}
    
/**
 * Represents a single bookable resource.
 * Path: /resources/{assetId}
 */
export interface Asset {
  assetId: string;
  name: string;
  type: 'Medical Equipment' | 'Room' | 'IT Equipment' | 'Furniture' | 'Building Component';
  department: string;
  location: string;
  status: 'Operational' | 'Under Maintenance' | 'Needs Repair' | 'Decommissioned';
  isBookable: boolean;
  operatingHours?: Record<string, string>; // e.g., { 'Mon-Fri': '09:00-17:00' }
  modality?: 'CT Scan' | 'MRI' | 'X-Ray' | 'Ultrasound'; // For medical equipment
  purchaseDate?: string;
  purchaseCost?: number;
  currentBookValue?: number;
  warrantyEndDate?: string;
  serialNumber?: string;
  modelNumber?: string;
  maintenanceSchedule?: {
      type: 'Preventive' | 'Corrective';
      frequency: 'Daily' | 'Weekly' | 'Monthly' | 'Annually';
      lastServiceDate: string;
      nextServiceDate: string;
  }[];
}

/**
 * Represents a single booking for a resource.
 * Path: /resource_bookings/{bookingId}
 */
export interface ResourceBooking {
  bookingId: string;
  resourceId: string; // Reference to 'resources'
  bookedByUserId: string;
  startTime: string; // ISO Timestamp
  endTime: string; // ISO Timestamp
  status: 'Confirmed' | 'Canceled';
  reason: string;
  relatedAppointmentId?: string;
}

/**
 * Represents a patient on a waiting list for a specific service.
 * Path: /waiting_lists/{waitinglistId}
 */
export interface WaitingListEntry {
  waitinglistId: string;
  patientId: string;
  requestedService: string; // e.g., 'Cardiology Consultation'
  requestedServiceId?: string; // Optional: ID of the specific service/clinic
  priority: 'Routine' | 'Urgent' | 'Elective';
  dateAdded: string; // ISO Timestamp
  status: 'Active' | 'Scheduled' | 'Canceled';
  notes?: string;
  appointmentId?: string; // Set when an appointment is booked
}

/**
 * Represents an individual prescribed medication within a larger prescription.
 */
export interface PrescribedMedication {
    itemId: string; // Reference to the inventory item
    name: string;
    dosage: string;
    frequency: string;
    duration: number; // in days
    quantity_to_dispense: number;
}
/**
 * Represents a single prescription document, which can contain multiple medications.
 * This is the document that goes to the pharmacy.
 */
export interface Prescription {
    prescriptionId: string;
    patientId: string;
    patientName: string; // Denormalized for display
    doctorId: string;
    datePrescribed: string; // ISO Timestamp
    status: 'Pending' | 'Dispensed' | 'Canceled';
    isDispensed: boolean; // Flag to indicate if the medication has been given to the patient
    medications: PrescribedMedication[];
    filledAt?: string; // ISO Timestamp when dispensed
    filledByPharmacistId?: string; // UID of the pharmacist
}
    
/**
 * Represents an entry in a facility zone.
 * Path: /facility_zones/{zoneId}
 */
export interface FacilityZone {
    zoneId: string;
    name: string; // e.g., 'Surgical Wing', 'Outpatient Lobby'
    managerId?: string; // User ID of the zone manager
    maintenanceRequests: number; // A count of open maintenance requests
}

/**
 * Represents a maintenance or repair request.
 * Path: /work_orders/{workOrderId}
 */
export interface WorkOrder {
    workOrderId: string;
    assetId?: string; // Optional: Link to a specific asset
    facilityIssue?: string; // Optional: General area if not asset-specific
    description: string;
    priority: 'High' | 'Medium' | 'Low';
    status: 'Open' | 'Assigned' | 'In Progress' | 'Resolved' | 'Closed';
    reportedByUserId: string;
    assignedToUserId?: string;
    dateReported: string;
    dateResolved?: string;
}

/**
 * Represents a single spare part in the maintenance inventory.
 * Path: /spare_parts/{partId}
 */
export interface SparePart {
    partId: string;
    name: string;
    partNumber: string;
    compatibleWith: string[]; // Array of asset IDs
    currentQuantity: number;
    reorderLevel: number;
    supplierId: string;
    location: string; // e.g., 'Maintenance Depot A, Shelf 1'
}

/**
 * Represents a single transaction in the spare parts log.
 * Path: /spare_parts_log/{logId}
 */
export interface SparePartLog {
    logId: string;
    partId: string;
    transactionType: 'Usage' | 'Restock' | 'Adjustment';
    quantityChange: number; // Negative for usage
    date: string;
    userId: string;
    workOrderId?: string;
    purchaseOrderId?: string;
    notes?: string;
}

/**
 * Represents a utility meter.
 * Path: /meters/{meterId}
 */
export interface Meter {
    meterId: string;
    type: 'Electricity' | 'Water' | 'Gas';
    location: string;
    unit: 'kWh' | 'm³';
}

/**
 * Represents a single reading from a utility meter.
 * Path: /utility_consumption/{logId}
 */
export interface UtilityConsumption {
    logId: string;
    date: string; // YYYY-MM-DD
    meterId: string;
    type: 'Electricity' | 'Water' | 'Gas';
    reading: number;
    consumption: number; // The amount consumed since the last reading
}

/**
 * Represents a security incident log.
 * Path: /security_incidents/{incidentId}
 */
export interface SecurityIncident {
    incidentId: string;
    timestamp: string;
    type: 'Unauthorized Access' | 'Theft' | 'Dispute' | 'Violence' | 'Other';
    location: string;
    reportedByUserId: string;
    details: string;
    status: 'Under Investigation' | 'Resolved';
    resolutionNotes?: string;
}

/**
 * Represents a housekeeping task.
 * Path: /housekeeping_tasks/{taskId}
 */
export interface HousekeepingTask {
  taskId: string;
  type: 'Room Cleaning' | 'Waste Disposal' | 'Linen Change';
  location: string; // e.g., Room C-102, OR-B
  status: 'Pending' | 'In Progress' | 'Completed';
  dateCreated: string;
  assignedToUserId?: string;
  notes?: string;
}

/**
 * Represents a single, immutable depreciation record for an asset.
 * Path: /depreciation_records/{recordId}
 */
export interface DepreciationRecord {
    recordId: string; // e.g., `ASSETID-YYYY`
    assetId: string;
    dateCalculated: string; // ISO Timestamp
    period: 'Annually' | 'Monthly';
    depreciationAmount: number;
    accumulatedDepreciation: number;
    bookValue: number; // The value of the asset after this depreciation
}

/**
 * Represents an aggregated report on hospital-acquired infections.
 * Path: /reports/infection_control/{reportId}
 */
export interface InfectionReport {
    reportId: string; // e.g., '2024-07'
    month: string;
    totalPatientDays: number;
    infectionCount: number;
    ratePer1000Days: number;
    breakdownByWard: Record<string, number>; // e.g., { "Surgical": 4, "Medical": 3 }
}

/**
 * Represents an aggregated report on the efficacy of a treatment plan.
 * Path: /reports/efficacy/{reportId}
 */
export interface EfficacyReport {
    reportId: string;
    treatmentPlanTitle: string;
    averageEfficacy: number; // e.g., 4.5 out of 5
    totalCases: number;
}

/**
 * Represents a secure message between two users.
 * Path: /messages/{messageId} (or could be a sub-collection)
 */
export interface Message {
  messageId: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  messageBody: string;
  timestamp: string;
  isRead: boolean;
  attachmentUrl?: string; // For images or documents
  attachmentName?: string;
}


// Deprecated types. Use their replacements.
export type PharmacyOrder = PurchaseOrder;
export type Resource = Asset;
    
// =========================================================================
// == Surgical Case Data Models (OT Module)
// =========================================================================

/**
 * Represents a single surgical case or session in the Operating Theatre.
 * This is the central document for tracking a surgery from scheduling to post-op.
 * Path: /surgical_cases/{caseId} or /ot_sessions/{sessionId}
 */
export interface OTSession {
  sessionId: string; // Document ID
  patientId: string; // Reference to patients
  patientName: string; // Denormalized for display
  procedureName: string; // e.g., 'Appendectomy'
  otRoomId: string; // Reference to operating_theatres
  leadSurgeonId: string; // Reference to users
  leadSurgeonName: string; // Denormalized
  teamIds?: string[]; // Array of other team members' user IDs
  requiredEquipmentIds?: string[]; // Array of resource IDs for special equipment
  startTime: Date; // ISO Timestamp
  endTime: Date; // ISO Timestamp
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Post-Op' | 'Canceled';
  postOpNotes?: string; // Notes from the surgeon after the procedure
  completedAt?: string; // Timestamp when status is set to 'Completed'
  recoveryRoomEntryTime?: string; // Timestamp when patient enters PACU
  dischargeFromRecoveryTime?: string; // Timestamp when patient leaves PACU
  recoveryStatus?: 'Monitoring' | 'Stable' | 'Discharged'; // Status within the recovery room
  isReminderSent?: boolean;
}


// =========================================================================
// == Dietary & Meal Management
// =========================================================================

/**
 * Represents a patient's dietary profile.
 * Path: /dietary_profiles/{patientId}
 */
export interface DietaryProfile {
    profileId: string; // Should be the same as patientId
    patientId: string;
    allergies?: string[];
    restrictions?: string[]; // e.g., 'Low Sodium', 'Diabetic', 'Vegetarian'
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
    mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
    dietaryPlan: string; // e.g., 'Low Sodium', 'Diabetic'
    mealItems: string[];
    status: 'Ordered' | 'Preparing' | 'Delivered' | 'Canceled';
    deliveredByUserId?: string; // UID of the dietary aide who delivered it
    deliveryTimestamp?: string;
}
