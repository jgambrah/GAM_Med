import { z } from 'zod';

export const DoctorEhrQueryPayloadSchema = z.object({
  queryId: z.string(),
  doctorName: z.string(),
  patientId: z.string(),
  patientName: z.string(),
  reason: z.string(),
  suggestedAlternative: z.string(),
  timestamp: z.string(),
  status: z.enum(['QUERY_SENT', 'DOCTOR_RESPONDED', 'RESOLVED']),
});

export const FinancialClearanceStatusSchema = z.object({
  status: z.enum(['INSURANCE_PRE_APPROVED', 'COPAY_PENDING', 'FULLY_PAID']),
  copayAmountGhc: z.number(),
  totalCostGhc: z.number(),
  insurerName: z.string(),
  isClearedForRelease: z.boolean(),
  badgeLabel: z.string(),
  badgeColor: z.string(),
});

export type DoctorEhrQueryPayload = z.infer<typeof DoctorEhrQueryPayloadSchema>;
export type FinancialClearanceStatus = z.infer<typeof FinancialClearanceStatusSchema>;

// Dispatches direct EHR clinical query alert to prescribing doctor inbox
export function dispatchDoctorEhrQuery(
  doctorName = 'Dr. Kwaku Mensah',
  patientId = 'P-100',
  patientName = 'Benjamin Hedidor',
  reason = 'Severe Drug Interaction Warning',
  suggestedAlternative = 'Switch to Erythromycin 500mg PO BID'
): DoctorEhrQueryPayload {
  return {
    queryId: `QUERY-EHR-${Math.floor(1000 + Math.random() * 9000)}`,
    doctorName,
    patientId,
    patientName,
    reason,
    suggestedAlternative,
    timestamp: new Date().toLocaleTimeString(),
    status: 'QUERY_SENT'
  };
}

// Resolves financial coverage & copay settlement clearance status for pharmacy release
export function resolveFinancialClearance(
  patientName = 'Benjamin Hedidor',
  totalCostGhc = 65.0,
  insuranceType = 'National Health Insurance Scheme (NHIS)'
): FinancialClearanceStatus {
  const nameLower = patientName.toLowerCase();

  if (nameLower.includes('daniel anim')) {
    return {
      status: 'COPAY_PENDING',
      copayAmountGhc: 45.0,
      totalCostGhc,
      insurerName: 'Acacia Health Insurance',
      isClearedForRelease: false,
      badgeLabel: '🟡 COPAY PENDING (GHS 45.00)',
      badgeColor: 'bg-amber-950 text-amber-300 border-amber-800'
    };
  } else if (nameLower.includes('janet bonah')) {
    return {
      status: 'FULLY_PAID',
      copayAmountGhc: 0,
      totalCostGhc,
      insurerName: 'Private Out-Of-Pocket',
      isClearedForRelease: true,
      badgeLabel: '🔵 FULLY PAID (GHS 0.00 DUE)',
      badgeColor: 'bg-blue-950 text-blue-300 border-blue-800'
    };
  }

  return {
    status: 'INSURANCE_PRE_APPROVED',
    copayAmountGhc: 0,
    totalCostGhc,
    insurerName: insuranceType,
    isClearedForRelease: true,
    badgeLabel: '🟢 NHIS PRE-APPROVED (0 COPAY)',
    badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-800'
  };
}
