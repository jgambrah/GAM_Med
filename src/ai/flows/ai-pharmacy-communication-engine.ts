import { z } from 'zod';

export const ERxFeedItemSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  patientName: z.string(),
  providerName: z.string(),
  urgency: z.enum(['STAT_EMERGENCY', 'INPATIENT_DISCHARGE', 'OUTPATIENT_OPD']),
  drugSummary: z.string(),
  createdAt: z.string(),
  status: z.enum(['NEW', 'FLAGGED', 'VERIFIED']),
});

export const DoctorInterventionRequestSchema = z.object({
  id: z.string(),
  prescribingDoctorUid: z.string(),
  patientId: z.string(),
  patientName: z.string(),
  flagReason: z.enum(['DOSE_CHECK', 'ALLERGY_CONFLICT', 'DRUG_INTERACTION', 'RENAL_HAZARD', 'STOCK_OUTAGE']),
  pharmacistMessage: z.string(),
  proposedModification: z.string(),
  createdAt: z.string(),
  status: z.enum(['PENDING_DOCTOR_REVIEW', 'ACCEPTED', 'REJECTED']),
});

export const IVCompoundingResultSchema = z.object({
  osmolarityMOsmL: z.number(),
  infusionRateMLHr: z.number(),
  dropsPerMin: z.number(),
  routeRecommendation: z.enum(['PERIPHERAL_IV', 'CENTRAL_LINE_ONLY']),
  stabilityBUDHours: z.number(),
  safetyWarning: z.string().optional(),
});

export type ERxFeedItem = z.infer<typeof ERxFeedItemSchema>;
export type DoctorInterventionRequest = z.infer<typeof DoctorInterventionRequestSchema>;
export type IVCompoundingResult = z.infer<typeof IVCompoundingResultSchema>;

// Returns sample categorized e-Rx feed items
export function getSampleERxFeed(patientName = 'Benjamin Hedidor'): ERxFeedItem[] {
  return [
    {
      id: 'ERX-STAT-01',
      patientId: 'P-100',
      patientName,
      providerName: 'Dr. Kwaku Mensah',
      urgency: 'STAT_EMERGENCY',
      drugSummary: 'IV Labetalol 20mg STAT + MgSO4 4g Loading Dose',
      createdAt: '2 mins ago',
      status: 'NEW'
    },
    {
      id: 'ERX-INPATIENT-02',
      patientId: 'P-100',
      patientName,
      providerName: 'Dr. Ama Serwah',
      urgency: 'INPATIENT_DISCHARGE',
      drugSummary: 'Cefuroxime 500mg PO BID x 7d + Paracetamol 1g TID',
      createdAt: '15 mins ago',
      status: 'NEW'
    },
    {
      id: 'ERX-OUTPATIENT-03',
      patientId: 'P-100',
      patientName,
      providerName: 'Dr. Emmanuel Osei',
      urgency: 'OUTPATIENT_OPD',
      drugSummary: 'Prenatal Vitamins + Ferrous Sulfate 200mg + Folic Acid 5mg',
      createdAt: '45 mins ago',
      status: 'VERIFIED'
    }
  ];
}

// Calculates exact IV Admixture Osmolarity, Infusion Rate, Drip Rate, and Route Safety
export function calculateIVAdmixture(
  volumeMl = 500,
  soluteGrams = 25, // e.g. 5% Dextrose or 0.9% NaCl
  molarMass = 180, // Dextrose = 180 g/mol, NaCl = 58.44 g/mol
  infusionHours = 4,
  dripFactor = 15 // Standard IV tubing drip factor (15 gtt/mL)
): IVCompoundingResult {
  // Osmolarity calculation: mOsm/L = (soluteGrams / molarMass) * 1000 * (1000 / volumeMl)
  const osmolarity = Math.round((soluteGrams / molarMass) * 1000 * (1000 / volumeMl));
  const infusionRateMLHr = Math.round(volumeMl / infusionHours);
  const dropsPerMin = Math.round((volumeMl * dripFactor) / (infusionHours * 60));

  const isHighOsmolarity = osmolarity > 900;
  const routeRecommendation = isHighOsmolarity ? 'CENTRAL_LINE_ONLY' : 'PERIPHERAL_IV';

  let safetyWarning: string | undefined = undefined;
  if (isHighOsmolarity) {
    safetyWarning = `🚨 HIGH OSMOLARITY ALERT (${osmolarity} mOsm/L > 900 mOsm/L): Risk of peripheral phlebitis & venous thrombosis! Must be administered via Central Venous Line (CVL) or PICC Line.`;
  }

  return {
    osmolarityMOsmL: osmolarity,
    infusionRateMLHr,
    dropsPerMin,
    routeRecommendation,
    stabilityBUDHours: 24, // Standard 24-hour BUD for aseptic IV compounding
    safetyWarning
  };
}

// Generates 1-Click Clinical Intervention Modification Request to Doctor's Inbox
export function createDoctorInterventionRequest(
  doctorUid = 'DOC-99',
  patientId = 'P-100',
  patientName = 'Patient',
  flagReason: DoctorInterventionRequest['flagReason'] = 'DOSE_CHECK',
  pharmacistMessage = 'Dosage exceeds standard renal clearance threshold.',
  proposedModification = 'Reduce dose by 50% or switch to alternative formulation.'
): DoctorInterventionRequest {
  return {
    id: `INTERVENTION-${Math.floor(1000 + Math.random() * 9000)}`,
    prescribingDoctorUid: doctorUid,
    patientId,
    patientName,
    flagReason,
    pharmacistMessage,
    proposedModification,
    createdAt: new Date().toLocaleTimeString(),
    status: 'PENDING_DOCTOR_REVIEW'
  };
}
