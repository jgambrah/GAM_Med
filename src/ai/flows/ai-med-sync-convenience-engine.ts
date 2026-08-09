import { z } from 'zod';

export const MedSyncProfileSchema = z.object({
  syncId: z.string(),
  patientId: z.string(),
  patientName: z.string(),
  targetPickupDayOfMonth: z.number(),
  synchronizedMedsList: z.array(z.string()),
  nextConsolidatedPickupDate: z.string(),
  adherenceScorePercent: z.number(),
  status: z.enum(['SYNCHRONIZED_ACTIVE', 'PENDING_ALIGNMENT']),
});

export const DigitalOrderTrackingSchema = z.object({
  trackingId: z.string(),
  patientPhone: z.string(),
  currentStage: z.enum(['FILLED', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'COMPLETED']),
  estimatedDeliveryTime: z.string(),
  courierName: z.string(),
  statusMessage: z.string(),
  updatedAt: z.string(),
});

export const ConvenienceLabelSchema = z.object({
  rxNumber: z.string(),
  patientName: z.string(),
  drugName: z.string(),
  dosageText: z.string(),
  language: z.enum(['ENGLISH', 'ASANTE_TWI', 'EWE', 'GA']),
  visualIcons: z.array(z.string()),
  qrCodeUrl: z.string(),
});

export type MedSyncProfile = z.infer<typeof MedSyncProfileSchema>;
export type DigitalOrderTracking = z.infer<typeof DigitalOrderTrackingSchema>;
export type ConvenienceLabel = z.infer<typeof ConvenienceLabelSchema>;

// Aligns multiple monthly chronic refill dates to a single consolidated pickup day of month
export function calculateMedSyncAlignment(
  targetDayOfMonth = 15,
  activeRefillList = ['Amlodipine 10mg', 'Metformin 850mg', 'Lisinopril 20mg'],
  patientName = 'Benjamin Hedidor'
): MedSyncProfile {
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, targetDayOfMonth);
  const dateStr = nextMonth.toISOString().split('T')[0];

  return {
    syncId: `SYNC-PATIENT-${Math.floor(1000 + Math.random() * 9000)}`,
    patientId: 'P-100',
    patientName,
    targetPickupDayOfMonth: targetDayOfMonth,
    synchronizedMedsList: activeRefillList,
    nextConsolidatedPickupDate: `${targetDayOfMonth}th of Next Month (${dateStr})`,
    adherenceScorePercent: 98,
    status: 'SYNCHRONIZED_ACTIVE'
  };
}

// Generates multilingual instruction label with time-of-day visual icons
export function generateConvenienceLabel(
  rxNumber = 'RX-9921',
  patientName = 'Benjamin Hedidor',
  drugName = 'Amoxicillin 500mg',
  language: 'ENGLISH' | 'ASANTE_TWI' | 'EWE' | 'GA' = 'ENGLISH'
): ConvenienceLabel {
  let dosageText = '';
  switch (language) {
    case 'ASANTE_TWI':
      dosageText = 'Nom aduru yi fam koro prɛko mmienu da biara wo adidie akyi nna 7.';
      break;
    case 'EWE':
      dosageText = 'No atike sia kpokpo ɖeka zi eve gbesiagbe le nuɖuɖu megbe vɔ wo 7.';
      break;
    case 'GA':
      dosageText = 'Nu tsofa nɛɛ kpoke kome shi nyɔngmɔ feemɔ gbii 7 yɛ niyeli sɛɛ.';
      break;
    case 'ENGLISH':
    default:
      dosageText = 'Take 1 tablet by mouth twice daily with food for 7 days.';
      break;
  }

  return {
    rxNumber,
    patientName,
    drugName,
    dosageText,
    language,
    visualIcons: ['☀️ Morning', '🌙 Night', '🍽️ With Food'],
    qrCodeUrl: `https://gam-med.health/rx/${rxNumber}?lang=${language}`
  };
}

// Updates live digital order tracking progress and generates automated SMS status text
export function updateDigitalOrderTracking(
  trackingId = 'TRACK-8891',
  stage: DigitalOrderTracking['currentStage'] = 'READY_FOR_PICKUP',
  patientPhone = '+233 24 123 4567'
): DigitalOrderTracking {
  let statusMessage = '';
  switch (stage) {
    case 'FILLED':
      statusMessage = 'Your prescription has been filled by GAM Pharmacy and passed 5-Rights quality verification.';
      break;
    case 'READY_FOR_PICKUP':
      statusMessage = 'Your prescription is READY FOR PICKUP at GAM Main Pharmacy Counter. Pickup Code: REFILL-88.';
      break;
    case 'OUT_FOR_DELIVERY':
      statusMessage = 'Your prescription is OUT FOR DELIVERY with Express Local Courier. Est. arrival in 45 mins.';
      break;
    case 'COMPLETED':
      statusMessage = 'Prescription successfully delivered and signed by patient.';
      break;
  }

  return {
    trackingId,
    patientPhone,
    currentStage: stage,
    estimatedDeliveryTime: 'Today at 04:30 PM',
    courierName: 'GAM Express Courier Dispatch',
    statusMessage,
    updatedAt: new Date().toLocaleTimeString()
  };
}
