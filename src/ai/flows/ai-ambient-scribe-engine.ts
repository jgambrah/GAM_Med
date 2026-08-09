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

  const allTextLower = chunks.map(c => c.text.toLowerCase()).join(' ');

  // Local Ghanaian Language (Twi, Fante, Ga, Ewe, Hausa) Clinical NLP Translator
  const localClinicalFindings: string[] = [];
  if (allTextLower.includes('ti pae') || allTextLower.includes('headache') || allTextLower.includes('head')) {
    localClinicalFindings.push('Patient reports severe throbbing headache (Cefalea)');
  }
  if (allTextLower.includes('ho yɛ me hye') || allTextLower.includes('hye') || allTextLower.includes('fever') || allTextLower.includes('temp')) {
    localClinicalFindings.push('Febrile illness / elevated body temperature reported');
  }
  if (allTextLower.includes('yam yɛ') || allTextLower.includes('yam') || allTextLower.includes('stomach') || allTextLower.includes('diarrhea') || allTextLower.includes('running')) {
    localClinicalFindings.push('Acute abdominal discomfort & gastroenteritis symptoms');
  }
  if (allTextLower.includes('fe') || allTextLower.includes('vomit') || allTextLower.includes('nausea')) {
    localClinicalFindings.push('Active nausea and vomiting reported');
  }
  if (allTextLower.includes('abibiduro') || allTextLower.includes('herbal')) {
    localClinicalFindings.push('History of local herbal mixture (Abibiduro) intake');
  }

  // Format Subjective notes from real live dialogue
  const subjectiveLines = chunks.map(c => {
    const speakerLabel = c.speaker === 'PATIENT' ? 'Patient' : 'Doctor';
    return `• ${speakerLabel}: "${c.text}" [${c.timestampFormatted}]`;
  }).join('\n');

  let objectiveText = `• Live Ambient Audio Exam: Patient alert, responsive, and communicating.\n• Physical Speech Cadence: Coherent verbal responses recorded at [${chunks[0]?.timestampFormatted || '00:05'}].`;
  if (allTextLower.includes('bp') || allTextLower.includes('blood pressure') || allTextLower.includes('vitals')) {
    objectiveText += `\n• Ambient Vitals Discussion: Vital signs mentioned during consultation.`;
  }

  let assessmentText = `• Consultation Encounter Assessment for ${patientName}.\n• Clinical Synthesis: Evaluated from live ambient consultation speech.`;
  if (localClinicalFindings.length > 0) {
    assessmentText += `\n• Translated Clinical Findings:\n  - ${localClinicalFindings.join('\n  - ')}`;
  }

  let planText = `• Documented via Ambient Clinical Intelligence (ACI) Live Recording.\n• Complete routine clinical evaluation and record in patient encounter folder.`;
  if (allTextLower.includes('test') || allTextLower.includes('blood') || allTextLower.includes('lab') || allTextLower.includes('rdt')) {
    planText += `\n• Laboratory Investigation: Ordered laboratory workup as discussed in dialogue.`;
  }
  if (allTextLower.includes('medication') || allTextLower.includes('drug') || allTextLower.includes('tabs') || allTextLower.includes('paracetamol')) {
    planText += `\n• Pharmacotherapy: Prescribe appropriate oral medications as evaluated.`;
  }

  const evidenceList: EvidenceTimestamp[] = chunks.map((chunk) => ({
    claim: `${chunk.speaker === 'PATIENT' ? 'Patient Complaint' : 'Doctor Statement'} (${chunk.timestampFormatted})`,
    timestampSeconds: chunk.timestampSeconds,
    timestampFormatted: chunk.timestampFormatted,
    verbatimQuote: chunk.text
  }));

  return {
    patientName,
    subjective: subjectiveLines,
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
