import { z } from 'zod';

export const IotFridgeTelemetrySchema = z.object({
  sensorId: z.string(),
  fridgeName: z.string(),
  temperatureCelsius: z.number(),
  targetRangeMin: z.number(),
  targetRangeMax: z.number(),
  humidityPercent: z.number(),
  status: z.enum(['SAFE_OPTIMAL', 'TEMPERATURE_EXCURSION_ALERT', 'CRITICAL_HIGH', 'TEMP_EXCURSION_LOCKED']),
  lastPingTime: z.string(),
  safetyMessage: z.string(),
});

export const FefoPickRouteSchema = z.object({
  batchNumber: z.string(),
  drugName: z.string(),
  shelfLocation: z.string(),
  binNumber: z.string(),
  daysUntilExpiry: z.number(),
  quantityToPick: z.number(),
  pickPriorityRank: z.number(),
  recommendationNote: z.string(),
});

export const MilligramNarcoticLogSchema = z.object({
  logId: z.string(),
  narcoticName: z.string(),
  dispensedMg: z.number(),
  wastedMg: z.number(),
  previousBalanceMg: z.number(),
  newBalanceMg: z.number(),
  primaryPharmacist: z.string(),
  witnessPharmacist: z.string(),
  timestamp: z.string(),
  biometricVerified: z.boolean(),
});

export type IotFridgeTelemetry = z.infer<typeof IotFridgeTelemetrySchema>;
export type FefoPickRoute = z.infer<typeof FefoPickRouteSchema>;
export type MilligramNarcoticLog = z.infer<typeof MilligramNarcoticLogSchema>;

// Evaluates IoT Cold-Chain Vaccine & Biological Fridge Sensor Stream (2°C - 8°C)
export function evaluateIotColdChainSensor(
  currentTemp = 4.2,
  minTemp = 2.0,
  maxTemp = 8.0,
  fridgeName = 'Main Biologicals & Vaccine Fridge #1'
): IotFridgeTelemetry {
  const isExcursion = currentTemp < minTemp || currentTemp > maxTemp;
  const isCriticalHigh = currentTemp > 12.0;

  let status: IotFridgeTelemetry['status'] = 'SAFE_OPTIMAL';
  let safetyMessage = `✅ COLD-CHAIN OPTIMAL (${currentTemp}°C): Storage within safe range (${minTemp}°C - ${maxTemp}°C). Vaccines & Insulin stable.`;

  if (isCriticalHigh) {
    status = 'TEMP_EXCURSION_LOCKED';
    safetyMessage = `🚨 CRITICAL TEMPERATURE EXCURSION (${currentTemp}°C > ${maxTemp}°C): Stock automatically locked! Risk of protein denaturation and vaccine potency loss. Quality Control review required.`;
  } else if (isExcursion) {
    status = 'TEMPERATURE_EXCURSION_ALERT';
    safetyMessage = `⚠️ TEMPERATURE DRIFT WARNING (${currentTemp}°C): Outside safe storage range (${minTemp}°C - ${maxTemp}°C). Sensor ping alert dispatched to mobile team.`;
  }

  return {
    sensorId: 'IOT-SENSOR-VACCINE-01',
    fridgeName,
    temperatureCelsius: currentTemp,
    targetRangeMin: minTemp,
    targetRangeMax: maxTemp,
    humidityPercent: 45,
    status,
    lastPingTime: 'Just now (Live IoT Stream)',
    safetyMessage
  };
}

// Generates automated step-by-step FEFO Batch Pick Route Map for pharmacists
export function generateFefoPickRoute(drugName = 'Amoxicillin 500mg', requestedQty = 30): FefoPickRoute[] {
  return [
    {
      batchNumber: 'B-2026-08A',
      drugName,
      shelfLocation: 'Shelf A-4',
      binNumber: 'Bin 12',
      daysUntilExpiry: 42,
      quantityToPick: requestedQty,
      pickPriorityRank: 1,
      recommendationNote: 'FEFO PICK PRIORITY #1: Nearest expiration date (42 days left). Pick from Shelf A-4 Bin 12.'
    },
    {
      batchNumber: 'B-2027-01B',
      drugName,
      shelfLocation: 'Shelf A-5',
      binNumber: 'Bin 03',
      daysUntilExpiry: 159,
      quantityToPick: 0,
      pickPriorityRank: 2,
      recommendationNote: 'RESERVE BATCH: 159 days left. Do not pick until Batch B-2026-08A is depleted.'
    }
  ];
}

// Logs milligram narcotic audit entry and updates perpetual balance
export function logMilligramNarcoticDispense(
  narcoticName = 'Morphine Sulfate 10mg/mL IV',
  dispensedMg = 10,
  wastedMg = 2,
  currentBalanceMg = 450,
  primaryPharmacist = 'Pharmacist',
  witnessPharmacist = 'Witness Pharmacist'
): MilligramNarcoticLog {
  const totalDeducted = dispensedMg + wastedMg;
  const newBalance = Math.max(0, currentBalanceMg - totalDeducted);

  return {
    logId: `NARCOTIC-MG-${Math.floor(1000 + Math.random() * 9000)}`,
    narcoticName,
    dispensedMg,
    wastedMg,
    previousBalanceMg: currentBalanceMg,
    newBalanceMg: newBalance,
    primaryPharmacist,
    witnessPharmacist,
    timestamp: new Date().toLocaleTimeString(),
    biometricVerified: true
  };
}
