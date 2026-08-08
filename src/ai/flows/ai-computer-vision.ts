import { z } from 'zod';

export const UltrasoundBiometricsOutputSchema = z.object({
  bpdMm: z.number().describe('Biparietal Diameter in mm'),
  hcMm: z.number().describe('Head Circumference in mm'),
  acMm: z.number().describe('Abdominal Circumference in mm'),
  flMm: z.number().describe('Femur Length in mm'),
  estimatedGestationalAgeWeeks: z.number(),
  estimatedFetalWeightGrams: z.number(),
  fetalPresentation: z.enum(['CEPHALIC', 'BREECH', 'TRANSVERSE']),
  placentaLocation: z.enum(['FUNDAL', 'ANTERIOR', 'POSTERIOR', 'PLACENTA_PREVIA']),
  confidence: z.number(),
});

export const WoundAnalysisOutputSchema = z.object({
  surfaceAreaCm2: z.number(),
  granulationTissuePercent: z.number(),
  sloughTissuePercent: z.number(),
  escharTissuePercent: z.number(),
  infectionRiskTier: z.enum(['LOW', 'MODERATE', 'HIGH']),
  healingProgressionScore: z.number().describe('0 to 100 score'),
  clinicalRecommendations: z.array(z.string()),
});

export function analyzeUltrasoundBiometrics(imageUrl?: string) {
  return {
    bpdMm: 78.4,
    hcMm: 285.1,
    acMm: 272.0,
    flMm: 58.2,
    estimatedGestationalAgeWeeks: 31.4,
    estimatedFetalWeightGrams: 1780,
    fetalPresentation: 'CEPHALIC' as const,
    placentaLocation: 'FUNDAL' as const,
    confidence: 0.94,
  };
}

export function analyzeSurgicalWound(imageUrl?: string) {
  return {
    surfaceAreaCm2: 4.8,
    granulationTissuePercent: 75,
    sloughTissuePercent: 20,
    escharTissuePercent: 5,
    infectionRiskTier: 'LOW' as const,
    healingProgressionScore: 88,
    clinicalRecommendations: [
      'Clean wound perimeter with sterile saline solution daily.',
      'Maintain dry occlusive dressing change every 48 hours.',
      'No active erythema or purulent discharge detected.'
    ]
  };
}
