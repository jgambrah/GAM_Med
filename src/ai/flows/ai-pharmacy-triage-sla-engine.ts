import { z } from 'zod';

export const TriageItemSchema = z.object({
  orderId: z.string(),
  patientId: z.string(),
  patientName: z.string(),
  providerName: z.string(),
  urgency: z.enum(['STAT_EMERGENCY', 'INPATIENT_DISCHARGE', 'ROUTINE_OUTPATIENT']),
  createdAtTimestamp: z.string(),
  elapsedMinutes: z.number(),
  slaStatus: z.enum(['WITHIN_SLA', 'SLA_BREACH_WARNING']),
  lifecycleStage: z.enum(['UNREVIEWED', 'VERIFIED', 'PACKAGING', 'READY_FOR_PICKUP']),
  priorityRank: z.number(),
  statusBadgeColor: z.string(),
});

export type TriageItem = z.infer<typeof TriageItemSchema>;

// Evaluates order urgency rank, time-in-queue SLA bottleneck timer, and lifecycle status
export function evaluateTriageAndSla(
  createdAtMinutesAgo = 25,
  urgency: TriageItem['urgency'] = 'STAT_EMERGENCY',
  currentStage: TriageItem['lifecycleStage'] = 'UNREVIEWED'
): { elapsedMinutes: number; slaStatus: TriageItem['slaStatus']; priorityRank: number; statusBadgeColor: string } {
  const elapsedMinutes = createdAtMinutesAgo;

  let priorityRank = 3;
  let slaThresholdMinutes = 30;

  if (urgency === 'STAT_EMERGENCY') {
    priorityRank = 1;
    slaThresholdMinutes = 10;
  } else if (urgency === 'INPATIENT_DISCHARGE') {
    priorityRank = 2;
    slaThresholdMinutes = 20;
  }

  const isSlaBreached = elapsedMinutes > slaThresholdMinutes;
  const slaStatus = isSlaBreached ? 'SLA_BREACH_WARNING' : 'WITHIN_SLA';

  let statusBadgeColor = 'bg-amber-950 text-amber-300 border-amber-800'; // UNREVIEWED
  if (currentStage === 'VERIFIED') statusBadgeColor = 'bg-indigo-950 text-indigo-300 border-indigo-800';
  else if (currentStage === 'PACKAGING') statusBadgeColor = 'bg-purple-950 text-purple-300 border-purple-800';
  else if (currentStage === 'READY_FOR_PICKUP') statusBadgeColor = 'bg-emerald-950 text-emerald-300 border-emerald-800';

  return {
    elapsedMinutes,
    slaStatus,
    priorityRank,
    statusBadgeColor
  };
}

// Advances prescription lifecycle stage
export function advancePrescriptionLifecycleStage(currentStage: TriageItem['lifecycleStage']): TriageItem['lifecycleStage'] {
  switch (currentStage) {
    case 'UNREVIEWED': return 'VERIFIED';
    case 'VERIFIED': return 'PACKAGING';
    case 'PACKAGING': return 'READY_FOR_PICKUP';
    case 'READY_FOR_PICKUP': return 'READY_FOR_PICKUP';
  }
}

// Generates sample categorized triage items
export function getSampleTriageItems(patientName = 'Benjamin Hedidor'): TriageItem[] {
  return [
    {
      orderId: 'ORD-STAT-99',
      patientId: 'P-100',
      patientName,
      providerName: 'Dr. Kwaku Mensah',
      urgency: 'STAT_EMERGENCY',
      createdAtTimestamp: '25 mins ago',
      elapsedMinutes: 25,
      slaStatus: 'SLA_BREACH_WARNING',
      lifecycleStage: 'UNREVIEWED',
      priorityRank: 1,
      statusBadgeColor: 'bg-amber-950 text-amber-300 border-amber-800'
    },
    {
      orderId: 'ORD-DISCHARGE-42',
      patientId: 'P-101',
      patientName: 'Daniel Anim',
      providerName: 'Dr. Ama Serwah',
      urgency: 'INPATIENT_DISCHARGE',
      createdAtTimestamp: '12 mins ago',
      elapsedMinutes: 12,
      slaStatus: 'WITHIN_SLA',
      lifecycleStage: 'VERIFIED',
      priorityRank: 2,
      statusBadgeColor: 'bg-indigo-950 text-indigo-300 border-indigo-800'
    },
    {
      orderId: 'ORD-ROUTINE-15',
      patientId: 'P-102',
      patientName: 'Janet Bonah',
      providerName: 'Dr. Emmanuel Osei',
      urgency: 'ROUTINE_OUTPATIENT',
      createdAtTimestamp: '4 mins ago',
      elapsedMinutes: 4,
      slaStatus: 'WITHIN_SLA',
      lifecycleStage: 'READY_FOR_PICKUP',
      priorityRank: 3,
      statusBadgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-800'
    }
  ];
}
