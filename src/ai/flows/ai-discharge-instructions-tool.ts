'use server';
/**
 * @fileOverview A Genkit flow for generating personalized patient discharge instructions.
 *
 * - generateDischargeInstructions - A function that generates patient discharge instructions.
 * - GenerateDischargeInstructionsInput - The input type for the generateDischargeInstructions function.
 * - GenerateDischargeInstructionsOutput - The return type for the generateDischargeInstructions function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateDischargeInstructionsInputSchema = z.object({
  patientName: z.string().describe('The full name of the patient.'),
  diagnosis: z.string().describe('The primary diagnosis of the patient.'),
  treatmentPlanSummary: z.string().describe('A summary of the treatment plan received by the patient during their stay.'),
  medications: z.array(z.string()).describe('A list of medications the patient needs to take post-discharge, including dosage and frequency. Each item should be a full medication instruction.'),
  followUpCare: z.string().describe('Details about follow-up appointments, including dates, times, and with whom.'),
  activityRestrictions: z.string().describe('Any physical activity restrictions or recommendations.'),
  dietaryRestrictions: z.string().optional().describe('Optional dietary restrictions or recommendations.'),
  additionalInstructions: z.string().optional().describe('Any other specific instructions for the patient or caregivers.'),
});
export type GenerateDischargeInstructionsInput = z.infer<typeof GenerateDischargeInstructionsInputSchema>;

const GenerateDischargeInstructionsOutputSchema = z.object({
  summary: z.string().describe('A concise overall summary of the discharge instructions, welcoming the patient home and wishing them a good recovery.'),
  medicationGuide: z.string().describe('Clear, easy-to-understand instructions on how to take each medication, potential common side effects, and what to do if a dose is missed. Format as a list of medication instructions.'),
  activityRecommendations: z.string().describe('Detailed guidance on activity levels, specific restrictions, recommendations for gentle exercises, and when to gradually resume normal activities.'),
  followUpAppointments: z.string().describe('Comprehensive information regarding all scheduled follow-up appointments, including dates, precise times, locations (e.g., clinic name, address), and the names of the doctors or specialists to see.'),
  warningSigns: z.string().describe('A critical list of symptoms or warning signs that require immediate medical attention, explaining what each sign might indicate and when to contact the hospital or doctor without delay.'),
  dietAndLifestyle: z.string().optional().describe('Personalized recommendations for diet, hydration, and other lifestyle modifications to support recovery, if applicable. Include specific foods to avoid or favor.'),
  emergencyContact: z.string().describe('Clear contact information for emergencies or urgent questions outside of business hours, including phone numbers for the hospital, clinic, or an on-call physician.'),
});
export type GenerateDischargeInstructionsOutput = z.infer<typeof GenerateDischargeInstructionsOutputSchema>;

export async function generateDischargeInstructions(input: GenerateDischargeInstructionsInput): Promise<GenerateDischargeInstructionsOutput> {
  return generateDischargeInstructionsFlow(input);
}

const dischargeInstructionsPrompt = ai.definePrompt({
  name: 'dischargeInstructionsPrompt',
  input: { schema: GenerateDischargeInstructionsInputSchema },
  output: { schema: GenerateDischargeInstructionsOutputSchema },
  prompt: `You are an AI assistant specialized in generating clear, comprehensive, and compassionate patient discharge instructions for medical staff. Your goal is to provide personalized, accurate, and compliant instructions based on the patient's Electronic Health Record (EHR) and treatment plan. Ensure the language is easy for patients and their caregivers to understand.\n\nPatient Name: {{{patientName}}}\nDiagnosis: {{{diagnosis}}}\nTreatment Plan Summary: {{{treatmentPlanSummary}}}\n\nMedications:\n{{#each medications}}\n- {{{this}}}\n{{/each}}\n\nFollow-Up Care: {{{followUpCare}}}\nActivity Restrictions/Recommendations: {{{activityRestrictions}}}\n\n{{#if dietaryRestrictions}}\nDietary Restrictions/Recommendations: {{{dietaryRestrictions}}}\n{{/if}}\n\n{{#if additionalInstructions}}\nAdditional Instructions: {{{additionalInstructions}}}\n{{/if}}\n\nPlease generate the discharge instructions in a structured format, focusing on the following sections:\n`,
});

const generateDischargeInstructionsFlow = ai.defineFlow(
  {
    name: 'generateDischargeInstructionsFlow',
    inputSchema: GenerateDischargeInstructionsInputSchema,
    outputSchema: GenerateDischargeInstructionsOutputSchema,
  },
  async (input) => {
    const { output } = await dischargeInstructionsPrompt(input);
    if (!output) {
      throw new Error('Failed to generate discharge instructions.');
    }
    return output;
  }
);
