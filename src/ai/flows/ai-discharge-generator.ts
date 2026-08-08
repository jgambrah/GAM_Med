import { z } from 'genkit';

export const DischargeInputSchema = z.object({
  patientName: z.string(),
  diagnosis: z.string(),
  prescriptions: z.array(z.string()).optional(),
  language: z.enum(['ENGLISH', 'TWI']).default('ENGLISH'),
});

export const DischargeOutputSchema = z.object({
  summaryTitle: z.string(),
  careInstructions: z.array(z.string()),
  dietGuide: z.string(),
  medicationPlan: z.array(z.string()),
  warningFlags: z.array(z.string()),
});

export type DischargeOutput = z.infer<typeof DischargeOutputSchema>;

export function generateDischargeCarePlan(patientName: string, diagnosis: string, language: 'ENGLISH' | 'TWI' = 'ENGLISH'): DischargeOutput {
  if (language === 'TWI') {
    return {
      summaryTitle: `Ayaresabea Kɔfye Nkyerɛkyerɛmu — ${patientName}`,
      careInstructions: [
        'Nom aduru a dɔkota ama wo no pɛpɛɛpɛ abusuasɛm ne bere pɔtee biara mu.',
        'Gye wo ho ahome kɛseɛ na nom nsuo pii da biara (lita 2 kɔsi 3).',
        'Sɛ wowɔ awoɔ akyi kɔfye a, hwehwɛ wo ho so na hohoro wo nipadua ho yiye da biara.',
        'Sane bɛhwehwɛ dɔkota wɔ dabere a yɛahyɛ wo no mu.'
      ],
      dietGuide: 'Didi aduane a nnuane pa (iron ne vitamins) wom kɛseɛ te sɛ fankaa, nsekuro, nam, ne aduane abɔdeɛ.',
      medicationPlan: [
        'Paracetamol 500mg — Nom abien da biara mmrɛ mmiensa (TDS) sɛ wowɔ yaw a.',
        'Coartem / Artemether — Nom saa ara kosi sɛ ebewie pɛpɛɛpɛ.'
      ],
      warningFlags: [
        '🚨 Sɛ wo ho hyew boro 38.5°C a, sane bɛra ayaresabea ntɛm mpaaho!',
        '🚨 Sɛ womo yafunu yɛ wo yaw kɛseɛ anaa mogya fi wo ho a, soma frɛ 112 anaa bɛra Emergency.'
      ]
    };
  }

  return {
    summaryTitle: `Hospital Discharge Care Plan — ${patientName}`,
    careInstructions: [
      'Take all prescribed medications strictly according to the written schedule.',
      'Ensure adequate bed rest and drink 2 to 3 liters of clean water daily.',
      'For post-natal recovery, maintain proper hygiene and clean wound care daily.',
      'Return to the clinic on your scheduled follow-up appointment date.'
    ],
    dietGuide: 'Eat a balanced diet rich in iron, proteins, and vitamins (e.g. green leafy vegetables, beans, lean meat, and fresh fruits).',
    medicationPlan: [
      'Paracetamol 500mg — Take 2 tablets 8-hourly as needed for pain or mild fever.',
      'Prescribed Antibiotics / Antimalarials — Complete the full course as instructed.'
    ],
    warningFlags: [
      '🚨 Return immediately to Emergency if fever exceeds 38.5°C.',
      '🚨 Seek urgent emergency care if severe abdominal pain, difficulty breathing, or abnormal bleeding occurs.'
    ]
  };
}
