
export type UserRole = "Admin" | "Doctor" | "Nurse" | "Pharmacist" | "Patient" | "BillingClerk" | "Housekeeping";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string;
}

// Core Patient Demographics as per the new specification
export interface Patient {
  patientId: string; // The unique patient identifier, will also be the document ID
  title?: string;
  firstName: string;
  lastName: string;
  fullName: string; // For easy searching
  ghanaCardId?: string; // For linking with national ID systems
  dob: Date; 
  gender: "Male" | "Female" | "Other";
  contact: {
    primaryPhone: string;
    email?: string;
  };
  address: {
    street: string;
    city: string;
    region: string;
    country: string;
  };
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  insurance?: {
    providerName: string;
    policyNumber: string;
    isActive: boolean;
    expiryDate: Date;
  };
  isAdmitted: boolean; // True if the patient is currently in a bed
  status: 'active' | 'inactive' | 'deceased'; // Overall status in the system
  currentAdmissionId?: string; // Link to the active admission document if admitted
  lastVisitDate?: Date; // Timestamp of the last completed visit
  createdAt: Date; 
  updatedAt: Date; 
}

export type AdmissionType = "Inpatient" | "Outpatient" | "Emergency";

// Inpatient status reflects the journey within the hospital stay.
export type AdmissionStatus = 'Admitted' | 'In Treatment' | 'Pending Discharge' | 'Discharged' | 'Cancelled';


export interface MedicationAtDischarge {
    name: string;
    dosage: string;
    instructions: string;
}

export interface DischargeSummary {
    diagnosisOnDischarge: string;
    treatmentProvided: string;
    conditionAtDischarge: string;
    medicationAtDischarge: MedicationAtDischarge[];
    followUpInstructions: string;
}

// Represents a single admission event for a patient.
export interface Admission {
  admissionId: string;
  patientId: string;
  type: AdmissionType;
  admissionDate: Date; 
  dischargeDate?: Date; 
  reasonForVisit: string;
  ward?: string; // Only for Inpatient
  bedId?: string; // Only for Inpatient, reference to beds collection
  attendingDoctorId: string; // reference to users collection
  dischargeByDoctorId?: string; // Who authorized the discharge
  status: AdmissionStatus;
  referralDetails?: {
    referredBy: string; 
    referralReason: string;
  };
  dischargeSummary?: DischargeSummary;
  isSummaryFinalized?: boolean; // Defaults to false
  finalBillId?: string;
  summaryPDF_URL?: string;
  createdAt: Date; 
  updatedAt: Date; 
}


export type BedStatus = "occupied" | "vacant" | "cleaning" | "maintenance";

// Represents a bed in the hospital.
export interface Bed {
    bedId: string; // Document ID (e.g., "WARD-A-ROOM-101-BED-1")
    wardName: string; // e.g., "Cardiology Ward"
    roomNumber: string; // e.g., "101"
    status: BedStatus; // e.g., 'vacant', 'occupied', 'cleaning', 'maintenance'
    currentPatientId?: string; // The ID of the patient currently occupying the bed
    currentAdmissionId?: string; // The ID of the admission associated with the occupancy
    occupiedSince?: Date; 
    cleaningNeeded: boolean; // True if the bed needs cleaning
    isReserved?: boolean; // True if the bed is reserved for an incoming patient
    createdAt: Date; 
    updatedAt: Date; 
}


export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  department: string;
  date: string;
  time: string;
  reason: string;
  status: "Scheduled" | "Completed" | "Cancelled" | "In Progress";
  resource?: string; // e.g., 'Operating Theater 1'
  referralId?: string; // Bidirectional link to the referral
}
    
export interface Referral {
  referralId: string;
  patientId: string; // explicit link to patient document
  patientDetails: {
    fullName: string;
    contactPhone: string;
    reasonForReferral: string;
  };
  referringProvider: {
    name: string;
    contact: string;
  };
  referredToDepartment: string;
  status: 'Pending' | 'Assigned' | 'Completed' | 'Cancelled';
  referralDate: Date;
  assignedToDoctorId?: string; // Reference to User id
  appointmentId?: string; // Reference to Appointment id
  createdAt: Date;
  updatedAt: Date;
}

// =================================================================
// EHR (Electronic Health Record) Sub-collection Types
// These documents would live under /patients/{patientId}/<collectionName>
// =================================================================

export type NoteType = 'Doctor' | 'Nurse' | 'Consultation' | 'DischargeSummary';

/**
 * @collection /patients/{patientId}/clinical_notes
 * @description Records all clinical notes, observations, and summaries from staff.
 */
export interface ClinicalNote {
  noteId: string;
  patientId: string;
  admissionId?: string; // Optional: link to a specific admission
  noteType: NoteType;
  content: string;
  createdBy: string; // User ID of the creator
  creatorRole: UserRole;
  createdAt: Date;
}

/**
 * @collection /patients/{patientId}/vitals
 * @description Stores time-series data of patient vital signs.
 */
export interface VitalSign {
  vitalId: string;
  patientId: string;
  admissionId?: string;
  recordedAt: Date;
  recordedBy: string; // Nurse User ID
  bloodPressure: {
    systolic: number;
    diastolic: number;
  };
  heartRate: number; // beats per minute
  respiratoryRate: number; // breaths per minute
  temperature: number; // in Celsius
  oxygenSaturation: number; // percentage
}


export type DiagnosisStatus = 'Active' | 'Resolved' | 'Provisional';

/**
 * @collection /patients/{patientId}/diagnoses
 * @description A list of formal diagnoses for the patient.
 */
export interface Diagnosis {
  diagnosisId: string;
  patientId: string;
  admissionId?: string;
  diagnosisCode: string; // e.g., ICD-10 code
  description: string;
  status: DiagnosisStatus;
  diagnosedBy: string; // Doctor User ID
  diagnosedAt: Date;
}

export type MedicationOrderStatus = 'Active' | 'Discontinued' | 'Filled' | 'Pending';

/**
 * @collection /patients/{patientId}/medication_history (or medication_orders)
 * @description A record of all medications prescribed to the patient.
 */
export interface MedicationOrder {
  orderId: string;
  patientId: string;
  admissionId?: string;
  medicationName: string;
  dosage: string;
  route: string; // e.g., 'Oral', 'IV'
  frequency: string; // e.g., 'Twice a day'
  status: MedicationOrderStatus;
  orderedBy: string; // Doctor User ID
  orderedAt: Date;
  notes?: string;
}

export type LabStatus = 'Ordered' | 'SampleCollected' | 'InProgress' | 'Completed' | 'Cancelled';

/**
 * @collection /patients/{patientId}/lab_results
 * @description Stores results from laboratory tests.
 */
export interface LabResult {
  labResultId: string;
  patientId: string;
  orderId: string;
  testName: string;
  status: LabStatus;
  orderedBy: string; // Doctor User ID
  orderedAt: Date;
  resultValue?: string;
  referenceRange?: string;
  isAbnormal: boolean;
  completedAt?: Date;
  notes?: string;
}

export type AllergySeverity = 'Mild' | 'Moderate' | 'Severe' | 'Life-threatening';

export interface Allergy {
  allergyId: string;
  patientId: string;
  substance: string;
  reaction: string;
  severity: AllergySeverity;
  recordedBy: string;
  recordedAt: Date;
}
