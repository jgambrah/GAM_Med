
import { z } from 'zod';

export const PatientSchema = z.object({
  hospitalId: z.string().min(1, "Hospital ID is required"),
  title: z.string().optional(),
  firstName: z.string().min(2, { message: "First name must be at least 2 characters." }),
  lastName: z.string().min(2, { message: "Last name must be at least 2 characters." }),
  dob: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "A valid date of birth is required." }),
  gender: z.enum(['Male', 'Female', 'Other']),
  patientType: z.enum(['private', 'corporate', 'public']),
  contact: z.object({
    primaryPhone: z.string().min(10),
    alternatePhone: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    address: z.object({
      street: z.string().min(1),
      city: z.string().min(1),
      region: z.string().min(1),
    }),
  }),
  emergencyContact: z.object({
    name: z.string().min(2),
    relationship: z.string().min(2),
    phone: z.string().min(10),
  }),
  insurance: z.object({
    providerName: z.string().optional(),
    policyNumber: z.string().optional(),
    expiryDate: z.string().optional(),
  }).optional(),
  consent: z.boolean().refine(val => val === true, {
    message: "Consent is required.",
  }),
});

export const NewAppointmentSchema = z.object({
  hospitalId: z.string().min(1),
  patientId: z.string().min(1),
  department: z.string().min(1),
  doctorId: z.string().optional(),
  appointmentDate: z.string(),
  appointmentTime: z.string(),
  type: z.enum(['consultation', 'follow-up', 'procedure']),
  isVirtual: z.boolean().default(false),
  resourceId: z.string().optional(),
});

export const BedAllocationSchema = z.object({
    hospitalId: z.string().min(1),
    patientId: z.string().min(1),
    bedId: z.string().min(1),
    attendingDoctorId: z.string().min(1),
    reasonForAdmission: z.string().min(5),
});

export const NewPrescriptionSchema = z.object({
  hospitalId: z.string().min(1),
  medicationName: z.string().min(2),
  dosage: z.string().min(1),
  frequency: z.string().min(2),
  route: z.string().min(2),
  quantity: z.coerce.number().min(1),
  instructions: z.string().optional(),
});

export const NewDiagnosisSchema = z.object({
  hospitalId: z.string().min(1),
  diagnosisText: z.string().min(3),
  icd10Code: z.string().min(1),
  isPrimary: z.boolean().default(false),
});

export const NewLabOrderSchema = z.object({
  hospitalId: z.string().min(1),
  testName: z.string().min(3),
  notes: z.string().optional(),
});

export const NewRadOrderSchema = z.object({
  hospitalId: z.string().min(1),
  studyIds: z.array(z.string()).min(1),
  notes: z.string().optional(),
});

export const LogImmunizationSchema = z.object({
  hospitalId: z.string().min(1),
  vaccineId: z.string().min(1),
  doseNumber: z.coerce.number().min(1),
  administeredAt: z.string(),
  notes: z.string().optional(),
});

export const LeaveRequestSchema = z.object({
  hospitalId: z.string().min(1),
  leaveType: z.enum(['Annual Leave', 'Sick Leave', 'Specialist Leave', 'On-Call Duty']),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().min(10),
  attachment: z.any().optional(),
});

export const NewLedgerEntrySchema = z.object({
  hospitalId: z.string().min(1),
  debitAccountId: z.string().min(1),
  creditAccountId: z.string().min(1),
  amount: z.coerce.number().min(0.01),
  description: z.string().min(3),
  paymentMethod: z.enum(['Cheque', 'Bank Transfer']),
  chequeNumber: z.string().optional(),
});

export const NewStaffClaimSchema = z.object({
  hospitalId: z.string().min(1),
  amount: z.coerce.number().min(0.01),
  description: z.string().min(10),
  expenseAccountId: z.string().min(1),
  attachment: z.any().optional(),
});

export const NewAssetSchema = z.object({
  hospitalId: z.string().min(1),
  name: z.string().min(3),
  type: z.enum(['Medical Equipment', 'IT Equipment', 'Furniture', 'Building Component', 'Room']),
  department: z.string().min(1),
  location: z.string().min(1),
  status: z.enum(['Operational', 'Under Maintenance', 'Needs Repair', 'Decommissioned']),
  modelNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  purchaseDate: z.string().optional(),
  purchaseCost: z.coerce.number().optional(),
  warrantyEndDate: z.string().optional(),
});

export const UpdateInventorySchema = z.object({
  hospitalId: z.string().min(1),
  itemId: z.string().min(1),
  quantityChange: z.number(),
  type: z.enum(['Dispense', 'Restock', 'Waste', 'Adjustment']),
  userId: z.string(),
  reason: z.string(),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(),
});

export const NewSupplierSchema = z.object({
    hospitalId: z.string().min(1),
    name: z.string().min(3),
    contactPerson: z.string().min(3),
    contactEmail: z.string().email(),
    contactPhone: z.string().min(10),
    address: z.string().min(5),
    paymentTerms: z.enum(['Net 30', 'Net 60', 'Cash on Delivery']),
});

export const NewInvoiceSchema = z.object({
  hospitalId: z.string().min(1),
  vatOption: z.enum(['zero', 'flat', 'standard']),
  items: z.array(z.object({
    billingCode: z.string(),
    description: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
  })),
});

export const LogPaymentSchema = z.object({
  hospitalId: z.string().min(1),
  invoiceId: z.string(),
  amount: z.number(),
  paymentMethod: z.enum(['Cash', 'Credit Card', 'Mobile Money']),
});

export const LedgerAccountSchema = z.object({
  hospitalId: z.string().min(1),
  accountName: z.string(),
  accountCode: z.string(),
  accountType: z.enum(['Asset', 'Liability', 'Equity', 'Revenue', 'Expense']),
  parentAccountId: z.string().nullable(),
});

export const RadiologyReportSchema = z.object({
  hospitalId: z.string().min(1),
  impression: z.string().min(10),
  findings: z.string().min(10),
});

export const FulfillLabRequestSchema = z.object({
    hospitalId: z.string().min(1),
    result: z.string().min(5),
    attachment: z.any().optional(),
});

export const ValidateLabResultSchema = z.object({
  hospitalId: z.string().min(1),
  validationNotes: z.string().optional(),
});

export const VitalsSchema = z.object({
    hospitalId: z.string().min(1),
    bloodPressure: z.string().regex(/^\d{2,3}\/\d{2,3}$/),
    heartRate: z.string().min(1),
    temperature: z.string().min(1),
    respiratoryRate: z.string().min(1),
    oxygenSaturation: z.string().min(1),
    painScore: z.string().optional(),
    notes: z.string().optional(),
});

export const CarePlanSchema = z.object({
    hospitalId: z.string().min(1),
    goals: z.string().min(10),
    interventions: z.string().min(10),
    status: z.enum(['Active', 'On Hold', 'Completed', 'Cancelled']),
});

export const NewWaitingListSchema = z.object({
  hospitalId: z.string().min(1),
  patientId: z.string().min(1),
  requestedService: z.string().min(3),
  priority: z.enum(['Routine', 'Urgent', 'Elective']),
  notes: z.string().optional(),
});

export const PaymentSchema = z.object({
  hospitalId: z.string().min(1),
  amount: z.number(),
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
});

export const ControlledSubstanceTransactionSchema = z.object({
    hospitalId: z.string().min(1),
    transactionType: z.enum(['Dispense', 'Restock', 'Waste', 'Adjustment']),
    quantity: z.number(),
    reason: z.string().min(5),
    patientId: z.string().optional(),
    witnessId: z.string().optional(),
});

export const NewGoalSchema = z.object({
  hospitalId: z.string().min(1),
  description: z.string().min(10),
  targetDate: z.string(),
});

export const LogTrainingSchema = z.object({
  hospitalId: z.string().min(1),
  courseId: z.string().min(1),
  completionDate: z.string(),
});

export const QualificationSchema = z.object({
    hospitalId: z.string().min(1),
    degree: z.string(),
    institution: z.string(),
    graduationYear: z.number(),
});

export const CertificationSchema = z.object({
    hospitalId: z.string().min(1),
    name: z.string(),
    issuingBody: z.string(),
    issueDate: z.string(),
    expiryDate: z.string().optional(),
});

export const LicenseSchema = z.object({
    hospitalId: z.string().min(1),
    type: z.string(),
    licenseNumber: z.string(),
    expiryDate: z.string(),
});

export const ReferralSchema = z.object({
  hospitalId: z.string().min(1),
  referringProvider: z.string().min(3),
  patientName: z.string().min(3),
  patientDob: z.string(),
  patientPhone: z.string().min(10),
  reasonForReferral: z.string().min(10),
  priority: z.enum(['Routine', 'Urgent', 'Emergency']),
  assignedDepartment: z.string().min(1),
  notes: z.string().optional(),
});
