
/**
 * Represents a user in the system.
 * The document ID in the 'users' collection should correspond to the Firebase Auth UID.
 */
export interface User {
  uid: string; // Corresponds to Firebase Auth UID
  email: string;
  name: string;
  role: 'admin' | 'doctor' | 'nurse' | 'pharmacist' | 'patient';
  is_active: boolean;
  patient_id?: string; // Link to the patient document, for patient users
  created_at: string; // ISO 8601 format
  last_login: string; // ISO 8601 format
  // Doctor-specific fields
  specialty?: string; // e.g., 'Cardiology', 'Pediatrics'
  department?: string;
  photoURL?: string; // Optional: For profile pictures
}

/**
 * Represents a patient record in the 'patients' collection.
 * This model is designed to be comprehensive and searchable.
 */
export interface Patient {
  patient_id: string; // Unique, system-generated ID (e.g., P-123456)
  full_name: string;
  first_name: string;
  last_name: string;
  dob: string; // ISO 8601 format (YYYY-MM-DD)
  gender: 'Male' | 'Female' | 'Other';
  contact: {
    phone_number: string;
    email?: string;
    address: {
      street: string;
      city: string;
      region: string;
    };
  };
  emergency_contact: {
    name: string;
    relationship: string;
    phone_number: string;
  };
  insurance?: {
    provider_name: string;
    policy_number: string;
    expiry_date: string; // ISO 8601 format (YYYY-MM-DD)
  };
  status: 'active' | 'discharged' | 'deceased';
  created_at: string; // ISO 8601 format
}


/**
 * Represents an admission record in the sub-collection 'admissions' under a patient.
 */
export interface Admission {
  admission_id: string; // e.g., A-001
  admission_date: string; // ISO 8601 format
  ward: string;
  bed_number: string;
  reason_for_admission: string;
  attending_doctor_id: string; // Reference to doctor user ID
  discharge_date: string | null; // Will be filled upon discharge
  created_at: string; // ISO 8601 format
}


/**
 * Represents an appointment in the 'appointments' collection.
 * This model links patients, doctors, and resources.
 */
export interface Appointment {
  appointment_id: string; // Unique, system-generated ID (e.g., AP-001)
  patient_id: string; // Reference to the 'patients' collection
  patient_name: string; // Denormalized for quick access
  doctor_id: string; // Reference to the 'users' collection (a user with 'Doctor' role)
  doctor_name: string; // Denormalized for quick access
  appointment_date: string; // ISO 8601 format, start time
  end_time: string; // ISO 8601 format
  duration: number; // in minutes
  type: 'consultation' | 'follow-up' | 'procedure';
  department: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show';
  notes: string; // Reason for the visit, or pre-appointment notes
  created_at: string; // ISO 8601 format
}
