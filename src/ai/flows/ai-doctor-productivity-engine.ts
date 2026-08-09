import { z } from 'zod';

export const InboxItemSchema = z.object({
  id: z.string(),
  type: z.enum(['LAB_RESULT', 'PACS_IMAGE', 'RX_REFILL', 'CRITICAL_ALERT']),
  patientId: z.string(),
  patientName: z.string(),
  title: z.string(),
  details: z.string(),
  priority: z.enum(['NORMAL', 'HIGH', 'CRITICAL']),
  status: z.enum(['PENDING', 'SIGNED']),
  createdAt: z.string(),
});

export const SmartPhraseSchema = z.object({
  id: z.string(),
  trigger: z.string(), // e.g. .normalanc
  title: z.string(),
  category: z.string(),
  expandedText: z.string(),
});

export type InboxItem = z.infer<typeof InboxItemSchema>;
export type SmartPhrase = z.infer<typeof SmartPhraseSchema>;

export function getSystemSmartPhrases(): SmartPhrase[] {
  return [
    {
      id: 'SP-1',
      trigger: '.normalanc',
      title: 'Normative Antenatal Exam',
      category: 'OBSTETRICS',
      expandedText: 'Normative Antenatal Physical Examination:\n• Fundal height corresponds to calculated gestational age.\n• Fetal heart rate regular at 144 bpm with clear rhythmic sounds.\n• Lie longitudinal, cephalic presentation.\n• No lower limb pitting edema. BP normotensive.\n• Urinalysis negative for protein, glucose, and leukocytes.'
    },
    {
      id: 'SP-2',
      trigger: '.normalphys',
      title: 'Normative Systemic Physical Exam',
      category: 'GENERAL',
      expandedText: 'General Systemic Physical Examination:\n• Patient alert, conscious, and fully oriented in time, place, and person.\n• No pallor, no jaundice, no cyanosis, no pedal edema.\n• Cardiovascular: S1 S2 present, no murmurs.\n• Respiratory: Chest clear bilaterally on auscultation, vesicular breath sounds.\n• Abdomen: Soft, non-tender, no organomegaly.'
    },
    {
      id: 'SP-3',
      trigger: '.preeclampsia',
      title: 'Severe Preeclampsia Protocol',
      category: 'EMERGENCY_OB',
      expandedText: 'Severe Preeclampsia Resuscitation Protocol:\n• Patient presents with severe hypertension (BP >= 160/110 mmHg).\n• IV Labetalol 20mg STAT administered over 2 minutes.\n• Magnesium Sulfate 4g IV loading dose initiated over 15 minutes.\n• Continuous fetal heart rate CTG monitoring initiated. HDU bed requested.'
    },
    {
      id: 'SP-4',
      trigger: '.sob',
      title: 'Shortness of Breath / Respiratory Protocol',
      category: 'RESPIRATORY',
      expandedText: 'Acute Shortness of Breath Protocol:\n• SpO2 94% on room air. Supplemental O2 via nasal cannula initiated at 3L/min.\n• Respiratory rate 24 bpm with accessory muscle use.\n• Auscultation reveals bilateral basal end-inspiratory crepitations.\n• STAT Chest X-Ray and ABG / FBC ordered.'
    }
  ];
}

// Expands dot-phrases (.normalanc) inside raw text input
export function expandSmartPhrase(text: string): string {
  let output = text;
  const phrases = getSystemSmartPhrases();

  phrases.forEach((phrase) => {
    if (output.includes(phrase.trigger)) {
      output = output.replace(phrase.trigger, phrase.expandedText);
    }
  });

  return output;
}

// Sample Command Center Inbox Items
export function getSampleInboxItems(patientName = 'Benjamin Hedidor'): InboxItem[] {
  return [
    {
      id: 'INBOX-1',
      type: 'CRITICAL_ALERT',
      patientId: 'P-100',
      patientName,
      title: '🚨 CRITICAL VALUE ALERT: Severe Anemia',
      details: 'STAT Lab Result: Hemoglobin Hb = 6.2 g/dL (Below Critical Threshold < 6.5 g/dL). Transfusion evaluation required.',
      priority: 'CRITICAL',
      status: 'PENDING',
      createdAt: '10 mins ago'
    },
    {
      id: 'INBOX-2',
      type: 'LAB_RESULT',
      patientId: 'P-100',
      patientName,
      title: '🔬 Completed Lab Result: Malaria RDT & FBC',
      details: 'Malaria RDT Positive (+). WBC 11.2 x10^9/L, Platelets 180 x10^9/L. Awaiting physician sign-off.',
      priority: 'HIGH',
      status: 'PENDING',
      createdAt: '25 mins ago'
    },
    {
      id: 'INBOX-3',
      type: 'RX_REFILL',
      patientId: 'P-100',
      patientName,
      title: '💊 Unsigned Pharmacy Refill Request',
      details: 'Pharmacy requested approval: Methyldopa 250mg PO TID (30-day refill) for chronic hypertension.',
      priority: 'NORMAL',
      status: 'PENDING',
      createdAt: '1 hour ago'
    },
    {
      id: 'INBOX-4',
      type: 'PACS_IMAGE',
      patientId: 'P-100',
      patientName,
      title: '🖼️ Radiology PACS Scan Ready: Obstetric Ultrasound',
      details: 'Single live intrauterine fetus at 32 weeks, normal amniotic fluid index (AFI 14cm). Needs sign-off.',
      priority: 'NORMAL',
      status: 'PENDING',
      createdAt: '2 hours ago'
    }
  ];
}
