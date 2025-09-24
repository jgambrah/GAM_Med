
'use server';
/**
 * @fileOverview A helpful AI assistant for the GamMed application.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// This is the correct message type for the conversation history
type Message = {
    role: 'user' | 'model';
    content: string;
};


// This function is the main entry point called by the client.
export async function askAssistant(
  query: string,
  history: Message[]
): Promise<string> {
  const response = await assistantFlow({ query, history });
  return response || 'Sorry, I am unable to answer at this time.';
}

const assistantFlow = ai.defineFlow(
  {
    name: 'assistantFlow',
    inputSchema: z.object({
      query: z.string(),
      history: z.array(z.object({
        role: z.enum(['user', 'model']),
        content: z.string()
      }))
    }),
    outputSchema: z.string(),
  },
  async ({ query, history }) => {
    const result = await ai.generate({
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

User Question: ${query}`,
      history: history,
    });

    return result.text;
  }
);
