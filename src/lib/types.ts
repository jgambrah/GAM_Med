


export type UserRole = "Admin" | "Doctor" | "Nurse" | "Pharmacist" | "Patient" | "BillingClerk" | "Housekeeping";

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
export type AdmissionStatus = 'Admitted' | 'In Treatment' | 'Pending Discharge' | 'Discharged' | 'Cancelled';


export interface MedicationAtDischarge {
    name: string;
    dosage: string;
    instructions: string;
}

export interface DischargeSummary {
    diagnosisOnDischarge: string;
    treatmentProvided: string;
    conditionAtDischarge: string;
    medicationAtDischarge: MedicationAtDischarge[];
    followUpInstructions: string;
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
  dischargeSummary?: DischargeSummary;
  isSummaryFinalized?: boolean; // Defaults to false
  finalBillId?: string;
  summaryPDF_URL?: string;
  createdAt: Date; 
  updatedAt: Date; 
}


export type BedStatus = "occupied" | "vacant" | "cleaning" | "maintenance";

// Represents a bed in the hospital.
export interface Bed {
    bedId: string; // Document ID (e.g., "WARD-A-ROOM-101-BED-1")
    wardName: string; // e.g., "Cardiology Ward"
    roomNumber: string; // e.g., "101"
    status: BedStatus; // e.g., 'vacant', 'occupied', 'cleaning', 'maintenance'
    currentPatientId?: string; // The ID of the patient currently occupying the bed
    currentAdmissionId?: string; // The ID of the admission associated with the occupancy
    occupiedSince?: Date; 
    cleaningNeeded: boolean; // True if the bed needs cleaning
    isReserved?: boolean; // True if the bed is reserved for an incoming patient
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
  referralId?: string; // Bidirectional link to the referral
}
    
export interface Referral {
  referralId: string;
  patientDetails: {
    fullName: string;
    contactPhone: string;
    reasonForReferral: string;
  };
  referringProvider: {
    name: string;
    contact: string;
  };
  referredToDepartment: string;
  status: 'Pending' | 'Assigned' | 'Completed' | 'Cancelled';
  referralDate: Date;
  assignedToDoctorId?: string; // Reference to User id
  appointmentId?: string; // Reference to Appointment id
  createdAt: Date;
  updatedAt: Date;
}
