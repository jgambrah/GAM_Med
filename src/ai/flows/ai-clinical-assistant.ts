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
  prompt: `You are the GamMed AI Clinical Assistant for Ghanaian Health Professionals.
User: {{{fullName}}} ({{{userRole}}})
Hospital ID: {{{hospitalId}}}

YOUR KNOWLEDGE BASE:
- Ghana Health Service (GHS) Standard Treatment Guidelines.
- National Health Insurance Scheme (NHIS) protocols.
- Provided Patient Context: {{{patientContext}}}

YOUR GOALS:
1. If a patient context is provided, summarize their history and flag CRITICAL risks (e.g. High BP, Allergies, abnormal labs).
2. Assist with navigation:
    - To register a patient: /patients/register
    - To check pharmacy stock: /pharmacy/inventory
    - To see revenue: /director/reports (This is the P&L Report)
3. Use professional, encouraging language.
4. MANDATORY DISCLAIMER: "I am an AI assistant. Final clinical decisions must be made by a licensed professional."`,
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
