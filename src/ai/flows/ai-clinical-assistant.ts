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
    summary: z.string().describe("A concise clinical summary of the patient's recent history."),
    riskLevel: z.string().describe("The assessed risk level: Low, Medium, High, or Critical."),
    possibleConditions: z.array(z.string()).describe("A list of possible differential diagnoses based on the data."),
    keyConcerns: z.array(z.string()).describe("A bulleted list of the most important clinical concerns."),
    recommendations: z.array(z.string()).describe("A list of recommended next steps for the clinician."),
});
export type ClinicalAssistantOutput = z.infer<typeof ClinicalAssistantOutputSchema>;

export async function askClinicalAssistant(input: ClinicalAssistantInput): Promise<ClinicalAssistantOutput> {
  return clinicalAssistantFlow(input);
}

const systemInstruction = `You are an expert clinical decision support system integrated into a hospital EHR in Ghana.

Analyze the provided PATIENT_CONTEXT, which contains recent clinical encounters.

Based *only* on the provided data, you must:
1.  **Clinical Summary**: Write a concise, professional summary of the patient's recent history.
2.  **Possible Conditions**: List the top 2-3 differential diagnoses.
3.  **Risk Level**: Assign a risk level: Low, Medium, High, or Critical.
4.  **Key Clinical Concerns**: Identify the most pressing clinical issues.
5.  **Recommended Next Steps**: Suggest immediate, actionable steps for the doctor (e.g., "Repeat BP," "Order Chest X-Ray," "Consider specialist referral").

CONSTRAINTS:
- Output *must* be in the specified JSON format.
- Do not invent data. If data is missing, state it in your summary.
- Be conservative. Focus on decision support, not making a final, definitive diagnosis.
- Do not suggest specific drug prescriptions.
`;

const clinicalAssistantFlow = ai.defineFlow(
  {
    name: 'clinicalAssistantFlow',
    inputSchema: ClinicalAssistantInputSchema,
    outputSchema: ClinicalAssistantOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
      system: systemInstruction,
      prompt: `
        PATIENT_CONTEXT:
        ${input.patientContext}

        ---
        USER_QUERY (if any):
        ${input.prompt}
      `,
      output: { schema: ClinicalAssistantOutputSchema },
    });
    
    if (!output) {
      throw new Error('The AI failed to generate a response.');
    }
    return output;
  }
);
