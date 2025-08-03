


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
export type InpatientStatus = 'Admitted' | 'In Treatment' | 'Pending Discharge' | 'Discharged';
// Outpatient status reflects a single visit or appointment.
export type OutpatientStatus = 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
// AdmissionStatus is a union of all possible statuses.
export type AdmissionStatus = InpatientStatus | OutpatientStatus;


export interface MedicationAtDischarge {
    name: string;
    dosage: string;
    instructions: string;
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
  dischargeSummary?: {
    diagnosisOnDischarge: string;
    treatmentProvided: string; // rich text/markdown
    conditionAtDischarge: string;
    medicationAtDischarge: MedicationAtDischarge[];
    followUpInstructions: string; // rich text/markdown
  };
  isSummaryFinalized?: boolean; // Defaults to false
  finalBillId?: string;
  summaryPDF_URL?: string;
  createdAt: Date; 
  updatedAt: Date; 
}


export type BedStatus = "occupied" | "vacant" | "cleaning" | "maintenance";

// Represents a bed in the hospital.
export interface Bed {
    bedId: string; // Document ID (e.g., "C-101")
    wardName: string; // e.g., "Cardiology", "Pediatrics"
    roomNumber: string;
    status: BedStatus;
    currentPatientId?: string; // The ID of the patient currently occupying the bed
    occupiedSince?: Date; 
    cleaningNeeded: boolean;
    createdAt: Date; 
    updatedAt: Date; 
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
  status: "Scheduled" | "Completed" | "Cancelled" | "In Progress";
  resource?: string; // e.g., 'Operating Theater 1'
}
