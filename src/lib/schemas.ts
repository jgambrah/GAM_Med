import { z } from 'zod';

/**
 * Zod schema for validating the patient registration form.
 * Ensures data integrity on the client-side before sending to the server.
 */
export const PatientSchema = z.object({
  title: z.string().optional(),
  firstName: z.string().min(2, { message: "First name must be at least 2 characters." }),
  lastName: z.string().min(2, { message: "Last name must be at least 2 characters." }),
  otherNames: z.string().optional(),
  ghanaCardId: z.string().optional(),
  dob: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "A valid date of birth is required." }),
  gender: z.enum(['Male', 'Female', 'Other'], { required_error: "Gender must be selected." }),
  maritalStatus: z.enum(['Single', 'Married', 'Divorced', 'Widowed']).optional(),
  occupation: z.string().optional(),
  contact: z.object({
    primaryPhone: z.string().min(10, { message: "A valid phone number is required." }),
    alternatePhone: z.string().optional(),
    email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
    address: z.object({
      street: z.string().min(1, { message: "Street is required." }),
      city: z.string().min(1, { message: "City is required." }),
      region: z.string().min(1, { message: "Region is required." }),
    }),
  }),
  emergencyContact: z.object({
    name: z.string().min(2, { message: "Emergency contact name is required." }),
    relationship: z.string().min(2, { message: "Relationship is required." }),
    phone: z.string().min(10, { message: "Emergency contact phone is required." }),
  }),
  insurance: z.object({
    providerName: z.string().optional(),
    policyNumber: z.string().optional(),
    expiryDate: z.string().optional(),
  }).optional(),
});

/**
 * Zod schema for validating the bed allocation form.
 * Used when admitting a patient from the bed management dashboard.
 */
export const BedAllocationSchema = z.object({
    patientId: z.string().min(1, { message: "A patient must be selected."}),
    bedId: z.string().min(1, { message: "A bed must be selected."}),
    attendingDoctorId: z.string().min(1, { message: "A doctor must be selected."}),
    reasonForAdmission: z.string().min(5, { message: "Reason must be at least 5 characters."}),
});
