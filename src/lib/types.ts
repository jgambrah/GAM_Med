
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
  role: 'admin' | 'doctor' | 'pharmacist' | 'patient' | 'billing_clerk' | 'triage_officer' | 'lab_technician';
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
 *
 * The patient's full Electronic Health Record (EHR) is built using a series of sub-collections
 * nested under this main patient document. This strategy keeps the top-level patient document
 * lean and fast to load, while allowing for scalable, organized storage of potentially vast amounts
 * of clinical data. Each sub-collection represents a different domain of the patient's record.
 *
 * Example EHR Sub-collection structure:
 * /patients/{patientId}/
 *   - clinical_notes/{noteId}
 *   - prescriptions/{prescriptionId}
 *   - lab_results/{resultId}
 *   - imaging_reports/{reportId}
 *   - vitals/{vitalId}
 *   - admissions/{admissionId}
 *
 * This structure enables granular security rules, allowing different clinical roles to access
 * only the specific parts of the EHR they are authorized to see (e.g., a pharmacist can access
 * prescriptions, but not necessarily clinical notes).
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
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show';
  notes: string;
  created_at: string; // ISO 8601 format
  updated_at: string; // ISO 8601 format
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


// =========================================================================
// == EHR Sub-Collection Data Models
// =========================================================================

/**
 * Represents a clinical note in the `clinical_notes` sub-collection.
 * Path: /patients/{patientId}/clinical_notes/{noteId}
 */
export interface ClinicalNote {
  noteId: string; // Document ID
  noteText: string; // Can be Markdown or plain text
  noteType: 'Progress Note' | 'Consultation' | 'Nursing Note';
  recordedByUserId: string; // Reference to users.uid
  recordedAt: string; // ISO 8601 Timestamp
}

/**
 * Represents a set of vital signs in the `vitals` sub-collection.
 * Path: /patients/{patientId}/vitals/{vitalId}
 */
export interface VitalSign {
  vitalId: string; // Document ID
  patientId?: string; // Denormalized for nurse worklist
  temperature: number; // in Celsius
  bloodPressure: string; // e.g., '120/80'
  heartRate: number; // beats per minute
  respiratoryRate: number; // breaths per minute
  oxygenSaturation: number; // SpO2 percentage
  painLevel?: number; // Optional pain level from 1-10
  notes?: string; // Optional notes from the nurse
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
 * Path: /patients/{patientId}/medication_history/{prescriptionId}
 */
export interface MedicationRecord {
  prescriptionId: string; // Document ID
  medicationName: string; // e.g., 'Amlodipine'
  dosage: string; // e.g., '5mg'
  frequency: string; // e.g., 'Once daily'
  instructions: string; // e.g., 'Take with food'
  prescribedByDoctorId: string; // Reference to users.uid
  prescribedAt: string; // ISO 8601 Timestamp
  status: 'Active' | 'Discontinued' | 'Filled'; // Link to Pharmacy module
}

/**
 * Represents a lab result in the `lab_results` sub-collection.
 * Path: /patients/{patientId}/lab_results/{resultId}
 */
export interface LabResult {
  testId: string; // Document ID
  patientId: string; // Denormalized for querying lab work queue
  patientName: string; // Denormalized for display in work queue
  testName: string; // e.g., 'Full Blood Count'
  status: 'Ordered' | 'Sample Collected' | 'In Progress' | 'Completed' | 'Cancelled';
  result: Record<string, any> | string; // Can be a complex object or simple text
  resultPdfUrl?: string; // Optional URL to a PDF in Firebase Storage
  units?: string; // e.g., 'mmol/L'
  referenceRange?: string; // e.g., '3.5 - 5.5'
  orderedByDoctorId: string; // Reference to users.uid
  labTechnicianId?: string; // Reference to users.uid
  orderedAt: string; // ISO 8601 Timestamp
  completedAt?: string; // ISO 8601 Timestamp
}

/**
 * Represents a care plan for a patient, stored in the `care_plans` sub-collection.
 * Path: /patients/{patientId}/care_plans/{carePlanId}
 */
export interface CarePlan {
  carePlanId: string; // Document ID
  description: string;
  goal: string;
  interventions: string[];
  status: 'Active' | 'Completed' | 'Cancelled';
  updatedByUserId: string; // Nurse or Doctor who last updated the plan
  updatedAt: string; // ISO 8601 Timestamp
}

/**
 * Represents a log entry for medication administration, stored in the `medication_administration_logs` sub-collection.
 * Path: /patients/{patientId}/medication_administration_logs/{logId}
 */
export interface MedicationAdministrationLog {
  logId: string; // Document ID
  prescriptionId: string; // Reference to the medication record in `medication_history`
  medicationName: string; // Denormalized for easy display
  dosage: string; // Denormalized dose for confirmation
  administeredByUserId: string; // The nurse who gave the medication
  administeredAt: string; // ISO 8601 Timestamp
  notes?: string; // e.g., 'Patient refused', 'Administered with food'
}
