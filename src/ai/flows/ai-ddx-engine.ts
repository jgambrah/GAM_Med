import { z } from 'zod';

export const DDxInputSchema = z.object({
  symptomsText: z.string(),
  vitals: z.any().optional(),
});

export const DDxItemSchema = z.object({
  conditionName: z.string(),
  icdCode: z.string(),
  probabilityPercent: z.number(),
  clinicalRationale: z.string(),
  recommendedLabs: z.array(z.string()),
});

export const DDxOutputSchema = z.object({
  rankedDiagnoses: z.array(DDxItemSchema),
});

export type DDxOutput = z.infer<typeof DDxOutputSchema>;

export function generateDifferentialDiagnosis(input: string): DDxOutput {
  const text = input.toLowerCase();

  if (text.includes('fever') || text.includes('chill') || text.includes('headache')) {
    return {
      rankedDiagnoses: [
        {
          conditionName: 'Acute Uncomplicated Malaria',
          icdCode: '1F40',
          probabilityPercent: 78,
          clinicalRationale: 'Classic triad of high fever, rigors, and endemic presentation.',
          recommendedLabs: ['Malaria Rapid Diagnostic Test (RDT)', 'Blood Film for MPS', 'Full Blood Count (CBC)'],
        },
        {
          conditionName: 'Urinary Tract Infection (Pyelonephritis)',
          icdCode: 'GC00',
          probabilityPercent: 15,
          clinicalRationale: 'Associated febrile illness with potential flank or dysuric symptoms.',
          recommendedLabs: ['Urinalysis Routine & Microscopy', 'Urine Culture & Sensitivity'],
        },
        {
          conditionName: 'Typhoid Fever (Salmonellosis)',
          icdCode: '1A07',
          probabilityPercent: 7,
          clinicalRationale: 'Prolonged fever with abdominal discomfort.',
          recommendedLabs: ['Widal Test / Blood Culture', 'Stool Routine'],
        }
      ]
    };
  }

  if (text.includes('bp') || text.includes('headache') || text.includes('pregnancy') || text.includes('swelling')) {
    return {
      rankedDiagnoses: [
        {
          conditionName: 'Severe Preeclampsia',
          icdCode: 'JA24.1',
          probabilityPercent: 82,
          clinicalRationale: 'Hypertension in pregnancy with neurological signs (headache/visual disturbance).',
          recommendedLabs: ['Urine Protein Quantification', 'Renal Function (U&E/Creatinine)', 'Liver Function Tests'],
        },
        {
          conditionName: 'Gestational Hypertension',
          icdCode: 'JA24.0',
          probabilityPercent: 18,
          clinicalRationale: 'New onset hypertension without significant end-organ proteinuria.',
          recommendedLabs: ['24-Hour Urine Protein', 'Serum Urate'],
        }
      ]
    };
  }

  return {
    rankedDiagnoses: [
      {
        conditionName: 'Upper Respiratory Tract Infection (URTI)',
        icdCode: 'CA00',
        probabilityPercent: 65,
        clinicalRationale: 'Non-specific systemic presentation.',
        recommendedLabs: ['Full Blood Count (CBC)'],
      },
      {
        conditionName: 'Acute Gastroenteritis',
        icdCode: '1A40',
        probabilityPercent: 35,
        clinicalRationale: 'Mild abdominal discomfort.',
        recommendedLabs: ['Stool Routine'],
      }
    ]
  };
}
