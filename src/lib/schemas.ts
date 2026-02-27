import { z } from 'zod';

export const PatientSchema = z.object({
  hospitalId: z.string().min(1),
  title: z.string().min(1, "Title is required"),
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  otherNames: z.string().optional(),
  dob: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["Male", "Female", "Other"]),
  maritalStatus: z.enum(["Single", "Married", "Divorced", "Widowed", "Separated"]),
  occupation: z.string().optional(),
  religion: z.string().optional(),
  ghanaCardId: z.string().optional(),
  patientType: z.enum(["private", "corporate", "public"]),
  contact: z.object({
    primaryPhone: z.string().min(10, "Phone number must be at least 10 digits"),
    alternatePhone: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    address: z.string().min(5, "Residential address is required"),
    city: z.string().min(1, "City/Town is required"),
    region: z.string().min(1, "Region is required"),
  }),
  nextOfKin: z.object({
    name: z.string().min(2, "Next of Kin name is required"),
    relationship: z.string().min(1, "Relationship is required"),
    phone: z.string().min(10, "Phone number must be at least 10 digits"),
  }),
  clinical: z.object({
    bloodGroup: z.string().optional(),
    genotype: z.string().optional(),
    allergies: z.string().optional(),
  }).optional(),
  consent: z.boolean().refine(val => val === true, {
    message: "Consent is required.",
  }),
  isTemporary: z.boolean().optional(),
});

export const NewBedSchema = z.object({
  hospitalId: z.string().min(1),
  wardId: z.string().min(1, "Ward ID is required"),
  bedNumber: z.string().min(1, "Bed Label is required"),
  type: z.enum(['Electric', 'Manual']),
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
  reason: z.string().optional(),
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
  indication: z.string().min(3, "Clinical indication is required"),
  priority: z.enum(['Routine', 'Urgent']),
  notes: z.string().optional(),
});

export const NewRadOrderSchema = z.object({
  hospitalId: z.string().min(1),
  modality: z.string().min(1),
  indication: z.string().min(3, "Clinical indication is required"),
  priority: z.enum(['Routine', 'Urgent']),
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

export const NewEquipmentSchema = z.object({
  hospitalId: z.string().min(1),
  name: z.string().min(3, "Equipment name is required"),
  serialNumber: z.string().min(3, "Serial number is required"),
  category: z.string().min(1, "Category is required"),
  status: z.enum(['Available', 'In Use', 'Maintenance', 'Faulty']),
  wardId: z.string().optional(),
  lastMaintenance: z.string().optional(),
  nextMaintenance: z.string().optional(),
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
    quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
    reason: z.string().min(5, "A descriptive reason is required for legal audit"),
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

export const CertifyDeathSchema = z.object({
  hospitalId: z.string().min(1),
  cause: z.string().min(5, "Primary cause of death is required"),
  code: z.string().min(1, "ICD-10 code is required"),
  remarks: z.string().optional(),
});

export const DietaryOrderSchema = z.object({
  hospitalId: z.string().min(1),
  dietType: z.enum(['Standard', 'Diabetic', 'Low Salt', 'Renal', 'NPO', 'Soft']),
  specialInstructions: z.string().optional(),
});

export const NewFacilityBookingSchema = z.object({
  hospitalId: z.string().min(1),
  facilityId: z.string().min(1, "Please select a facility"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  purpose: z.string().min(3, "Purpose is required"),
});
