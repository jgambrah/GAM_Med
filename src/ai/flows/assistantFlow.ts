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
  prompt: z.string().describe('The user\'s request.'),
});
export type AssistantFlowInput = z.infer<typeof AssistantFlowInputSchema>;

const AssistantFlowOutputSchema = z.string().describe('The AI\'s response.');
export type AssistantFlowOutput = z.infer<typeof AssistantFlowOutputSchema>;

export async function assistantFlow(
  input: AssistantFlowInput
): Promise<AssistantFlowOutput> {
  const {output} = await ai.generate({
    prompt: input.prompt,
    model: 'googleai/gemini-2.0-flash',
    output: {
      format: 'text',
    },
  });
  return output ?? 'Sorry, I could not process your request.';
}
