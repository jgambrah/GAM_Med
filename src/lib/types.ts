export type UserRole = "Admin" | "Doctor" | "Nurse" | "Pharmacist" | "Patient";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string;
}

export interface Patient {
  id: string; // Unique Patient ID
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
