
/**
 * @fileoverview This file defines the core data structures (TypeScript types) for the GamMed ERP system.
 * Each type corresponds to a data model for a Firestore collection, serving as the single source of truth for the application's data architecture.
 * This ensures consistency between the frontend components and the backend database.
 */

/**
 * Represents a user in the 'users' collection.
 * The document ID should correspond to the Firebase Auth UID.
 */
export interface User {
  uid: string; // Corresponds to Firebase Auth UID
  email: string;
  name: string;
  role: 'admin' | 'doctor' | 'nurse' | 'pharmacist' | 'patient';
  is_active: boolean;
  patient_id?: string; // Link to the patient document, for users with the 'patient' role
  created_at: string; // ISO 8601 format
  last_login: string; // ISO 8601 format
  
  // Doctor-specific fields
  specialty?: string; // e.g., 'Cardiology', 'Pediatrics'
  department?: string; // e.g., 'Cardiology'

  photoURL?: string; // Optional: For profile pictures
}

/**
 * Represents a patient record in the 'patients' collection.
 *
 * ARCHITECTURAL NOTE:
 * The document ID for a patient record in Firestore should be their unique `patient_id`.
 * This approach is highly efficient for data retrieval, as it allows for direct document lookups
 * without needing a separate query. It also guarantees the uniqueness of the patient ID at the
 * database level, which is critical for data integrity across the entire ERP system.
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
    name:string;
    relationship: string;
    phone: string;
  };
  insurance?: {
    provider_name?: string; // e.g., 'NHIS', 'Glico', 'Private'
    policy_number?: string;
    isActive?: boolean;
    expiry_date?: string; // ISO 8601 format (YYYY-MM-DD)
  };
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
  discharge_date?: string; // ISO 8601 format, set upon discharge
  reasonForVisit: string;
  ward?: string; // e.g., 'Cardiology', 'Maternity', applicable to Inpatients
  bed_id?: string; // e.g., 'C-101', applicable to Inpatients
  attending_doctor_id: string; // Reference to doctor user ID
  attending_doctor_name?: string; // Denormalized for quick display
  /**
   * The status of the admission, which has different values depending on the `type`.
   * For Outpatients: 'Scheduled', 'In Progress', 'Completed', 'Canceled'.
   * For Inpatients: 'Admitted', 'In Treatment', 'Pending Discharge', 'Discharged'.
   */
  status: 'Admitted' | 'In Treatment' | 'Pending Discharge' | 'Discharged' | 'Scheduled' | 'In Progress' | 'Completed' | 'Canceled';
  is_discharged?: boolean; // Legacy field
  referralDetails?: {
    referredBy?: string; // e.g., 'Korle Bu Teaching Hospital'
    referralReason?: string;
  };
  dischargeSummary?: string;
  created_at: string; // ISO 8601 format
  updated_at: string; // ISO 8601 format
}

/**
 * Represents a hospital bed in the 'beds' collection.
 * These documents are updated frequently as patients are admitted, transferred, and discharged.
 */
export interface Bed {
    bed_id: string; // Unique bed identifier, e.g., 'C-101'
    wardName: string;
    room_number: string;
    status: 'occupied' | 'vacant' | 'cleaning' | 'maintenance';
    current_patient_id?: string | null; // Null if vacant or maintenance
    occupied_since?: string | null; // ISO 8601 format, set when occupied
    cleaningNeeded: boolean;
    created_at: string; // ISO 8601 format
    updated_at: string; // ISO 8601 format
}

/**
 * Represents an appointment in the 'appointments' collection.
 * This model links patients and doctors for scheduled events.
 */
export interface Appointment {
  appointment_id: string; // Unique ID, e.g., AP-001
  patient_id: string;
  patient_name: string; // Denormalized for quick display
  doctor_id: string;
  doctor_name: string; // Denormalized for quick display
  appointment_date: string; // ISO 8601 format, start time
  end_time: string; // ISO 8601 format
  duration: number; // in minutes
  type: 'consultation' | 'follow-up' | 'procedure';
  department: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show';
  notes: string;
  created_at: string; // ISO 8601 format
}
