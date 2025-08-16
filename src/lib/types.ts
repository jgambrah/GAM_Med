

/**
 * @fileoverview This file defines the core data structures (TypeScript types) for the GamMed ERP system.
 * Each type corresponds to a data model for a Firestore collection, serving as the single source of truth for the application's data architecture.
 * This ensures consistency between the frontend components and the backend database.
 */

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
  triggeredAt: string; // ISO Timestamp when the alert was created.
  isAcknowledged: boolean;
  acknowledgedByUserId?: string; // UID of the user who acknowledged the alert.
}


/**
 * Represents a user in the 'users' collection.
 * The document ID should correspond to the Firebase Auth UID.
 */
export interface User {
  uid: string; // Corresponds to Firebase Auth UID
  email: string;
  name: string;
  role: 'admin' | 'doctor' | 'nurse' | 'pharmacist' | 'patient' | 'billing_clerk' | 'triage_officer' | 'lab_technician';
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
 *   - alerts/{alertId}
 *   - allergies/{allergyId}
 *   - clinical_notes/{noteId} (also serves as progress_notes)
 *   - lab_results/{resultId}
 *   - vitals/{vitalId}
 *   - admissions/{admissionId}
 *   - care_plans/{planId}
 *   - medication_administration_logs/{logId}
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
  allergies?: string[]; // Simple list of allergens for quick checks
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
// == E-Prescribing & Pharmacy Data Models
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
 * Represents a digital prescription in the top-level 'prescriptions' collection.
 * This serves as the single source of truth for pharmacy orders.
 */
export interface Prescription {
  prescriptionId: string; // Document ID
  patientId: string; // Reference to 'patients' collection
  prescribedByDoctorId: string; // Reference to 'users' collection
  medicationId: string; // Reference to 'medications' collection
  medicationName: string; // Denormalized for quick lookups
  dosage: string; // e.g., '10mg'
  form: 'Tablet' | 'Syrup' | 'Injection';
  frequency: string; // e.g., 'Twice daily', 'QID'
  duration: string; // e.g., '7 days', 'Until finished'
  quantity: number; // e.g., 14, 200
  route: 'Oral' | 'IV' | 'IM' | 'Topical';
  instructions: string; // Patient-friendly notes
  warnings: string[]; // e.g., ['Drug-drug interaction detected', 'Allergy warning']
  status: 'Pending Pharmacy' | 'Dispensed' | 'Canceled';
  prescribedAt: string; // ISO Timestamp
  filledAt?: string; // ISO Timestamp, updated by Pharmacy
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
    painLevel?: string; // 1-10 scale
    notes?: string;
    recordedByUserId: string; // Reference to users.uid
    recordedAt: string; // ISO 8601 Timestamp
}

/**
 * Represents a patient's care plan in the `care_plans` sub-collection.
 * This is a central document for coordinating nursing care.
 * Path: /patients/{patientId}/care_plans/{planId}
 */
export interface CarePlan {
    planId: string; // Document ID
    patientId: string;
    title: string;
    goal: string;
    interventions: string[];
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
  dosage: string; // Denormalized for easy display
  administeredByUserId: string; // Nurse's user ID
  administeredAt: string; // ISO Timestamp when the medication was given
  notes?: string; // Optional notes, e.g., "Patient refused", "Took with water"
}
