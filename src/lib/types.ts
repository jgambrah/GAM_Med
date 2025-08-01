export type UserRole = "Admin" | "Doctor" | "Nurse" | "Pharmacist" | "Patient";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string;
}

// Core Patient Demographics as per the new specification
export interface Patient {
  id: string; // Document ID, which will be the patientId
  patientId: string; // Unique patient identifier
  firstName: string;
  lastName: string;
  fullName: string;
  dob: string; // YYYY-MM-DD
  gender: "Male" | "Female" | "Other";
  contact: {
    phone: string; // e.g., +233241234567
    email?: string;
  };
  address: {
    street: string;
    city: string;
    region: string;
  };
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  insurance?: {
    providerName: string;
    policyNumber: string;
    expiryDate: any; // Using 'any' for Firebase Timestamp placeholder
  };
  isAdmitted: boolean;
  currentAdmissionId?: string;
  createdAt: any; // Using 'any' for Firebase Timestamp placeholder
  updatedAt: any; // Using 'any' for Firebase Timestamp placeholder
  // The following fields from the old model are not in the new one:
  // bloodGroup: string;
  // allergies: string[];
}


export type AdmissionStatus = "Admitted" | "Discharged" | "Pending";
export type PatientType = "Inpatient" | "Outpatient";

// Represents a single admission event for a patient.
// This will be a document in a sub-collection under a patient.
export interface Admission {
    id: string; // Firestore document ID
    patientId: string;
    admissionDate: string; // ISO 8601 string
    dischargeDate?: string; // ISO 8601 string
    status: AdmissionStatus;
    patientType: PatientType;
    admittingDoctor: string; // Doctor's User ID
    ward?: string; // e.g., "Maternity", "Pediatrics"
    bedId?: string; // Links to a document in the 'beds' collection
    diagnosis: string;
}

export type BedStatus = "Available" | "Occupied" | "Maintenance";

// Represents a bed in the hospital.
export interface Bed {
    id: string; // Firestore document ID (e.g., "WA-101")
    ward: string; // e.g., "Maternity", "Pediatrics"
    roomNumber: string;
    bedNumber: string;
    status: BedStatus;
    patientId?: string; // The ID of the patient currently occupying the bed
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
  status: "Scheduled" | "Completed" | "Cancelled";
  resource?: string; // e.g., 'Operating Theater 1'
}
