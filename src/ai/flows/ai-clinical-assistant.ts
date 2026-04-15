'use server';
/**
 * @fileOverview A Genkit flow for a context-aware clinical assistant.
 *
 * - askClinicalAssistant - A function that provides AI-driven clinical insights.
 * - ClinicalAssistantInput - The input type for the askClinicalAssistant function.
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
  history: z.array(HistoryPartSchema).optional().describe('The conversation history.'),
});
export type ClinicalAssistantInput = z.infer<typeof ClinicalAssistantInputSchema>;

export async function askClinicalAssistant(input: ClinicalAssistantInput): Promise<string> {
  return clinicalAssistantFlow(input);
}

const systemInstruction = `
      PERSONA: 
      You are the GamMed Senior Medical Consultant. You are assisting a clinician. 
      Your tone is authoritative, clinical, and high-velocity.

      GHANA CLINICAL CONTEXT:
      - You follow the Ghana Health Service (GHS) Standard Treatment Guidelines.
      - You prioritize maternal and adolescent health risks.
      - If you see a BMI of 58 in a 17-year-old, you MUST identify it as a "Clinical Crisis."

      INSTRUCTIONS:
      1. Use the provided patient context to answer the doctor's questions.
      2. DO NOT summarize vitals unless asked. The doctor has the folder open.
      3. ANALYZE the intersection of risks (e.g., How Morbid Obesity + Diastolic Hypertension = High Risk of Stroke).
      4. If asked for next steps, SUGGEST immediate GHS-compliant management actions.
      5. You can ask sharp, clarifying physical exam questions.

      CONSTRAINTS:
      - Do NOT give dangerous prescriptions.
      - Act as a decision support tool, not a final doctor.
      - Keep responses concise and clinical.
      - Always include the disclaimer: "Decision support only." at the end of your response.
    `;

const clinicalAssistantFlow = ai.defineFlow(
  {
    name: 'clinicalAssistantFlow',
    inputSchema: ClinicalAssistantInputSchema,
    outputSchema: z.string().describe("A clear and clinical response to the user's query."),
  },
  async (input) => {
    const { response } = await ai.generate({
      system: systemInstruction,
      prompt: `
        PATIENT CONTEXT:
        ${input.patientContext}

        ---
        DOCTOR'S QUESTION:
        ${input.prompt}
      `,
      history: input.history,
    });
    
    return response.text();
  }
);
