
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
  patientId: string; // Unique, system-generated ID (e.g., GM-PT-000001)
  ghanaCardId?: string; // National ID, for verification
  primaryContact: {
    phone: string;
    email?: string;
  };
  personalDetails: {
    firstName: string;
    lastName: string;
    otherNames?: string;
    dateOfBirth: string; // ISO 8601 format (YYYY-MM-DD)
    gender: 'Male' | 'Female' | 'Other';
  };
  address: {
    street: string;
    city: string;
    region: string;
  };
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  insuranceDetails?: {
    provider: string; // e.g., 'NHIS', 'Private'
    policyNumber: string;
  };
  createdAt: string; // ISO 8601 format
  updatedAt: string; // ISO 8601 format
}

/**
 * Represents an appointment in the 'appointments' collection.
 * This model links patients, doctors, and resources.
 */
export interface Appointment {
  appointmentId: string; // Unique, system-generated ID
  patientId: string; // Reference to the 'patients' collection
  doctorId: string; // Reference to the 'users' collection (a user with 'Doctor' role)
  department: string;
  appointmentDateTime: string; // ISO 8601 format
  reason: string; // Reason for the visit
  status: 'Scheduled' | 'Completed' | 'Canceled' | 'No-show';
  resourceId?: string; // Optional: for booking specific rooms or equipment
  notes?: string; // Doctor's notes post-appointment
  createdAt: string; // ISO 8601 format
  updatedAt: string; // ISO 8601 format
}
