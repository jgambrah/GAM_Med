import { z } from 'zod';

export const BedsideTelemetryPayloadSchema = z.object({
  bedId: z.string(),
  patientId: z.string(),
  heartRate: z.number(),
  spo2: z.number(),
  systolicBp: z.number(),
  diastolicBp: z.number(),
  respirationRate: z.number(),
  temperature: z.number(),
  timestamp: z.string(),
  waveformBuffer: z.array(z.number()).optional(),
});

export const WearableCGMPayloadSchema = z.object({
  deviceId: z.string(),
  patientId: z.string(),
  glucoseMmol: z.number(),
  glucoseTrend: z.enum(['RISING_FAST', 'RISING', 'STABLE', 'FALLING', 'FALLING_FAST']),
  maternalPulse: z.number(),
  ambulatorySystolicBp: z.number().optional(),
  ambulatoryDiastolicBp: z.number().optional(),
  lastSyncTime: z.string(),
});

export type BedsideTelemetryPayload = z.infer<typeof BedsideTelemetryPayloadSchema>;
export type WearableCGMPayload = z.infer<typeof WearableCGMPayloadSchema>;

export interface TelemetryAlert {
  severity: 'NORMAL' | 'WARNING' | 'CRITICAL';
  news2Score: number;
  meowsScore: number;
  title: string;
  warningMessage: string;
  recommendedAction: string;
}

export interface CGMRpmAlert {
  status: 'IN_TARGET_RANGE' | 'NOCTURNAL_HYPO' | 'POSTPRANDIAL_SPIKE' | 'MATERNAL_HYPERTENSION';
  glucoseMmol: number;
  trend: string;
  title: string;
  clinicalGuidance: string;
}

export function evaluateBedsideTelemetry(telemetry: BedsideTelemetryPayload): TelemetryAlert {
  let news2 = 0;
  let meows = 0;
  const warnings: string[] = [];

  // 1. SpO2 check
  if (telemetry.spo2 < 92) {
    news2 += 3;
    meows += 2;
    warnings.push(`Hypoxemia detected (SpO2 ${telemetry.spo2}% < 92%)`);
  } else if (telemetry.spo2 < 95) {
    news2 += 1;
  }

  // 2. Systolic BP check
  if (telemetry.systolicBp >= 160) {
    news2 += 3;
    meows += 3;
    warnings.push(`Severe Hypertensive Crisis (BP ${telemetry.systolicBp}/${telemetry.diastolicBp} mmHg)`);
  } else if (telemetry.systolicBp <= 90) {
    news2 += 3;
    meows += 3;
    warnings.push(`Hypotensive Decompensation (Systolic BP ${telemetry.systolicBp} mmHg)`);
  }

  // 3. Heart Rate check
  if (telemetry.heartRate >= 130) {
    news2 += 3;
    meows += 2;
    warnings.push(`Severe Tachycardia (HR ${telemetry.heartRate} bpm)`);
  } else if (telemetry.heartRate <= 40) {
    news2 += 3;
    meows += 3;
    warnings.push(`Severe Bradycardia (HR ${telemetry.heartRate} bpm)`);
  }

  // 4. Respiration Rate check
  if (telemetry.respirationRate >= 25 || telemetry.respirationRate <= 8) {
    news2 += 3;
    meows += 2;
    warnings.push(`Abnormal Respiration (${telemetry.respirationRate} bpm)`);
  }

  let severity: 'NORMAL' | 'WARNING' | 'CRITICAL' = 'NORMAL';
  if (news2 >= 5 || meows >= 3 || telemetry.spo2 < 90 || telemetry.systolicBp >= 160) {
    severity = 'CRITICAL';
  } else if (news2 >= 2 || meows >= 1) {
    severity = 'WARNING';
  }

  return {
    severity,
    news2Score: news2,
    meowsScore: meows,
    title: severity === 'CRITICAL' 
      ? '🚨 CRITICAL TELEMETRY ALARM: Immediate RRT / Code Response Required'
      : severity === 'WARNING'
      ? '⚠️ ELEVATED EARLY WARNING SCORE (NEWS2 / MEOWS)'
      : '✅ TELEMETRY STABLE: Inpatient Telemetry Stream Normal',
    warningMessage: warnings.length > 0 
      ? warnings.join(' • ') 
      : 'All continuous bedside parameters are within target physiological range.',
    recommendedAction: severity === 'CRITICAL'
      ? 'Initiate immediate bedside assessment. Notify ICU Registrar & Code Team. Check airway, high-flow O2, and IV line access.'
      : severity === 'WARNING'
      ? 'Increase vitals telemetry sampling frequency to q15m. Inform ward charge nurse.'
      : 'Continue continuous 24/7 telemetry monitoring and flowsheet auto-logging.'
  };
}

export function evaluateWearableCGMPayload(payload: WearableCGMPayload): CGMRpmAlert {
  if (payload.glucoseMmol < 3.9) {
    return {
      status: 'NOCTURNAL_HYPO',
      glucoseMmol: payload.glucoseMmol,
      trend: payload.glucoseTrend,
      title: '🚨 CRITICAL MATERNAL HYPOGLYCEMIA ALERT',
      clinicalGuidance: `Maternal glucose dropped to ${payload.glucoseMmol} mmol/L (Hypoglycemia < 3.9 mmol/L). Instruct patient to consume 15g fast-acting oral carbohydrates (glucose tablets or fruit juice) and re-check in 15 mins.`
    };
  }

  if (payload.glucoseMmol > 10.0 || (payload.glucoseMmol > 7.8 && payload.glucoseTrend.includes('RISING'))) {
    return {
      status: 'POSTPRANDIAL_SPIKE',
      glucoseMmol: payload.glucoseMmol,
      trend: payload.glucoseTrend,
      title: '⚠️ GESTATIONAL GLYCEMIC SPIKE FLAG',
      clinicalGuidance: `Maternal glucose elevated to ${payload.glucoseMmol} mmol/L (Postprandial target < 7.8 mmol/L). Review GDM diet compliance and log postprandial insulin dose.`
    };
  }

  if (payload.ambulatorySystolicBp && payload.ambulatorySystolicBp >= 140) {
    return {
      status: 'MATERNAL_HYPERTENSION',
      glucoseMmol: payload.glucoseMmol,
      trend: payload.glucoseTrend,
      title: '🚨 AMBULATORY MATERNAL HYPERTENSION ALERT',
      clinicalGuidance: `Smartwatch blood pressure cuff synced ${payload.ambulatorySystolicBp}/${payload.ambulatoryDiastolicBp} mmHg. High pre-eclampsia risk. Recommend urgent ANC triage assessment.`
    };
  }

  return {
    status: 'IN_TARGET_RANGE',
    glucoseMmol: payload.glucoseMmol,
    trend: payload.glucoseTrend,
    title: '✅ RPM STABLE: CGM Glucose & Wearable Vitals in Target Zone',
    clinicalGuidance: `Maternal continuous glucose (${payload.glucoseMmol} mmol/L) and smartwatch pulse (${payload.maternalPulse} bpm) are optimal.`
  };
}

export function generateSimulatedTelemetryFeed(): BedsideTelemetryPayload {
  return {
    bedId: 'BED-ICU-04',
    patientId: 'P-98421',
    heartRate: Math.floor(72 + (Math.random() * 20 - 10)),
    spo2: Math.min(100, Math.floor(97 + (Math.random() * 4 - 2))),
    systolicBp: Math.floor(122 + (Math.random() * 16 - 8)),
    diastolicBp: Math.floor(78 + (Math.random() * 10 - 5)),
    respirationRate: Math.floor(16 + (Math.random() * 4 - 2)),
    temperature: Number((36.8 + (Math.random() * 0.4 - 0.2)).toFixed(1)),
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  };
}

export function generateSimulatedWearablePayload(): WearableCGMPayload {
  const trends: WearableCGMPayload['glucoseTrend'][] = ['STABLE', 'RISING', 'FALLING', 'STABLE'];
  return {
    deviceId: 'DEXCOM-G7-8841',
    patientId: 'P-98421',
    glucoseMmol: Number((6.2 + (Math.random() * 2.4 - 1.2)).toFixed(1)),
    glucoseTrend: trends[Math.floor(Math.random() * trends.length)],
    maternalPulse: Math.floor(82 + (Math.random() * 12 - 6)),
    ambulatorySystolicBp: 124,
    ambulatoryDiastolicBp: 80,
    lastSyncTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
}
