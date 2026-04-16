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

// --- SCHEMAS AND TYPES ---

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
    riskLevel: z.enum(["Low", "Medium", "High", "Critical"]).describe("The assessed risk level."),
    possibleConditions: z.array(z.string()).describe("A list of possible differential diagnoses based on the data."),
    keyFindings: z.array(z.string()).describe("A bulleted list of the most important clinical findings from the data."),
    concerns: z.array(z.string()).describe("A bulleted list of potential clinical concerns or risks."),
    recommendations: z.array(z.string()).describe("A list of recommended next steps for the clinician."),
    dataQualityFlags: z.array(z.string()).describe("A list of potential data quality issues, like 'POSSIBLE_SENSOR_ERROR_OR_DATA_ENTRY_ERROR' for SpO2 < 50."),
});
export type ClinicalAssistantOutput = z.infer<typeof ClinicalAssistantOutputSchema>;

// --- SYSTEM PROMPT ---

const systemInstruction = `
You are a hospital-grade Clinical Decision Support AI.

CRITICAL RULES:
- ONLY use the provided patient data.
- DO NOT assume missing values. If data is missing, explicitly say "Not available" in the summary.
- DO NOT fabricate diagnoses or vitals.
- If a value looks clinically impossible (e.g., SpO2 < 50%), flag it in the "dataQualityFlags" array as 'POSSIBLE_SENSOR_OR_DATA_ENTRY_ERROR'.
- Your entire output MUST be a single, valid JSON object that conforms to the provided schema. Do not wrap it in markdown or add any extra text.

Return format:
{
  "summary": string,
  "riskLevel": "Low" | "Medium" | "High" | "Critical",
  "possibleConditions": string[],
  "keyFindings": string[],
  "concerns": string[],
  "recommendations": string[],
  "dataQualityFlags": string[]
}

RETURN JSON ONLY.
If you cannot comply, return BEST POSSIBLE STRUCTURED TEXT.
`;


// --- HARDENING FUNCTIONS ---

const generateWithFallback = async (config: any) => {
  try {
    // Primary (high intelligence)
    return await ai.generate({
      ...config,
      model: 'googleai/gemini-3-flash-preview',
    });
  } catch (error) {
    console.warn("Primary model failed, switching to Flash...", error);

    // Fallback (fast + reliable)
    return await ai.generate({
      ...config,
      model: 'googleai/gemini-3-flash-preview',
    });
  }
};

const generateWithRetry = async (fn: () => Promise<any>, retries = 2) => {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries) throw err;
      console.log(`AI call failed, retry ${i + 1}...`);
      await new Promise(res => setTimeout(res, 500 * (i + 1))); // exponential backoff
    }
  }
};

const extractJSON = (text: string): any | null => {
  try {
    const cleaned = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {}
    }
    return null;
  }
};

const recoverAIOutput = (text: string): ClinicalAssistantOutput => {
  return {
    summary: text,
    riskLevel: "Critical",
    possibleConditions: [],
    keyFindings: [],
    concerns: ["Unstructured AI response"],
    recommendations: ["Review AI summary manually"],
    dataQualityFlags: ["FALLBACK_MODE"]
  };
};

const validateAIOutput = (output: any): output is ClinicalAssistantOutput => {
  if (!output) return false;
  const allowedRisks = ["Low", "Medium", "High", "Critical"];
  
  const hasSummary = typeof output.summary === 'string';
  const hasValidRisk = typeof output.riskLevel === 'string' && allowedRisks.includes(output.riskLevel);
  const hasPossibleConditions = Array.isArray(output.possibleConditions);
  const hasKeyFindings = Array.isArray(output.keyFindings);
  const hasConcerns = Array.isArray(output.concerns);
  const hasRecommendations = Array.isArray(output.recommendations);
  const hasDataQualityFlags = Array.isArray(output.dataQualityFlags);

  return hasSummary && hasValidRisk && hasPossibleConditions && hasKeyFindings && hasConcerns && hasRecommendations && hasDataQualityFlags;
};

const runSafeAI = async (config: any): Promise<ClinicalAssistantOutput> => {
  const result = await generateWithRetry(() => generateWithFallback(config));

  // If Genkit provides a parsed output, try to validate it directly.
  if (result.output && validateAIOutput(result.output)) {
    return result.output as ClinicalAssistantOutput;
  }

  // If no structured output, get the raw text.
  const rawText = result.text;
  if (!rawText) {
    return {
      summary: 'AI system failed to generate any output.',
      riskLevel: 'Critical',
      possibleConditions: [],
      keyFindings: [],
      concerns: ['AI_SYSTEM_NO_RESPONSE'],
      recommendations: ['Manual clinical review is required due to AI system error.'],
      dataQualityFlags: ['AI_NO_OUTPUT'],
    };
  }

  // Try to parse the raw text if we didn't get a valid structured output.
  const parsed = extractJSON(rawText);

  if (parsed && validateAIOutput(parsed)) {
    return parsed as ClinicalAssistantOutput;
  }

  console.warn("AI JSON failed validation or parsing, recovering with raw output");
  return recoverAIOutput(rawText);
};


// --- MAIN FLOW ---

export async function askClinicalAssistant(input: ClinicalAssistantInput): Promise<ClinicalAssistantOutput> {
  return clinicalAssistantFlow(input);
}

const clinicalAssistantFlow = ai.defineFlow(
  {
    name: 'clinicalAssistantFlow',
    inputSchema: ClinicalAssistantInputSchema,
    outputSchema: ClinicalAssistantOutputSchema,
  },
  async (input) => {
    const config = {
      system: systemInstruction,
      prompt: `
        PATIENT_CONTEXT:
        ${input.patientContext}

        ---
        USER_QUERY:
        ${input.prompt}
      `,
      config: {
        temperature: 0.2,
      },
    };
    
    const output = await runSafeAI(config);
    return output;
  }
);
