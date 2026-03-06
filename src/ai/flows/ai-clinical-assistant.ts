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

const HistoryPartSchema = z.object({
  role: z.enum(['user', 'model']),
  parts: z.array(z.object({ text: z.string() })),
});

const ClinicalAssistantInputSchema = z.object({
  prompt: z.string().describe("The user's query to the assistant."),
  patientContext: z.string().describe("A JSON string of the patient's recent encounters and lab results."),
  userRole: z.string().describe('The role of the user asking the question.'),
  fullName: z.string().describe('The full name of the user.'),
  hospitalId: z.string().describe('The ID of the hospital the user belongs to.'),
  history: z.array(HistoryPartSchema).optional().describe('The conversation history.'),
});
export type ClinicalAssistantInput = z.infer<typeof ClinicalAssistantInputSchema>;

const ClinicalAssistantOutputSchema = z.object({
  text: z.string().describe('The AI-generated response.'),
});
export type ClinicalAssistantOutput = z.infer<typeof ClinicalAssistantOutputSchema>;

export async function askClinicalAssistant(input: ClinicalAssistantInput): Promise<ClinicalAssistantOutput> {
  return clinicalAssistantFlow(input);
}

const systemInstruction = `You are the GamMed Clinical Co-Pilot, a high-level medical consultant assistant in Ghana.

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
- Always end with the mandatory disclaimer: "I am an AI assistant. Final clinical decisions must be made by a licensed professional."`;

const clinicalAssistantFlow = ai.defineFlow(
  {
    name: 'clinicalAssistantFlow',
    inputSchema: ClinicalAssistantInputSchema,
    outputSchema: ClinicalAssistantOutputSchema,
  },
  async (input) => {
    // Dynamic context information to be provided with each prompt.
    const dynamicContext = `
      User: ${input.fullName} (${input.userRole})
      Hospital ID: ${input.hospitalId}
      Provided Patient Context: ${input.patientContext}
    `;

    const { output } = await ai.generate({
      system: systemInstruction, // Static system-level instructions
      prompt: `${dynamicContext}\n\nUser Query: ${input.prompt}`, // Dynamic context combined with the user's latest question
      history: input.history, // The previous turns of the conversation
      output: { schema: ClinicalAssistantOutputSchema },
    });
    
    if (!output) {
      throw new Error('The AI failed to generate a response.');
    }
    return { text: output.text };
  }
);
