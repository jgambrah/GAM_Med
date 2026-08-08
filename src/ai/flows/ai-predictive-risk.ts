import { z } from 'genkit';

export const PredictiveRiskInputSchema = z.object({
  patientAge: z.number(),
  gender: z.string(),
  chronicConditions: z.array(z.string()).optional(),
  pastEncountersCount: z.number().optional(),
  missedAppointmentsCount: z.number().optional(),
  latestNEWS2Score: z.number().optional(),
});

export const PredictiveRiskOutputSchema = z.object({
  readmissionRiskPercent: z.number().describe('Predicted 30-day re-admission risk (0 to 100%)'),
  readmissionTier: z.enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']),
  ancDropoutRiskPercent: z.number().describe('Predicted ANC appointment dropout risk (0 to 100%)'),
  predictiveInsights: z.array(z.string()),
  recommendedAction: z.string(),
});

export type PredictiveRiskOutput = z.infer<typeof PredictiveRiskOutputSchema>;

export function calculatePredictiveRisk(input: {
  age?: number;
  news2Score?: number;
  missedAppointments?: number;
  isPregnant?: boolean;
}): PredictiveRiskOutput {
  const age = input.age || 35;
  const news2 = input.news2Score || 0;
  const missed = input.missedAppointments || 0;

  let readmissionRisk = 12 + (news2 * 8) + (missed * 10);
  if (age > 65) readmissionRisk += 15;
  readmissionRisk = Math.min(95, Math.max(5, readmissionRisk));

  let tier: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'LOW';
  if (readmissionRisk >= 65) tier = 'CRITICAL';
  else if (readmissionRisk >= 45) tier = 'HIGH';
  else if (readmissionRisk >= 25) tier = 'MODERATE';

  let ancDropoutRisk = 8 + (missed * 18);
  ancDropoutRisk = Math.min(90, Math.max(5, ancDropoutRisk));

  const insights: string[] = [];
  if (news2 >= 5) insights.push('Elevated physiological deterioration score increases 30-day relapse risk.');
  if (missed > 0) insights.push(`Patient has missed ${missed} past appointment(s), raising dropout risk.`);
  if (age > 65) insights.push('Senior age cohort associated with complex post-discharge recovery.');

  return {
    readmissionRiskPercent: readmissionRisk,
    readmissionTier: tier,
    ancDropoutRiskPercent: ancDropoutRisk,
    predictiveInsights: insights.length > 0 ? insights : ['Patient risk profile stable based on historical compliance.'],
    recommendedAction: tier === 'CRITICAL' || tier === 'HIGH'
      ? 'Initiate proactive 48-hour Telehealth check-in post discharge.'
      : 'Maintain standard routine outpatient follow-up.',
  };
}
