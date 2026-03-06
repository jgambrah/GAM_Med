'use server';
/**
 * @fileOverview A Genkit flow for a context-aware clinical assistant.
 *
 * - askClinicalAssistant - A function that provides AI-driven clinical insights.
 * - ClinicalAssistantInput - The input type for the askClinicalAssistant function.
 * - ClinicalAssistantOutput - The return type for the askClinicalAssistant function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ClinicalAssistantInputSchema = z.object({
  prompt: z.string().describe("The user's query to the assistant."),
  patientContext: z.string().describe("A JSON string of the patient's recent encounters and lab results."),
  userRole: z.string().describe('The role of the user asking the question.'),
  fullName: z.string().describe('The full name of the user.'),
  hospitalId: z.string().describe('The ID of the hospital the user belongs to.'),
});
export type ClinicalAssistantInput = z.infer<typeof ClinicalAssistantInputSchema>;

const ClinicalAssistantOutputSchema = z.object({
  text: z.string().describe('The AI-generated response.'),
});
export type ClinicalAssistantOutput = z.infer<typeof ClinicalAssistantOutputSchema>;

export async function askClinicalAssistant(input: ClinicalAssistantInput): Promise<ClinicalAssistantOutput> {
  return clinicalAssistantFlow(input);
}

const clinicalAssistantPrompt = ai.definePrompt({
  name: 'clinicalAssistantPrompt',
  input: { schema: ClinicalAssistantInputSchema },
  output: { schema: ClinicalAssistantOutputSchema },
  prompt: `You are the GamMed Clinical Co-Pilot, a high-level medical consultant assistant in Ghana.
User: {{{fullName}}} ({{{userRole}}})
Hospital ID: {{{hospitalId}}}

Provided Patient Context: {{{patientContext}}}

CONTEXT MANAGEMENT:
- If the user acknowledges a summary, DO NOT repeat the vitals again. Move to the next clinical step.
- Only show "Navigation Assistance" if the user specifically asks "How do I..." or "Where is...".

CLINICAL PROTOCOLS (Ghana Health Service Standard):
- RESPIRATORY (RR 45): This is a CRITICAL EMERGENCY. Suggest immediate stabilization, airway check, and oxygen. List potential differentials: Pulmonary Embolism, Acute Heart Failure, or Severe Pneumonia.
- HYPERTENSION (92 Diastolic): Refer to GHS Hypertension guidelines. Suggest repeating BP after rest and checking for end-organ damage (blurred vision, headache).
- OBESITY (BMI 58): Suggest long-term metabolic review and screening for Sleep Apnea.

RESPONSE STYLE:
- Be concise. Don't say "I'm ready to assist you" every time. 
- Use "Socratic Questioning": Ask the doctor about missing data (e.g., "Doctor, given the high RR, have you checked the SpO2 or Chest sounds?").
- Always end with the mandatory disclaimer: "I am an AI assistant. Final clinical decisions must be made by a licensed professional."`,
});

const clinicalAssistantFlow = ai.defineFlow(
  {
    name: 'clinicalAssistantFlow',
    inputSchema: ClinicalAssistantInputSchema,
    outputSchema: ClinicalAssistantOutputSchema,
  },
  async (input) => {
    const { output } = await clinicalAssistantPrompt(input);
    if (!output) {
      throw new Error('The AI failed to generate a response.');
    }
    return { text: output.text };
  }
);
