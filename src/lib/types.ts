
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

// Updated Appointment structure
export interface Appointment {
  appointmentId: string;
  patientId: string;
  attendingDoctorId: string; // Key for filtering the workbench view
  appointmentDateTime: Date;
  reasonForVisit: string;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  isWalkIn?: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Denormalized fields for easier display
  patientName?: string; 
  doctorName?: string;
}
    
export interface Referral {
  referralId: string;
  patientId?: string; // explicit link to patient document
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

/**
 * @collection /patients/{patientId}/clinical_notes
 * @description For doctor's notes and progress reports.
 */
export interface ClinicalNote {
  noteId: string; // Unique ID for the note, will be document ID
  patientId: string; // Denormalized for easier queries
  noteText: string; // The content of the note, can support rich text/markdown
  noteType: 'Progress Note' | 'Consultation Note' | 'Discharge Summary';
  recordedByUserId: string; // Reference to the user who wrote the note
  recordedByUserName: string;
  recordedAt: Date; // Timestamp of when the note was created
}

/**
 * @collection /patients/{patientId}/vitals
 * @description For nurses to log vital signs.
 */
export interface VitalSign {
  vitalId: string; // Unique ID for the vital sign entry, will be document ID
  patientId: string; // Denormalized for easier queries
  temperature: number; // in Celsius
  bloodPressure: string; // e.g., '120/80'
  heartRate: number; // beats per minute
  oxygenSaturation: number; // percentage
  recordedByUserId: string; // Reference to the user who recorded the vitals
  recordedAt: Date; // Timestamp of when the vitals were recorded
}

/**
 * @collection /patients/{patientId}/diagnoses
 * @description A list of patient diagnoses.
 */
export interface Diagnosis {
  diagnosisId: string; // Unique ID for the diagnosis, will be document ID
  patientId: string; // Denormalized for easier queries
  icd10Code: string; // e.g., 'A09'
  diagnosisText: string; // e.g., 'Infectious gastroenteritis and colitis'
  isPrimary: boolean; // Indicates if this is the primary diagnosis
  diagnosedByDoctorId: string; // Reference to the doctor who made the diagnosis
  diagnosedAt: Date; // Timestamp of when the diagnosis was made
}

/**
 * @collection /patients/{patientId}/medication_history
 * @description A record of all medications prescribed. This is the link to the Pharmacy module.
 */
export interface MedicationHistory {
  prescriptionId: string; // Unique ID for the prescription, will be document ID
  patientId: string; // Denormalized for easier queries
  medicationName: string;
  dosage: string;
  frequency: string;
  instructions: string;
  prescribedByDoctorId: string; // Reference to the prescribing doctor
  prescribedAt: Date;
  status: 'Active' | 'Discontinued' | 'Filled';
}

/**
 * @collection /patients/{patientId}/lab_results
 * @description A record of all lab tests ordered and their results. This is the link to the Lab module.
 */
export interface LabResult {
  testId: string; // Unique ID for the test, will be document ID
  patientId: string; // Denormalized for easier queries
  testName: string;
  status: 'Ordered' | 'In Progress' | 'Completed';
  reason?: string;
  result?: string; // Rich text or structured data for the result
  units?: string; // e.g., 'mg/dL'
  orderedByDoctorId: string; // Reference to the doctor who ordered the test
  labTechnicianId?: string; // Reference to the technician who performed the test
  orderedAt: Date;
  completedAt?: Date;
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
