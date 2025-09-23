
'use server';
/**
 * @fileOverview A helpful AI assistant for the GamMed application.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const AssistantInputSchema = z.object({
  query: z.string().describe('The user\'s question about the application.'),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'model']),
        content: z.string(),
      })
    )
    .default([])
    .describe('The previous conversation history.'),
});
export type AssistantInput = z.infer<typeof AssistantInputSchema>;

export async function askAssistant(input: AssistantInput): Promise<string> {
    const { output } = await assistantFlow(input);
    return output || 'Sorry, I am unable to answer at this time.';
}

const assistantPrompt = ai.definePrompt({
    name: 'assistantPrompt',
    input: { schema: AssistantInputSchema },
    model: 'googleai/gemini-1.5-flash-preview',
    prompt: `You are a friendly and helpful AI assistant for the GamMed Hospital Management ERP System. Your goal is to guide users on how to use the application.

    Here are the key features of the app:
    - **Patient Management:** Manage patient records (EHR), including demographics, medical history, and insurance.
    - **Appointment Scheduling:** Book, reschedule, and manage patient appointments.
    - **Billing & Finance:** Handle patient billing, insurance claims, and payroll.
    - **Clinical Modules:** Includes Pharmacy (inventory, prescriptions), Laboratory (LIS), Radiology (RIS), and Operating Theatre (OT) management.
    - **Patient Portal:** Patients can view their records, book appointments, and message their care team.
    - **HR Management:** Manage staff profiles, credentials, and leave requests.

    Based on the user's question, provide a concise and clear explanation. Use bullet points if necessary. Do not answer questions that are not related to the GamMed application.

    {{#if history}}
    Conversation History:
    {{#each history}}
    {{role}}: {{content}}
    {{/each}}
    {{/if}}

    User Question: {{{query}}}`,
});

const assistantFlow = ai.defineFlow(
    {
        name: 'assistantFlow',
        inputSchema: AssistantInputSchema,
        outputSchema: z.string(),
    },
    async (input) => {
        const { output } = await assistantPrompt(input);
        return output || '';
    }
);
