
export const dynamic = 'force-dynamic';

import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

const apiKey = process.env.GOOGLE_GENAI_API_KEY;

if (!apiKey) {
  console.error("❌ MISSING AI API KEY: Ensure GOOGLE_GENAI_API_KEY is set in Vercel.");
}

const genAI = new GoogleGenerativeAI(apiKey || "NO_KEY_DETECTED");

export async function POST(req: Request) {
  try {
    const { prompt, history, patientId, userRole, fullName } = await req.json();
    
    // 1. DYNAMIC CONTEXT RETRIEVAL
    let patientContext = "No patient file open.";
    if (patientId) {
      const encSnap = await adminDb.collectionGroup("encounters")
        .where("patientId", "==", patientId)
        .orderBy("createdAt", "desc").limit(3).get();
      
      const clinicalData = encSnap.docs.map(d => ({
        vitals: d.data().vitals,
        notes: d.data().chiefComplaint,
        diagnosis: d.data().diagnosis
      }));
      patientContext = JSON.stringify(clinicalData);
    }

    // 2. THE HIGH-GRADE SYSTEM PROMPT
    const systemInstruction = `
      You are the GamMed Clinical Co-Pilot, a high-level medical consultant assistant in Ghana.
      
      CONTEXT MANAGEMENT:
      - If the user acknowledges a summary, DO NOT repeat the vitals again. Move to the next clinical step.
      - Only show "Navigation Assistance" if the user specifically asks "How do I..." or "Where is...".

      CLINICAL PROTOCOLS (Ghana Health Service Standard):
      - RESPIRATORY (RR 45): This is a CRITICAL EMERGENCY. Suggest immediate stabilization, airway check, and oxygen. List potential differentials: Pulmonary Embolism, Acute Heart Failure, or Severe Pneumonia.
      - HYPERTENSION (92 Diastolic): Refer to GHS Hypertension guidelines. Suggest repeating BP after rest and checking for end-organ damage (blurred vision, headache).
      - OBESITY (BMI 58): Suggest long-term metabolic review and screening for Sleep Apnea.

      RESPONSE STYLE:
      - Be concise. Don't say "I'm ready to assist you" every time. 
      - Use "Socratic Questioning": Ask the doctor about missing data (e.g., "Doctor, given the high RR, have you checked the SpO2 or Chest sounds?").
      - Always end with the mandatory disclaimer: "I am an AI assistant. Final clinical decisions must be made by a licensed professional."
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // 3. START CONVERSATION WITH HISTORY (Memory)
    const chatSession = model.startChat({
      history: history || [], // This allows the bot to remember the last few messages
      generationConfig: { maxOutputTokens: 500 }
    });

    const result = await chatSession.sendMessage([systemInstruction, prompt]);
    const response = await result.response;
    
    return NextResponse.json({ text: response.text() });
  } catch (error: any) {
    console.error("AI_CONSULTANT_ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
