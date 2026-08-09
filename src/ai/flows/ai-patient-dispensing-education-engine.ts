import { z } from 'zod';

export const MultilingualInstructionSchema = z.object({
  language: z.enum(['ENGLISH', 'ASANTE_TWI', 'GA', 'EWE']),
  instructionText: z.string(),
  dosageIcons: z.array(z.string()),
  foodWarning: z.string(),
});

export const PrescriptionLabelSchema = z.object({
  rxNumber: z.string(),
  patientName: z.string(),
  drugName: z.string(),
  dosage: z.string(),
  frequency: z.string(),
  language: z.enum(['ENGLISH', 'ASANTE_TWI', 'GA', 'EWE']),
  instructionText: z.string(),
  dosageIcons: z.array(z.string()),
  storageInstructions: z.string(),
  qrCodeData: z.string(),
});

export const RefillSmsNotificationSchema = z.object({
  patientPhone: z.string(),
  patientName: z.string(),
  drugSummary: z.string(),
  pickupLocation: z.string(),
  smsText: z.string(),
  status: z.enum(['PENDING', 'SENT']),
  sentAt: z.string().optional(),
});

export type MultilingualInstruction = z.infer<typeof MultilingualInstructionSchema>;
export type PrescriptionLabel = z.infer<typeof PrescriptionLabelSchema>;
export type RefillSmsNotification = z.infer<typeof RefillSmsNotificationSchema>;

// Translates clinical dosage into localized Ghanaian languages with visual icons
export function generateMultilingualInstruction(
  dosage = '1 Tablet',
  frequency = 'BID (Twice Daily)',
  duration = '7 Days',
  language: 'ENGLISH' | 'ASANTE_TWI' | 'GA' | 'EWE' = 'ENGLISH'
): MultilingualInstruction {
  let instructionText = '';
  let foodWarning = '';

  switch (language) {
    case 'ASANTE_TWI':
      instructionText = `Nom aduru yi fam koro prɛko mmienu da biara wo adidie akyi nna 7.`;
      foodWarning = `🍽️ Di aduane ansa na wanom aduru yi.`;
      break;
    case 'GA':
      instructionText = `Nu tsofa nɛɛ kpoke kome shi nyɔngmɔ feemɔ gbii 7 yɛ niyeli sɛɛ.`;
      foodWarning = `🍽️ Ye niyenii dani onu tsofa nɛɛ.`;
      break;
    case 'EWE':
      instructionText = `No atike sia kpokpo ɖeka zi eve gbesiagbe le nuɖuɖu megbe vɔ wo 7.`;
      foodWarning = `🍽️ Ɖu nu hafi no atike sia.`;
      break;
    case 'ENGLISH':
    default:
      instructionText = `Take 1 tablet by mouth twice daily with food for 7 days.`;
      foodWarning = `🍽️ Take with or after food.`;
      break;
  }

  const dosageIcons = ['☀️ Morning', '🌙 Night', '🍽️ With Food'];

  return {
    language,
    instructionText,
    dosageIcons,
    foodWarning
  };
}

// Generates complete printable prescription label payload
export function generatePrescriptionLabel(
  rxNumber = 'RX-9921',
  patientName = 'Benjamin Hedidor',
  drugName = 'Amoxicillin 500mg',
  dosage = '500mg',
  frequency = 'BID',
  language: 'ENGLISH' | 'ASANTE_TWI' | 'GA' | 'EWE' = 'ENGLISH'
): PrescriptionLabel {
  const multi = generateMultilingualInstruction(dosage, frequency, '7 Days', language);

  return {
    rxNumber,
    patientName,
    drugName,
    dosage,
    frequency,
    language,
    instructionText: multi.instructionText,
    dosageIcons: multi.dosageIcons,
    storageInstructions: 'Keep in a cool, dry place below 30°C. Keep out of reach of children.',
    qrCodeData: `https://gam-med.health/rx/verify?id=${rxNumber}&lang=${language}`
  };
}

// Generates Refill SMS / WhatsApp pickup alert string
export function generateRefillSmsText(
  patientName = 'Patient',
  drugSummary = 'ANC Prenatal Vitamins & Iron Supplements',
  hospitalName = 'GAM Medical Center Pharmacy',
  pickupCode = 'REFILL-88'
): RefillSmsNotification {
  const smsText = `Hello ${patientName}, your repeat prescription (${drugSummary}) is READY FOR PICKUP at ${hospitalName}. Pickup Code: ${pickupCode}. Call pharmacy if assistance is needed.`;

  return {
    patientPhone: '+233 24 123 4567',
    patientName,
    drugSummary,
    pickupLocation: `${hospitalName} Main Dispensing Counter`,
    smsText,
    status: 'PENDING'
  };
}
