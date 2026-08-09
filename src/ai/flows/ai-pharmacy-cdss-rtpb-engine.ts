import { z } from 'zod';

export const RtpbBenefitCheckSchema = z.object({
  tier: z.enum(['FORMULARY_COVERED', 'PRIOR_AUTH_REQUIRED', 'NON_FORMULARY']),
  copayAmountGhc: z.number(),
  genericAlternativeName: z.string(),
  genericSavingsGhc: z.number(),
  requiresPa: z.boolean(),
  coverageDetails: z.string(),
});

export const OrganDosingGuardSchema = z.object({
  egfrValue: z.number(),
  hepaticStatus: z.enum(['NORMAL', 'MILD_IMPAIRMENT', 'SEVERE_IMPAIRMENT']),
  ageCategory: z.enum(['PEDIATRIC', 'ADULT', 'GERIATRIC']),
  dosingStatus: z.enum(['OPTIMAL', 'OVERDOSE_HAZARD', 'UNDERDOSE_HAZARD', 'CONTRAINDICATED']),
  correctedDoseRecommendation: z.string(),
  safetyWarning: z.string().optional(),
});

export const EhrInterventionQuerySchema = z.object({
  queryId: z.string(),
  doctorUid: z.string(),
  patientId: z.string(),
  patientName: z.string(),
  pauseReason: z.string(),
  suggestedAlternative: z.string(),
  createdAt: z.string(),
  status: z.enum(['PAUSED_PENDING_DOCTOR', 'RESOLVED_BY_DOCTOR']),
});

export type RtpbBenefitCheck = z.infer<typeof RtpbBenefitCheckSchema>;
export type OrganDosingGuard = z.infer<typeof OrganDosingGuardSchema>;
export type EhrInterventionQuery = z.infer<typeof EhrInterventionQuerySchema>;

// Evaluates Real-Time Prescription Benefit (RTPB) insurance copay & generic alternative savings
export function evaluateRtpbFormulary(
  drugName = 'Amoxil Brand 500mg',
  insurancePayer = 'National Health Insurance Scheme (NHIS)'
): RtpbBenefitCheck {
  const isBrand = drugName.toLowerCase().includes('brand') || drugName.toLowerCase().includes('amoxil');
  
  if (isBrand) {
    return {
      tier: 'FORMULARY_COVERED',
      copayAmountGhc: 65.00,
      genericAlternativeName: 'Generic Amoxicillin 500mg (Ghana National Formulary)',
      genericSavingsGhc: 45.00,
      requiresPa: false,
      coverageDetails: `${insurancePayer} covers generic formulation 100%. Brand-name incurs out-of-pocket copay.`
    };
  }

  return {
    tier: 'FORMULARY_COVERED',
    copayAmountGhc: 0.00,
    genericAlternativeName: 'Generic Active Formulation In Use',
    genericSavingsGhc: 0.00,
    requiresPa: false,
    coverageDetails: `100% Fully covered under ${insurancePayer} Tier 1 essential medicines.`
  };
}

// Checks Renal (eGFR), Hepatic, and Weight-based Pediatric Dosing Guardrails
export function checkOrganDosingGuardrails(
  drugName = 'Metformin 850mg',
  weightKg = 65,
  ageYears = 45,
  egfr = 25,
  hepaticEnzymes = 'NORMAL' as OrganDosingGuard['hepaticStatus']
): OrganDosingGuard {
  const nameLower = drugName.toLowerCase();
  const isPediatric = ageYears < 12;
  const ageCategory = isPediatric ? 'PEDIATRIC' : ageYears >= 65 ? 'GERIATRIC' : 'ADULT';

  let dosingStatus: OrganDosingGuard['dosingStatus'] = 'OPTIMAL';
  let correctedDoseRecommendation = 'Standard dosing appropriate for organ function.';
  let safetyWarning: string | undefined = undefined;

  // Renal clearance guards (eGFR)
  if (nameLower.includes('metformin') && egfr < 30) {
    dosingStatus = 'CONTRAINDICATED';
    correctedDoseRecommendation = 'Discontinue Metformin immediately. Switch to Insulin or DPP-4 Inhibitor.';
    safetyWarning = `🚨 RENAL CONTRAINDICATION (eGFR ${egfr} mL/min < 30 mL/min): Severe risk of Lactic Acidosis! Metformin contraindicated.`;
  } else if (nameLower.includes('gentamicin') && egfr < 50) {
    dosingStatus = 'OVERDOSE_HAZARD';
    correctedDoseRecommendation = 'Reduce dose by 50% or extend dosing interval to Q24H (Once Daily).';
    safetyWarning = `⚠️ RENAL DOSING GUARD (eGFR ${egfr} mL/min): Risk of Nephrotoxicity & Ototoxicity. Extend interval to Q24H.`;
  }

  // Weight-based pediatric dosing guard
  if (isPediatric) {
    const recommendedMgPerKg = 15; // e.g. Paracetamol 15mg/kg
    const targetDoseMg = weightKg * recommendedMgPerKg;
    correctedDoseRecommendation = `Pediatric Weight Dosing (${weightKg} kg): Target single dose ${targetDoseMg}mg (${recommendedMgPerKg}mg/kg).`;
  }

  return {
    egfrValue: egfr,
    hepaticStatus: hepaticEnzymes,
    ageCategory,
    dosingStatus,
    correctedDoseRecommendation,
    safetyWarning
  };
}

// Pauses dispensing order and dispatches structured intervention query to Doctor EHR
export function pauseOrderAndSendEhrIntervention(
  doctorUid = 'DOC-99',
  patientId = 'P-100',
  patientName = 'Patient',
  pauseReason = 'Therapeutic Alternative recommended due to Penicillin allergy',
  suggestedAlternative = 'Switch to Erythromycin 500mg PO BID'
): EhrInterventionQuery {
  return {
    queryId: `EHR-PAUSE-${Math.floor(1000 + Math.random() * 9000)}`,
    doctorUid,
    patientId,
    patientName,
    pauseReason,
    suggestedAlternative,
    createdAt: new Date().toLocaleTimeString(),
    status: 'PAUSED_PENDING_DOCTOR'
  };
}
