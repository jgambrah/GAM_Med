
/**
 * @fileoverview This file defines the core data structures (TypeScript types) for the GamMed ERP system.
 * Updated for Multi-Tenant SaaS architecture using Logical Isolation.
 */

export interface Hospital {
  hospitalId: string;
  name: string;
  subdomain?: string;
  apiKey?: string;
  isActive: boolean;
  createdAt: string;
}

export interface User {
  uid: string;
  hospitalId: string; // Tenant ID
  email: string;
  name: string;
  role: 'admin' | 'doctor' | 'nurse' | 'pharmacist' | 'patient' | 'billing_clerk' | 'lab_technician' | 'ot_coordinator' | 'receptionist' | 'radiologist' | 'dietitian' | 'housekeeping' | 'space_manager' | 'supplier';
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
}

export interface Patient {
  patient_id: string;
  hospitalId: string; // Tenant ID
  title: string;
  first_name: string;
  last_name: string;
  full_name: string;
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
}

export interface Appointment {
  appointment_id: string;
  hospitalId: string; // Tenant ID
  patient_id: string;
  patient_name: string;
  doctor_id: string;
  doctor_name: string;
  department: string;
  appointment_date: string;
  end_time: string;
  duration: number;
  type: 'consultation' | 'follow-up' | 'procedure';
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
  isBilled: boolean;
  isConfirmed: boolean;
  bookingMethod: 'Online Portal' | 'Front Desk' | 'Referral';
  notes?: string;
  isVirtual?: boolean;
  telemedicineLink?: string;
  created_at: string;
  updated_at: string;
}

export interface Admission {
  admission_id: string;
  hospitalId: string; // Tenant ID
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
}

export interface Bed {
  bed_id: string;
  hospitalId: string; // Tenant ID
  wardName: string;
  room_number: string;
  status: 'occupied' | 'vacant' | 'cleaning' | 'maintenance' | 'Reserved';
  current_patient_id?: string | null;
  occupied_since?: string | null;
  cleaningNeeded: boolean;
  created_at: string;
  updated_at: string;
}

export interface Referral {
  referral_id: string;
  hospitalId: string; // Tenant ID
  referringProvider: string;
  referralDate: string;
  patientDetails: {
    name: string;
    phone: string;
    dob: string;
  };
  reasonForReferral: string;
  priority: 'Routine' | 'Urgent' | 'Emergency';
  assignedDepartment: string;
  status: 'Pending Review' | 'Assigned' | 'Scheduled' | 'Completed';
  notes?: string;
  patientId?: string;
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  created_at: string;
  updated_at: string;
}

// ... Additional types would also have hospitalId appended ...
export interface LabResult {
  testId: string;
  hospitalId: string; // Tenant ID
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
  };
}

export interface MedicationRecord {
  prescriptionId: string;
  hospitalId: string; // Tenant ID
  patientId: string;
  patientName: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  instructions: string;
  prescribedByDoctorId: string;
  prescribedByDoctorName: string;
  prescribedAt: string;
  status: 'Active' | 'Discontinued' | 'Completed' | 'Filled';
}

export interface LedgerAccount {
  accountId: string;
  hospitalId: string; // Tenant ID
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
  hospitalId: string; // Tenant ID
  accountId: string;
  date: string;
  description: string;
  debit?: number;
  credit?: number;
}

export interface Invoice {
  invoiceId: string;
  hospitalId: string; // Tenant ID
  patientId: string;
  patientName: string;
  patientType: string;
  issueDate: string;
  dueDate: string;
  billedItems: any[];
  subtotal: number;
  grandTotal: number;
  amountDue: number;
  status: string;
}

export interface AuditLog {
  logId: string;
  hospitalId: string; // Tenant ID
  timestamp: string;
  userId: string;
  action: string;
  details: any;
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
  status: string;
  isBookable: boolean;
  modality?: string;
  purchaseDate?: string;
  purchaseCost?: number;
  currentBookValue?: number;
  warrantyEndDate?: string;
  maintenanceSchedule?: any[];
}
export interface WaitingListEntry {
  waitinglistId: string;
  hospitalId: string;
  patientId: string;
  requestedService: string;
  priority: string;
  dateAdded: string;
  status: string;
  notes?: string;
}
export interface StaffExpenseClaim {
  claimId: string;
  hospitalId: string;
  staffId: string;
  staffName: string;
  amount: number;
  description: string;
  expenseAccountId: string;
  submissionDate: string;
  approvalStatus: string;
  paymentStatus: string;
  attachmentUrl?: string;
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
  mealItems: string[];
  status: string;
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
  description: string;
  priority: string;
  status: string;
  dateReported: string;
}
export interface SparePart {
  partId: string;
  hospitalId: string;
  name: string;
  currentQuantity: number;
  reorderLevel: number;
}
export interface SparePartLog {
  logId: string;
  hospitalId: string;
  partId: string;
  transactionType: string;
  quantityChange: number;
  date: string;
}
export interface Meter { meterId: string; hospitalId: string; type: string; unit: string; }
export interface UtilityConsumption { logId: string; hospitalId: string; date: string; consumption: number; type: string; }
export interface SecurityIncident { incidentId: string; hospitalId: string; timestamp: string; type: string; status: string; details: string; }
export interface HousekeepingTask { taskId: string; hospitalId: string; type: string; location: string; status: string; dateCreated: string; }
export interface DepreciationRecord { recordId: string; hospitalId: string; assetId: string; dateCalculated: string; bookValue: number; }
export interface InfectionReport { reportId: string; hospitalId: string; month: string; ratePer1000Days: number; }
export interface EfficacyReport { reportId: string; hospitalId: string; treatmentPlanTitle: string; averageEfficacy: number; }
export interface Message { messageId: string; hospitalId: string; senderId: string; receiverId: string; messageBody: string; timestamp: string; isRead: boolean; }
export interface Reminder { reminderId: string; hospitalId: string; patientId: string; type: string; scheduledDateTime: string; message: string; isSent: boolean; }
export interface Diagnosis { diagnosisId: string; hospitalId: string; patientId: string; diagnosisText: string; icd10Code: string; diagnosedAt: string; }
