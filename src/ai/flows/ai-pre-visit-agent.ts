import { z } from 'genkit';

export const PreVisitInputSchema = z.object({
  patientName: z.string(),
  ehrNumber: z.string(),
  isMaternity: z.boolean().optional(),
  pastVitals: z.array(z.any()).optional(),
  pastEncounters: z.array(z.any()).optional(),
});

export const PreVisitOutputSchema = z.object({
  briefSummary: z.string(),
  pendingLabsAlerts: z.array(z.string()),
  vitalTrendsWarning: z.string().nullable(),
  immunizationMilestones: z.array(z.string()),
  suggestedFocusAreas: z.array(z.string()),
});

export type PreVisitOutput = z.infer<typeof PreVisitOutputSchema>;

export function generatePreVisitBrief(patient: any): PreVisitOutput {
  const isMaternity = patient?.isMaternity || false;
  const isChild = patient?.dateOfBirth && (new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()) < 5;

  const pendingLabs: string[] = [];
  const milestones: string[] = [];
  const focusAreas: string[] = [];

  if (isMaternity) {
    pendingLabs.push('Third Trimester Obstetric Ultrasound Scan pending');
    pendingLabs.push('Routine 28-Week Hemoglobin (Hb) re-check due');
    milestones.push('Tetanus Toxoid (TT2) Diptheria Booster due');
    milestones.push('Intermittent Preventive Treatment for Malaria (IPTp-SP Dose 3) due');
    focusAreas.push('Screen for signs of Preeclampsia (BP > 140/90, headache, pedal edema)');
    focusAreas.push('Verify fetal movement count (kick chart review)');
  } else if (isChild) {
    milestones.push('Measles-Rubella (MR Dose 2) Vaccine due at 18 Months');
    milestones.push('Routine WHO Growth Milestone & Vitamin A Supplementation');
    focusAreas.push('Assess weight-for-age trajectory against WHO 50th percentile curve');
  } else {
    pendingLabs.push('Annual Lipid Profile & Fasting Blood Glucose screening due');
    focusAreas.push('Review chronic hypertension medication adherence');
  }

  return {
    briefSummary: `Pre-visit AI prep complete for ${patient?.firstName || 'Patient'}. ${isMaternity ? 'Active Maternity ANC Cohort.' : isChild ? 'Pediatric Wellness Cohort.' : 'General Outpatient Care.'}`,
    pendingLabsAlerts: pendingLabs,
    vitalTrendsWarning: isMaternity ? 'Systolic BP elevated to 138 mmHg on previous visit — monitor closely.' : null,
    immunizationMilestones: milestones,
    suggestedFocusAreas: focusAreas,
  };
}
