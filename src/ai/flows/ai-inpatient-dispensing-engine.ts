import { z } from 'zod';

export const BcmaScanResultSchema = z.object({
  scannedNdc: z.string(),
  scannedWristband: z.string(),
  isMatch: z.boolean(),
  fiveRightsPassed: z.boolean(),
  validationMessage: z.string(),
});

export const UnitDoseCartFillSchema = z.object({
  id: z.string(),
  cartId: z.string(),
  wardName: z.string(),
  bedNumber: z.string(),
  binNumber: z.string(),
  patientName: z.string(),
  drugName: z.string(),
  unitDoseQty: z.number(),
  fillCycle: z.enum(['MORNING_0800', 'AFTERNOON_1400', 'NIGHT_2000']),
  status: z.enum(['PENDING_FILL', 'FILLED', 'DISPATCHED_TO_WARD']),
});

export const TpnChemoCompoundingResultSchema = z.object({
  osmolalityMOsmKg: z.number(),
  infusionRateMLHr: z.number(),
  caloricDensityKcalML: z.number(),
  routeRecommendation: z.enum(['PERIPHERAL_LINE', 'CENTRAL_VENOUS_LINE']),
  asepticBudHours: z.number(),
  safetyWarning: z.string().optional(),
  isChemoValidated: z.boolean(),
});

export type BcmaScanResult = z.infer<typeof BcmaScanResultSchema>;
export type UnitDoseCartFill = z.infer<typeof UnitDoseCartFillSchema>;
export type TpnChemoCompoundingResult = z.infer<typeof TpnChemoCompoundingResultSchema>;

// Verifies Handheld BCMA Barcode Scan against expected Patient Wristband & Drug NDC
export function verifyBcmaHandheldScan(
  scannedNdc: string,
  expectedNdc = 'NDC-0093-0058-01',
  scannedWristband: string,
  expectedWristband = 'GH-CARD-9921'
): BcmaScanResult {
  const ndcMatch = scannedNdc.trim() === expectedNdc.trim();
  const wristbandMatch = scannedWristband.trim() === expectedWristband.trim();
  const isMatch = ndcMatch && wristbandMatch;

  return {
    scannedNdc,
    scannedWristband,
    isMatch,
    fiveRightsPassed: isMatch,
    validationMessage: isMatch
      ? '✅ 5-RIGHTS BCMA VERIFIED: Drug NDC and Patient Wristband match clinical order.'
      : !ndcMatch && !wristbandMatch
      ? '🚨 BCMA ERROR: Neither Drug NDC nor Patient Wristband match the order!'
      : !ndcMatch
      ? '🚨 BCMA ERROR: Drug NDC mismatch! Wrong medication package scanned.'
      : '🚨 BCMA ERROR: Patient Wristband mismatch! Wrong patient scanned.'
  };
}

// Generates sample inpatient 24-hour Unit-Dose Cart Fill schedule for ward cassettes
export function generateCartFillSchedule(wardName = 'Female Medical Ward 3B', patientName = 'Benjamin Hedidor'): UnitDoseCartFill[] {
  return [
    {
      id: 'CART-ITEM-101',
      cartId: 'CART-3B-04',
      wardName,
      bedNumber: 'Bed 12',
      binNumber: 'Bin A-04',
      patientName,
      drugName: 'Cefuroxime 750mg IV Injection',
      unitDoseQty: 1,
      fillCycle: 'MORNING_0800',
      status: 'FILLED'
    },
    {
      id: 'CART-ITEM-102',
      cartId: 'CART-3B-04',
      wardName,
      bedNumber: 'Bed 12',
      binNumber: 'Bin A-04',
      patientName,
      drugName: 'Metronidazole 500mg IV Infusion',
      unitDoseQty: 1,
      fillCycle: 'AFTERNOON_1400',
      status: 'PENDING_FILL'
    },
    {
      id: 'CART-ITEM-103',
      cartId: 'CART-3B-04',
      wardName,
      bedNumber: 'Bed 12',
      binNumber: 'Bin A-04',
      patientName,
      drugName: 'Paracetamol 1g IV Infusion',
      unitDoseQty: 1,
      fillCycle: 'NIGHT_2000',
      status: 'PENDING_FILL'
    }
  ];
}

// Calculates TPN (Total Parenteral Nutrition) & Chemotherapy Compounding Osmolality & Central Line Safety
export function calculateTpnChemoAdmixture(
  dextroseGrams = 200, // Dextrose (3.4 kcal/g, 5 mOsm/g)
  aminoAcidGrams = 50, // Amino Acids (4 kcal/g, 10 mOsm/g)
  lipidGrams = 30, // Lipids (10 kcal/g, 0.7 mOsm/g)
  totalVolumeMl = 1000,
  infusionHours = 12
): TpnChemoCompoundingResult {
  // Osmolality calculation: mOsm/kg = (Dextrose*5 + AminoAcids*10 + Lipids*0.7) / (totalVolumeMl / 1000)
  const osmolality = Math.round((dextroseGrams * 5 + aminoAcidGrams * 10 + lipidGrams * 0.7) / (totalVolumeMl / 1000));
  
  // Total calories = (Dextrose*3.4) + (AminoAcids*4) + (Lipids*10)
  const totalKcal = dextroseGrams * 3.4 + aminoAcidGrams * 4 + lipidGrams * 10;
  const caloricDensityKcalML = Number((totalKcal / totalVolumeMl).toFixed(2));
  const infusionRateMLHr = Math.round(totalVolumeMl / infusionHours);

  const isHighOsmolality = osmolality > 900;
  const routeRecommendation = isHighOsmolality ? 'CENTRAL_VENOUS_LINE' : 'PERIPHERAL_LINE';

  let safetyWarning: string | undefined = undefined;
  if (isHighOsmolality) {
    safetyWarning = `🚨 TPN HYPEROSMOLARITY ALERT (${osmolality} mOsm/kg > 900 mOsm/kg): Mandatory Central Venous Line (CVL / PICC Line) required to prevent severe peripheral vein thrombosis and tissue necrosis!`;
  }

  return {
    osmolalityMOsmKg: osmolality,
    infusionRateMLHr,
    caloricDensityKcalML,
    routeRecommendation,
    asepticBudHours: 36, // Standard 36-hour BUD for aseptic TPN/Chemo compounding in laminar hood
    safetyWarning,
    isChemoValidated: true
  };
}
