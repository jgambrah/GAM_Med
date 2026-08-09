import { z } from 'zod';

export const GrowthPointSchema = z.object({
  timeAxis: z.number(), // Gestational week (16-40) or Child age in months (0-60)
  label: z.string(),
  p10: z.number(),
  p50: z.number(),
  p90: z.number(),
  patientValue: z.number().optional(),
});

export const BiomarkerTrendPointSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  dateFormatted: z.string(),
  value: z.number(),
  unit: z.string(),
  refMin: z.number(),
  refMax: z.number(),
  status: z.enum(['NORMAL', 'LOW', 'HIGH', 'CRITICAL']),
  note: z.string().optional(),
});

export type GrowthPoint = z.infer<typeof GrowthPointSchema>;
export type BiomarkerTrendPoint = z.infer<typeof BiomarkerTrendPointSchema>;

// Returns WHO/ACOG 10th, 50th, and 90th percentile reference curves
export function getWHOACOGPercentileCurves(metric: 'FUNDAL_HEIGHT' | 'ESTIMATED_FETAL_WEIGHT' | 'CHILD_WEIGHT'): GrowthPoint[] {
  if (metric === 'FUNDAL_HEIGHT') {
    // Fundal Height (cm) vs Gestational Weeks (16w to 40w)
    return [
      { timeAxis: 16, label: '16 Weeks', p10: 14, p50: 16, p90: 18 },
      { timeAxis: 20, label: '20 Weeks', p10: 18, p50: 20, p90: 22 },
      { timeAxis: 24, label: '24 Weeks', p10: 22, p50: 24, p90: 26 },
      { timeAxis: 28, label: '28 Weeks', p10: 26, p50: 28, p90: 30 },
      { timeAxis: 32, label: '32 Weeks', p10: 30, p50: 32, p90: 34 },
      { timeAxis: 36, label: '36 Weeks', p10: 34, p50: 36, p90: 38 },
      { timeAxis: 40, label: '40 Weeks', p10: 37, p50: 39, p90: 41 },
    ];
  }

  if (metric === 'ESTIMATED_FETAL_WEIGHT') {
    // EFW (grams) vs Gestational Weeks (20w to 40w)
    return [
      { timeAxis: 20, label: '20 Weeks', p10: 270, p50: 330, p90: 390 },
      { timeAxis: 24, label: '24 Weeks', p10: 520, p50: 600, p90: 710 },
      { timeAxis: 28, label: '28 Weeks', p10: 890, p50: 1000, p90: 1190 },
      { timeAxis: 32, label: '32 Weeks', p10: 1440, p50: 1700, p90: 1980 },
      { timeAxis: 36, label: '36 Weeks', p10: 2200, p50: 2600, p90: 3000 },
      { timeAxis: 40, label: '40 Weeks', p10: 2900, p50: 3400, p90: 3950 },
    ];
  }

  // Child Weight (kg) vs Age Months (0 to 24 months) - WHO Growth Standard
  return [
    { timeAxis: 0, label: 'Birth', p10: 2.5, p50: 3.3, p90: 4.2 },
    { timeAxis: 3, label: '3 Months', p10: 5.0, p50: 6.4, p90: 8.0 },
    { timeAxis: 6, label: '6 Months', p10: 6.4, p50: 7.9, p90: 9.8 },
    { timeAxis: 9, label: '9 Months', p10: 7.4, p50: 8.9, p90: 11.0 },
    { timeAxis: 12, label: '12 Months', p10: 8.1, p50: 9.6, p90: 11.8 },
    { timeAxis: 18, label: '18 Months', p10: 9.2, p50: 10.9, p90: 13.3 },
    { timeAxis: 24, label: '24 Months', p10: 10.2, p50: 12.2, p90: 14.8 },
  ];
}

// Evaluate clinical risk based on curve position
export function evaluateGrowthRisk(value: number, weekOrMonth: number, metric: 'FUNDAL_HEIGHT' | 'ESTIMATED_FETAL_WEIGHT' | 'CHILD_WEIGHT'): { riskLevel: 'NORMAL' | 'IUGR_RISK' | 'MACROSOMIA_RISK'; message: string } {
  const curves = getWHOACOGPercentileCurves(metric);
  const point = curves.find(c => c.timeAxis === weekOrMonth) || curves[curves.length - 1];

  if (value < point.p10) {
    return {
      riskLevel: 'IUGR_RISK',
      message: `🚨 INTRAUTERINE GROWTH RESTRICTION (IUGR) RISK: Measured value (${value}) is BELOW the 10th percentile curve (${point.p10}) for ${point.label}. Recommend Doppler Ultrasound.`
    };
  }

  if (value > point.p90) {
    return {
      riskLevel: 'MACROSOMIA_RISK',
      message: `⚠️ FETAL MACROSOMIA / LARGE FOR GESTATIONAL AGE (LGA): Measured value (${value}) is ABOVE the 90th percentile curve (${point.p90}) for ${point.label}. Screen for Gestational Diabetes.`
    };
  }

  return {
    riskLevel: 'NORMAL',
    message: `✅ Normal Growth Trajectory: Measured value (${value}) tracks between 10th and 90th percentile WHO/ACOG bounds.`
  };
}

// Returns sample longitudinal lab & vital biomarker trajectories
export function getSampleBiomarkerTrends(metric: 'HEMOGLOBIN' | 'HBA1C' | 'PLATELETS' | 'BLOOD_PRESSURE'): BiomarkerTrendPoint[] {
  if (metric === 'HEMOGLOBIN') {
    // Hb (g/dL) across pregnancy trimesters
    return [
      { id: 'HB-1', timestamp: '2026-02-10', dateFormatted: '1st Trimester (10w)', value: 12.4, unit: 'g/dL', refMin: 11.0, refMax: 14.5, status: 'NORMAL', note: 'Baseline ANC booking Hb' },
      { id: 'HB-2', timestamp: '2026-05-15', dateFormatted: '2nd Trimester (22w)', value: 10.6, unit: 'g/dL', refMin: 11.0, refMax: 14.5, status: 'LOW', note: 'Mild physiological hemodilution / Anemia' },
      { id: 'HB-3', timestamp: '2026-08-01', dateFormatted: '3rd Trimester (34w)', value: 11.8, unit: 'g/dL', refMin: 11.0, refMax: 14.5, status: 'NORMAL', note: 'Post Iron & Folic Acid supplementation' },
    ];
  }

  if (metric === 'HBA1C') {
    // HbA1c (%) history
    return [
      { id: 'A1C-1', timestamp: '2025-11-01', dateFormatted: 'Nov 2025', value: 7.8, unit: '%', refMin: 4.0, refMax: 6.4, status: 'HIGH', note: 'Uncontrolled Glycemia' },
      { id: 'A1C-2', timestamp: '2026-02-15', dateFormatted: 'Feb 2026', value: 6.9, unit: '%', refMin: 4.0, refMax: 6.4, status: 'HIGH', note: 'Improving post Metformin' },
      { id: 'A1C-3', timestamp: '2026-06-10', dateFormatted: 'Jun 2026', value: 6.1, unit: '%', refMin: 4.0, refMax: 6.4, status: 'NORMAL', note: 'Target glycemic control achieved' },
    ];
  }

  if (metric === 'PLATELETS') {
    // Platelets (x10^9/L) for HELLP screening
    return [
      { id: 'PLT-1', timestamp: '2026-06-01', dateFormatted: '28 Weeks', value: 210, unit: 'x10^9/L', refMin: 150, refMax: 400, status: 'NORMAL', note: 'Normal platelet count' },
      { id: 'PLT-2', timestamp: '2026-07-20', dateFormatted: '34 Weeks', value: 135, unit: 'x10^9/L', refMin: 150, refMax: 400, status: 'LOW', note: 'Mild Thrombocytopenia (Preeclampsia watch)' },
      { id: 'PLT-3', timestamp: '2026-08-05', dateFormatted: '36 Weeks', value: 165, unit: 'x10^9/L', refMin: 150, refMax: 400, status: 'NORMAL', note: 'Stable post management' },
    ];
  }

  // Blood Pressure Systolic (mmHg)
  return [
    { id: 'BP-1', timestamp: '2026-04-10', dateFormatted: '16 Weeks', value: 118, unit: 'mmHg', refMin: 90, refMax: 130, status: 'NORMAL', note: 'Normotensive' },
    { id: 'BP-2', timestamp: '2026-06-25', dateFormatted: '26 Weeks', value: 138, unit: 'mmHg', refMin: 90, refMax: 130, status: 'HIGH', note: 'Pre-hypertension trend' },
    { id: 'BP-3', timestamp: '2026-08-08', dateFormatted: '34 Weeks', value: 154, unit: 'mmHg', refMin: 90, refMax: 130, status: 'CRITICAL', note: 'Severe Systolic BP elevation (Preeclampsia)' },
  ];
}
