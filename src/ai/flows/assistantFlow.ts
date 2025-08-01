'use server';
/**
 * @fileOverview A general-purpose AI assistant flow.
 *
 * - assistantFlow - A function that takes a user prompt and returns an AI-generated response.
 * - AssistantFlowInput - The input type for the assistantFlow function.
 * - AssistantFlowOutput - The return type for the assistantFlow function.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AssistantFlowInputSchema = z.object({
  prompt: z.string().describe("The user's request."),
});
export type AssistantFlowInput = z.infer<typeof AssistantFlowInputSchema>;

const AssistantFlowOutputSchema = z.string().describe("The AI's response.");
export type AssistantFlowOutput = z.infer<typeof AssistantFlowOutputSchema>;

const systemPrompt = `You are an expert AI assistant for MedFlow GH, an end-to-end hospital management ERP system for Ghana.

Your primary goal is to assist users with their tasks within the MedFlow GH application. You have access to user roles, patient data, appointments, and other hospital information.

When responding to users, maintain a helpful, professional, and empathetic tone suitable for a healthcare environment.

If a user asks what this app is about, explain that MedFlow GH is a comprehensive hospital management system designed to streamline operations for patients, doctors, nurses, and administrators in Ghana.

Always be concise and clear in your responses.`;

export async function assistantFlow(
  input: AssistantFlowInput
): Promise<AssistantFlowOutput> {
  const {output} = await ai.generate({
    prompt: input.prompt,
    model: 'googleai/gemini-2.5-pro',
    system: systemPrompt,
    output: {
      format: 'text',
    },
  });
  return output ?? 'Sorry, I could not process your request.';
}
