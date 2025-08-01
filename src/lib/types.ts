export type UserRole = "Admin" | "Doctor" | "Nurse" | "Pharmacist" | "Patient";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string;
}

export type AdmissionStatus = "Inpatient" | "Outpatient" | "Discharged";

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
  admissionStatus: AdmissionStatus;
  bed?: string; // e.g. "Ward A, Bed 101"
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
