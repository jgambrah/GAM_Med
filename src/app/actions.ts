'use server';

import { generateDischargeInstructions, GenerateDischargeInstructionsInput, GenerateDischargeInstructionsOutput } from '@/ai/flows/ai-discharge-instructions-tool';

type ActionResult = {
    success: boolean;
    data?: GenerateDischargeInstructionsOutput;
    error?: string;
};

export async function handleGenerateInstructions(input: GenerateDischargeInstructionsInput): Promise<ActionResult> {
    try {
        const output = await generateDischargeInstructions(input);
        return { success: true, data: output };
    } catch (error) {
        console.error('Error generating discharge instructions:', error);
        return { success: false, error: 'Failed to generate instructions. Please try again.' };
    }
}
