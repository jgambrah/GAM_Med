
'use server';

/**
 * @fileOverview Generates a patient discharge summary using AI.
 *
 * This file defines a Genkit flow that takes a series of clinical notes
 * and synthesizes them into a structured discharge summary, including a
 * professional clinical overview and patient-friendly instructions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Define the schema for the clinical notes that will be passed into the flow.
const ClinicalNoteSchema = z.object({
    author: z.string().describe('The name of the person who wrote the note (e.g., Dr. Evelyn Mensah).'),
    date: z.string().describe('The ISO 8601 timestamp of when the note was written.'),
    content: z.string().describe('The text content of the clinical note.'),
});

// Define the input schema for the main flow. It expects an array of clinical notes.
const GenerateDischargeSummaryInputSchema = z.object({
  clinicalNotes: z.array(ClinicalNoteSchema),
});
export type GenerateDischargeSummaryInput = z.infer<typeof GenerateDischargeSummaryInputSchema>;

// Define the output schema for the flow. This ensures the AI returns data in a structured format.
const GenerateDischargeSummaryOutputSchema = z.object({
  clinicalSummary: z.string().describe('A comprehensive clinical summary of the patient admission, suitable for medical records. It should synthesize all provided notes into a coherent narrative, including diagnosis, treatment, and outcome.'),
  patientInstructions: z.string().describe('A list of clear, simple, and actionable discharge instructions for the patient. Use bullet points or numbered lists. Address the patient directly.'),
});
export type GenerateDischargeSummaryOutput = z.infer<typeof GenerateDischargeSummaryOutputSchema>;


/**
 * The main exported function that clients will call.
 * It triggers the Genkit flow to generate the discharge summary.
 * @param input The patient's clinical notes.
 * @returns A promise that resolves to the generated summary and instructions.
 */
export async function generateDischargeSummary(input: GenerateDischargeSummaryInput): Promise<GenerateDischargeSummaryOutput> {
  return generateDischargeSummaryFlow(input);
}


// Define the prompt for the AI model.
const dischargeSummaryPrompt = ai.definePrompt({
  name: 'dischargeSummaryPrompt',
  input: { schema: GenerateDischargeSummaryInputSchema },
  output: { schema: GenerateDischargeSummaryOutputSchema },
  model: 'googleai/gemini-1.5-flash-preview',
  // The prompt uses Handlebars templating to format the input data.
  prompt: `
    You are an expert medical assistant responsible for writing discharge summaries.
    Based on the following clinical notes, please generate a comprehensive clinical summary and a set of clear, patient-friendly discharge instructions.

    Clinical Notes:
    {{#each clinicalNotes}}
    - Note by {{author}} on {{date}}:
      {{content}}
    
    {{/each}}

    Please provide the output in the required structured format.
  `,
});


// Define the Genkit flow.
const generateDischargeSummaryFlow = ai.defineFlow(
  {
    name: 'generateDischargeSummaryFlow',
    inputSchema: GenerateDischargeSummaryInputSchema,
    outputSchema: GenerateDischargeSummaryOutputSchema,
  },
  async (input) => {
    // Execute the prompt with the provided input.
    const { output } = await dischargeSummaryPrompt(input);
    
    // The flow must return a value that matches the output schema.
    // The exclamation mark asserts that 'output' will not be null.
    return output!;
  }
);
