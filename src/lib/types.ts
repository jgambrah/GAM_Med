export type UserRole = "Admin" | "Doctor" | "Nurse" | "Pharmacist" | "Patient";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string;
}

// Core Patient Demographics
export interface Patient {
  id: string; // Firestore document ID
  patientId: string; // Custom, human-readable Patient ID
  name: string;
  dateOfBirth: string;
  gender: "Male" | "Female" | "Other";
  contact: {
    phone: string;
    email?: string;
  };
  address: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  bloodGroup: string;
  allergies: string[];
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
