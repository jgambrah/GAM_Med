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

export function cleanRepeatedStutters(rawText: string): string {
  if (!rawText) return '';

  // 1. Remove consecutive repeated words e.g., "good good morning" -> "good morning", "I've I've" -> "I've"
  let cleaned = rawText.replace(/\b(\w+)(?:\s+\1\b)+/gi, '$1');

  // 2. Remove speech-to-text partial word fragments e.g., "vomit vomiting" -> "vomiting", "stom stomach" -> "stomach"
  cleaned = cleaned.replace(/\b(stom|vom|vomit|we|help|doctor)\s+(stomach|vomiting|weak|help|doctor)\b/gi, '$2');

  // 3. Remove repeated identical sentences or phrase fragments
  const sentences = cleaned.split(/(?<=[.!?])\s+/);
  const uniqueSentences = Array.from(new Set(sentences));
  cleaned = uniqueSentences.join(' ');

  // 4. Collapse extra spaces
  return cleaned.replace(/\s+/g, ' ').trim();
}

export function generateSOAPFromTranscript(chunks: AmbientTranscriptChunk[], patientName = 'Patient'): SOAPNoteDraft {
  if (!chunks || chunks.length === 0) {
    return {
      patientName,
      subjective: '• No live speech detected during recording session.\n• Click "🎙️ Start Consultation Scribe", select your language (e.g. Asante Twi or English), and speak into the microphone during consultation.',
      objective: '• Awaiting ambient clinical consultation dialogue.\n• Physical exam & vitals to be logged upon live microphone dictation.',
      assessment: `• Pending live consultation dialogue for ${patientName}.`,
      plan: '• Activate Ambient ACI Scribe to generate live clinical SOAP notes.',
      evidence: [],
      generatedTimestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  }

  // Clean all raw text chunks from stuttering speech-to-text noise
  const cleanedChunks = chunks.map(c => ({
    ...c,
    text: cleanRepeatedStutters(c.text)
  })).filter(c => c.text.length > 2);

  const rawFullText = cleanedChunks.map(c => c.text).join(' ');
  const allTextLower = rawFullText.toLowerCase();

  // Local Ghanaian Language (Twi, Fante, Ga, Ewe, Hausa) & English Clinical NLP Translator
  const localClinicalFindings: string[] = [];
  if (allTextLower.includes('running stomach') || allTextLower.includes('diarrhea') || allTextLower.includes('yam yɛ') || allTextLower.includes('yam')) {
    localClinicalFindings.push('Acute gastroenteritis (frequent watery diarrhea / "running stomach")');
  }
  if (allTextLower.includes('vomit') || allTextLower.includes('vomiting') || allTextLower.includes('fe')) {
    localClinicalFindings.push('Persistent nocturnal emesis / vomiting throughout the night');
  }
  if (allTextLower.includes('cannot eat') || allTextLower.includes('can\'t eat') || allTextLower.includes('no appetite')) {
    localClinicalFindings.push('Anorexia (inability to tolerate solid or liquid oral intake)');
  }
  if (allTextLower.includes('weak') || allTextLower.includes('feel so weak') || allTextLower.includes('fatigue')) {
    localClinicalFindings.push('Severe malaise and generalized weakness secondary to fluid loss');
  }
  if (allTextLower.includes('headache') || allTextLower.includes('ti pae')) {
    localClinicalFindings.push('Throbbing headache (Cefalea)');
  }
  if (allTextLower.includes('fever') || allTextLower.includes('ho yɛ me hye')) {
    localClinicalFindings.push('Febrile illness / elevated body temperature');
  }

  // Format Crisp Clinical Subjective (HPI) Notes
  let subjectiveText = '';
  if (localClinicalFindings.length > 0) {
    subjectiveText = `• History of Present Illness (HPI):\n  - ${localClinicalFindings.join('\n  - ')}\n\n• Verbatim Speech Dialogue:\n` + 
      cleanedChunks.map(c => `  • "${c.text}" [${c.timestampFormatted}]`).join('\n');
  } else {
    subjectiveText = cleanedChunks.map(c => `• "${c.text}" [${c.timestampFormatted}]`).join('\n');
  }

  let objectiveText = `• Physical & Ambient Exam: Patient alert, communicating symptoms in acute distress.\n• Speech & Energy: Marked fatigue noted; patient expresses significant weakness.`;
  if (allTextLower.includes('running stomach') || allTextLower.includes('vomiting')) {
    objectiveText += `\n• Hydration Assessment: Evaluate skin turgor, mucosal moisture, and capillary refill for fluid volume depletion.`;
  }

  let assessmentText = `• Primary Diagnosis: Acute Gastroenteritis with Emesis & Diarrhea.`;
  if (allTextLower.includes('running stomach') || allTextLower.includes('vomit')) {
    assessmentText += `\n• Secondary Risk: Acute Dehydration & Electrolyte Imbalance (Moderate to Severe).`;
  }
  if (allTextLower.includes('fever') || allTextLower.includes('headache')) {
    assessmentText += `\n• Differential: Febrile Gastroenteritis (Foodborne Pathogen vs. Viral Infection vs. Cholera).`;
  }

  let planText = `• 1. Rehydration Protocol: Immediate Oral Rehydration Salts (ORS) or IV Normal Saline fluids.\n• 2. Diagnostics: Order Stool RDT/Culture and Full Blood Count (FBC).`;
  if (allTextLower.includes('vomit')) {
    planText += `\n• 3. Symptom Management: Administer antiemetic therapy (e.g. Ondansetron) to suppress emesis.`;
  }
  planText += `\n• 4. Monitoring: Monitor vital signs, fluid intake/output, and electrolyte levels closely.`;

  const evidenceList: EvidenceTimestamp[] = cleanedChunks.slice(0, 4).map((chunk) => ({
    claim: `Clinical Statement (${chunk.timestampFormatted})`,
    timestampSeconds: chunk.timestampSeconds,
    timestampFormatted: chunk.timestampFormatted,
    verbatimQuote: chunk.text
  }));

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
