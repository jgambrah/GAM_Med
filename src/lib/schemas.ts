

import { z } from 'zod';

export const LedgerAccountSchema = z.object({
  accountName: z.string().min(3, { message: "Account name must be at least 3 characters." }),
  accountCode: z.string().min(4, { message: "Account code must be at least 4 characters." }),
  accountType: z.enum(['Asset', 'Liability', 'Equity', 'Revenue', 'Expense']),
  parentAccountId: z.string().optional().nullable(),
});

export const NewLedgerEntrySchema = z.object({
  debitAccountId: z.string().min(1, 'Debit account is required.'),
  creditAccountId: z.string().min(1, 'Credit account is required.'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than zero.'),
  description: z.string().min(3, 'Description is required.'),
}).refine(data => data.debitAccountId !== data.creditAccountId, {
    message: 'Debit and Credit accounts cannot be the same.',
    path: ['creditAccountId'],
});


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
  patientType: z.string().min(1, { message: "A patient type must be selected." }),
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

/**
 * Zod schema for validating the new referral form.
 */
export const ReferralSchema = z.object({
  referringProvider: z.string().min(2, { message: "Referring provider is required." }),
  patientName: z.string().min(2, { message: "Patient name is required." }),
  patientPhone: z.string().min(10, { message: "A valid phone number is required." }),
  patientDob: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "A valid date of birth is required." }),
  reasonForReferral: z.string().min(10, { message: "Reason for referral is required." }),
  priority: z.enum(['Routine', 'Urgent', 'Emergency']),
  assignedDepartment: z.string().min(2, { message: "A department must be assigned." }),
  notes: z.string().optional(),
});

/**
 * Zod schema for validating a new prescription form.
 */
export const NewPrescriptionSchema = z.object({
  medicationName: z.string().min(2, { message: "Medication name is required." }),
  dosage: z.string().min(1, { message: "Dosage is required." }),
  frequency: z.string().min(2, { message: "Frequency is required." }),
  route: z.string().min(2, { message: "Route is required." }),
  quantity: z.coerce.number().min(1, { message: "Quantity must be at least 1." }),
  instructions: z.string().optional(),
});

/**
 * Zod schema for validating a new diagnosis form.
 */
export const NewDiagnosisSchema = z.object({
  diagnosisText: z.string().min(3, { message: "Diagnosis is required." }),
  icd10Code: z.string().min(1, { message: "ICD-10 code is required." }),
  isPrimary: z.boolean().default(false),
});

/**
 * Zod schema for validating a new lab order form.
 */
export const NewLabOrderSchema = z.object({
  testName: z.string().min(3, { message: "Test name is required." }),
  notes: z.string().optional(),
});

/**
 * Zod schema for fulfilling a lab request.
 */
export const FulfillLabRequestSchema = z.object({
    result: z.string().min(5, { message: 'Result must be at least 5 characters.' }),
    attachment: z.any().optional(),
});

/**
 * Zod schema for validating the vitals logging form.
 */
export const VitalsSchema = z.object({
    bloodPressure: z.string().regex(/^\d{2,3}\/\d{2,3}$/, { message: "Must be in format like 120/80" }),
    heartRate: z.string().min(1, "Required"),
    temperature: z.string().min(1, "Required"),
    respiratoryRate: z.string().min(1, "Required"),
    oxygenSaturation: z.string().min(1, "Required"),
    notes: z.string().optional(),
});

/**
 * Zod schema for validating the care plan update form.
 */
export const CarePlanSchema = z.object({
    goals: z.string().min(10, { message: "Goals must be at least 10 characters." }),
    interventions: z.string().min(10, { message: "Interventions must be at least 10 characters." }),
    status: z.enum(['Active', 'On Hold', 'Completed', 'Cancelled']),
});

/**
 * Zod schema for logging a new immunization.
 */
export const LogImmunizationSchema = z.object({
  vaccineId: z.string().min(1, { message: 'You must select a vaccine.' }),
  doseNumber: z.coerce.number().min(1, { message: 'Dose number must be at least 1.' }),
  administeredAt: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'A valid administration date is required.' }),
  notes: z.string().optional(),
});

/**
 * Zod schema for validating a new appointment form.
 */
export const NewAppointmentSchema = z.object({
  patientId: z.string().min(1, { message: "A patient must be selected." }),
  department: z.string().min(1, { message: "A department must be selected." }),
  doctorId: z.string().optional(),
  appointmentDate: z.string().refine((val) => val, { message: "Date is required." }),
  appointmentTime: z.string().refine((val) => val, { message: "Time is required." }),
  type: z.enum(['consultation', 'follow-up', 'procedure']),
  resourceId: z.string().optional(),
});

/**
 * Zod schema for validating the new waiting list entry form.
 */
export const NewWaitingListSchema = z.object({
  patientId: z.string().min(1, { message: "A patient must be selected." }),
  requestedService: z.string().min(3, { message: "A service must be selected." }),
  priority: z.enum(['Routine', 'Urgent', 'Elective']),
  notes: z.string().optional(),
});

/**
 * Zod schema for a single line item in an invoice.
 */
const InvoiceItemSchema = z.object({
  billingCode: z.string().min(1, { message: "A service must be selected." }),
  quantity: z.coerce.number().min(1, { message: "Quantity must be at least 1." }),
  unitPrice: z.coerce.number().min(0, { message: "Price cannot be negative." }),
});

/**
 * Zod schema for generating a new invoice.
 */
export const NewInvoiceSchema = z.object({
  items: z.array(InvoiceItemSchema).min(1, { message: "At least one item is required." }),
});

/**
 * Zod schema for validating the payment form.
 */
export const PaymentSchema = z.object({
  amount: z.coerce.number().min(0.01, { message: 'Amount must be greater than 0.' }),
  paymentMethod: z.enum(['Mobile Money', 'Credit Card']),
  mobileMoneyDetails: z.object({
    provider: z.string(),
    phone: z.string(),
  }).optional(),
  cardDetails: z.object({
    number: z.string(),
    expiry: z.string(),
    cvc: z.string(),
  }).optional(),
}).superRefine((data, ctx) => {
  if (data.paymentMethod === 'Mobile Money') {
    if (!data.mobileMoneyDetails?.phone || data.mobileMoneyDetails.phone.length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A valid phone number is required.",
        path: ['mobileMoneyDetails', 'phone'],
      });
    }
  }
  if (data.paymentMethod === 'Credit Card') {
    if (!data.cardDetails?.number || data.cardDetails.number.length < 16) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A valid card number is required.",
        path: ['cardDetails', 'number'],
      });
    }
    if (!data.cardDetails?.expiry || !/^(0[1-9]|1[0-2])\/\d{2}$/.test(data.cardDetails.expiry)) {
       ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Expiry must be in MM/YY format.",
        path: ['cardDetails', 'expiry'],
      });
    }
     if (!data.cardDetails?.cvc || data.cardDetails.cvc.length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A valid CVC is required.",
        path: ['cardDetails', 'cvc'],
      });
    }
  }
});

/**
 * Zod schema for validating the receptionist's manual payment logging form.
 */
export const LogPaymentSchema = z.object({
  invoiceId: z.string().min(1, { message: "An invoice must be selected." }),
  amount: z.coerce.number().min(0.01, { message: "Amount must be greater than zero." }),
  paymentMethod: z.enum(['Cash', 'Credit Card', 'Mobile Money']),
});
