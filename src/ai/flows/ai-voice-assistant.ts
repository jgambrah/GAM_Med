import { z } from 'zod';

export const VoiceIntentEnum = z.enum([
  'OPEN_LABS',
  'OPEN_PACS',
  'DICTATE_NOTE',
  'QUEUE_ANC_ORDERS',
  'SIMULATE_ALARM',
  'SCROLL_TO_VITALS',
  'UNKNOWN'
]);

export type VoiceIntent = z.infer<typeof VoiceIntentEnum>;

export interface VoiceCommandResult {
  intent: VoiceIntent;
  matchedPhrase: string;
  payload?: string;
  feedbackText: string;
}

export function parseVoiceCommand(transcript: string, patientName = 'Patient'): VoiceCommandResult {
  const lower = transcript.toLowerCase().trim();

  if (lower.includes('lab') || lower.includes('cbc') || lower.includes('blood test') || lower.includes('results')) {
    return {
      intent: 'OPEN_LABS',
      matchedPhrase: transcript,
      feedbackText: `Displaying latest laboratory panel and blood results for ${patientName}.`
    };
  }

  if (lower.includes('pacs') || lower.includes('x-ray') || lower.includes('xray') || lower.includes('scan') || lower.includes('imaging')) {
    return {
      intent: 'OPEN_PACS',
      matchedPhrase: transcript,
      feedbackText: `Launching Computer Vision PACS Imaging Viewer for ${patientName}.`
    };
  }

  if (lower.includes('anc') || lower.includes('queue order') || lower.includes('aspirin') || lower.includes('nipt')) {
    return {
      intent: 'QUEUE_ANC_ORDERS',
      matchedPhrase: transcript,
      feedbackText: `Dispatching Aspirin, OGTT, and NIPT genomic ANC orders for ${patientName}.`
    };
  }

  if (lower.includes('alarm') || lower.includes('icu alarm') || lower.includes('critical')) {
    return {
      intent: 'SIMULATE_ALARM',
      matchedPhrase: transcript,
      feedbackText: `Simulating ICU continuous vitals critical alarm.`
    };
  }

  if (lower.includes('vitals') || lower.includes('heart rate') || lower.includes('spo2')) {
    return {
      intent: 'SCROLL_TO_VITALS',
      matchedPhrase: transcript,
      feedbackText: `Navigating to continuous bedside telemetry stream.`
    };
  }

  if (lower.includes('dictate') || lower.includes('note') || lower.includes('patient')) {
    const payload = transcript.replace(/^.*?(dictate|note)\s*/i, '');
    return {
      intent: 'DICTATE_NOTE',
      matchedPhrase: transcript,
      payload: payload || transcript,
      feedbackText: `Dictated note captured into patient encounter record.`
    };
  }

  return {
    intent: 'UNKNOWN',
    matchedPhrase: transcript,
    feedbackText: `Command not recognized. Say 'show lab values', 'open PACS scan', or 'queue ANC orders'.`
  };
}

export function speakVoiceResponse(text: string): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel(); // Stop prior utterances
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    window.speechSynthesis.speak(utterance);
  }
}
