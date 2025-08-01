


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
  title?: string; // e.g., 'Mr', 'Mrs', 'Dr'
  firstName: string;
  lastName: string;
  fullName: string; // For easy searching
  otherNames?: string;
  ghanaCardId?: string; // For linking with national ID systems
  dob: any; // Using 'any' for Firebase Timestamp placeholder
  gender: "Male" | "Female" | "Other";
  maritalStatus?: "Single" | "Married" | "Divorced" | "Widowed";
  occupation?: string;
  contact: {
    primaryPhone: string; // e.g., +233241234567
    alternatePhone?: string;
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
    expiryDate: any; // Using 'any' for Firebase Timestamp placeholder
  };
  medicalHistory?: {
    allergies: string[];
    preExistingConditions: string[];
    pastSurgeries: { name: string; date: any }[];
  };
  isAdmitted: boolean;
  currentAdmissionId?: string;
  lastVisitDate?: any;
  status: 'active' | 'inactive' | 'deceased';
  createdAt: any; // Using 'any' for Firebase Timestamp placeholder
  updatedAt: any; // Using 'any' for Firebase Timestamp placeholder
}

export type AdmissionType = "Inpatient" | "Outpatient" | "Emergency";
export type AdmissionStatus = 'Admitted' | 'In Treatment' | 'Discharged';

// Represents a single admission event for a patient.
export interface Admission {
  admissionId: string;
  patientId: string;
  type: AdmissionType;
  admissionDate: any; // Using 'any' for Firebase Timestamp placeholder
  dischargeDate?: any; // Using 'any' for Firebase Timestamp placeholder
  reasonForVisit: string;
  ward?: string;
  bedId?: string; // reference to beds collection
  attendingDoctorId: string; // reference to users collection
  status: AdmissionStatus;
  referralDetails?: {
    referredBy: string; // e.g., 'Korle Bu Teaching Hospital'
    referralReason: string;
  };
  dischargeSummary?: string;
  createdAt: any; // Using 'any' for Firebase Timestamp placeholder
  updatedAt: any; // Using 'any' for Firebase Timestamp placeholder
}


export type BedStatus = "occupied" | "vacant" | "cleaning" | "maintenance";

// Represents a bed in the hospital.
export interface Bed {
    bedId: string; // Document ID (e.g., "C-101")
    wardName: string; // e.g., "Cardiology", "Pediatrics"
    roomNumber: string;
    status: BedStatus;
    currentPatientId?: string; // The ID of the patient currently occupying the bed
    occupiedSince?: any; // Using 'any' for Firebase Timestamp placeholder
    cleaningNeeded: boolean;
    createdAt: any; // Using 'any' for Firebase Timestamp placeholder
    updatedAt: any; // Using 'any' for Firebase Timestamp placeholder
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
