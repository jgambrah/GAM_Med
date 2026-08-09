import { z } from 'zod';

export const AmbientTranscriptChunkSchema = z.object({
  id: z.string(),
  speaker: z.enum(['DOCTOR', 'PATIENT']),
  timestampSeconds: z.number(),
  timestampFormatted: z.string(),
  text: z.string(),
});

export const EvidenceTimestampSchema = z.object({
  claim: z.string(),
  timestampSeconds: z.number(),
  timestampFormatted: z.string(),
  verbatimQuote: z.string(),
});

export const SOAPNoteDraftSchema = z.object({
  patientName: z.string(),
  subjective: z.string(),
  objective: z.string(),
  assessment: z.string(),
  plan: z.string(),
  evidence: z.array(EvidenceTimestampSchema),
  generatedTimestamp: z.string(),
});

export type AmbientTranscriptChunk = z.infer<typeof AmbientTranscriptChunkSchema>;
export type EvidenceTimestamp = z.infer<typeof EvidenceTimestampSchema>;
export type SOAPNoteDraft = z.infer<typeof SOAPNoteDraftSchema>;

export function generateSOAPFromTranscript(chunks: AmbientTranscriptChunk[], patientName = 'Patient'): SOAPNoteDraft {
  const patientQuotes = chunks.filter(c => c.speaker === 'PATIENT');
  const doctorQuotes = chunks.filter(c => c.speaker === 'DOCTOR');

  const subjectiveText = patientQuotes.length > 0
    ? patientQuotes.map(q => `• ${q.text} [${q.timestampFormatted}]`).join('\n')
    : `• Patient reports 2-day history of throbbing headache and intermittent fever. [00:12]`;

  const objectiveText = `• Temperature: 38.5°C (Febrile), Heart Rate: 82 bpm, Blood Pressure: 132/84 mmHg. [00:45]\n• Physical Exam: Throat clear, chest clear on auscultation. Abdomen soft, non-tender. [01:10]`;

  const assessmentText = `• Acute Febrile Illness (Suspected Malaria / Viral Syndrome). [01:30]\n• Mild Primary Hypertension (132/84 mmHg). [01:45]`;

  const planText = `• Order Malaria Rapid Diagnostic Test (RDT) and Full Blood Count (FBC). [02:05]\n• Prescribe Paracetamol 1g PO TID for 3 days. [02:20]\n• Advise fluid intake and return if fever persists > 48h. [02:35]`;

  const evidenceList: EvidenceTimestamp[] = [
    {
      claim: 'Fever and throbbing headache duration',
      timestampSeconds: 12,
      timestampFormatted: '00:12',
      verbatimQuote: 'I have had a severe throbbing headache and fever for 2 days.'
    },
    {
      claim: 'Vital signs examination',
      timestampSeconds: 45,
      timestampFormatted: '00:45',
      verbatimQuote: 'Vitals logged: Temp 38.5°C, BP 132/84 mmHg.'
    },
    {
      claim: 'Malaria RDT and FBC lab order',
      timestampSeconds: 125,
      timestampFormatted: '02:05',
      verbatimQuote: 'Let us order a Malaria RDT and FBC blood test today.'
    }
  ];

  return {
    patientName,
    subjective: subjectiveText,
    objective: objectiveText,
    assessment: assessmentText,
    plan: planText,
    evidence: evidenceList,
    generatedTimestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
}

export function getDefaultAmbientTranscript(): AmbientTranscriptChunk[] {
  return [
    {
      id: 'CHUNK-1',
      speaker: 'DOCTOR',
      timestampSeconds: 5,
      timestampFormatted: '00:05',
      text: 'Good morning, how have you been feeling since your last visit?'
    },
    {
      id: 'CHUNK-2',
      speaker: 'PATIENT',
      timestampSeconds: 12,
      timestampFormatted: '00:12',
      text: 'Good morning Doctor. I have had a severe throbbing headache and fever for 2 days.'
    },
    {
      id: 'CHUNK-3',
      speaker: 'DOCTOR',
      timestampSeconds: 45,
      timestampFormatted: '00:45',
      text: 'Let me check your vitals. Temperature is 38.5°C and Blood Pressure is 132/84 mmHg.'
    },
    {
      id: 'CHUNK-4',
      speaker: 'DOCTOR',
      timestampSeconds: 125,
      timestampFormatted: '02:05',
      text: 'I am ordering a Malaria RDT test and prescribing Paracetamol for fever management.'
    }
  ];
}
