export type UserRole = "Admin" | "Doctor" | "Nurse" | "Pharmacist" | "Patient" | "BillingClerk";

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
  firstName: string;
  lastName:string;
  fullName: string; // For easy searching
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
}

export type AdmissionType = "Inpatient" | "Outpatient" | "Emergency";

// Represents a single admission event for a patient.
// This will be a document in a sub-collection under a patient.
export interface Admission {
  admissionId: string;
  patientId: string;
  type: AdmissionType;
  admissionDate: any; // Using 'any' for Firebase Timestamp placeholder
  dischargeDate?: any; // Using 'any' for Firebase Timestamp placeholder
  reasonForAdmission: string;
  ward?: string;
  bedId?: string;
  attendingDoctorId: string;
  isDischarged: boolean;
  dischargeSummary?: string;
  followUpInstructions?: string;
  finalBillId?: string;
  createdAt: any; // Using 'any' for Firebase Timestamp placeholder
}


export type BedStatus = "occupied" | "vacant" | "maintenance";

// Represents a bed in the hospital.
export interface Bed {
    bedId: string; // Document ID (e.g., "C-101")
    ward: string; // e.g., "Cardiology", "Pediatrics"
    roomNumber: string;
    status: BedStatus;
    isReserved?: boolean;
    currentPatientId?: string; // The ID of the patient currently occupying the bed
    occupiedSince?: any; // Using 'any' for Firebase Timestamp placeholder
    lastCleaned?: any; // Using 'any' for Firebase Timestamp placeholder
    createdAt: any; // Using 'any' for Firebase Timestamp placeholder
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
