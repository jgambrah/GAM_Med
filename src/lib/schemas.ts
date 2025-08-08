import { z } from 'zod';

export const PatientSchema = z.object({
  firstName: z.string().min(2, { message: "First name must be at least 2 characters." }),
  lastName: z.string().min(2, { message: "Last name must be at least 2 characters." }),
  dob: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date of birth." }),
  gender: z.enum(['Male', 'Female', 'Other']),
  contact: z.object({
    phone: z.string().min(10, { message: "Phone number is required." }),
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
});
