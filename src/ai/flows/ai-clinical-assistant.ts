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

// STEP 1: New stricter JSON output schema
const ClinicalAssistantOutputSchema = z.object({
    summary: z.string().describe("A concise clinical summary of the patient's recent history."),
    riskLevel: z.enum(["Low", "Medium", "High", "Critical"]).describe("The assessed risk level."),
    possibleConditions: z.array(z.string()).describe("A list of possible differential diagnoses based on the data."),
    keyFindings: z.array(z.string()).describe("A bulleted list of the most important clinical findings from the data."),
    concerns: z.array(z.string()).describe("A bulleted list of potential clinical concerns or risks."),
    recommendations: z.array(z.string()).describe("A list of recommended next steps for the clinician."),
    dataQualityFlags: z.array(z.string()).describe("A list of potential data quality issues, like 'POSSIBLE_SENSOR_ERROR_OR_DATA_ENTRY_ERROR' for SpO2 < 50."),
});
export type ClinicalAssistantOutput = z.infer<typeof ClinicalAssistantOutputSchema>;

export async function askClinicalAssistant(input: ClinicalAssistantInput): Promise<ClinicalAssistantOutput> {
  return clinicalAssistantFlow(input);
}

// STEP 1: Stricter system prompt
const systemInstruction = `You are a hospital-grade Clinical Decision Support AI.

CRITICAL RULES:
- ONLY use the provided patient data.
- DO NOT assume missing values. If data is missing, explicitly say "Not available" in your summary.
- DO NOT fabricate diagnoses or vitals.
- If a value looks clinically impossible (e.g., SpO2 < 50%), flag it in the "dataQualityFlags" array as 'POSSIBLE_SENSOR_OR_DATA_ENTRY_ERROR'.
- Your entire output MUST be a single, valid JSON object that conforms to the provided schema. Do not wrap it in markdown or add any extra text.

You will answer the user's query based on the provided context. First, analyze the patient data to provide a structured clinical assessment, then use that assessment to answer the user's specific question.
`;

const clinicalAssistantFlow = ai.defineFlow(
  {
    name: 'clinicalAssistantFlow',
    inputSchema: ClinicalAssistantInputSchema,
    outputSchema: ClinicalAssistantOutputSchema,
  },
  async (input) => {
    // STEP 3: Controlled temperature
    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      system: systemInstruction,
      history: input.history,
      prompt: `
        PATIENT_CONTEXT:
        ${input.patientContext}

        ---
        USER_QUERY:
        ${input.prompt}
      `,
      output: { schema: ClinicalAssistantOutputSchema },
      config: {
        temperature: 0.2,
      },
    });
    
    if (!output) {
      throw new Error('AI output failed validation or was empty.');
    }

    return output;
  }
);
