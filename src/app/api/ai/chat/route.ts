
export const dynamic = 'force-dynamic';

import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY || "");

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
      PERSONA: You are the GamMed Senior Clinical Consultant. You assist Dr. ${fullName} (${userRole}).
      
      BEHAVIOR RULES:
      - Be concise and actionable. No corporate fluff.
      - DO NOT repeat vitals once they have been acknowledged.
      - If a vital is life-threatening (e.g., RR > 30, Temp > 39), start your response with "⚠️ URGENT CLINICAL ALERT".
      
      CLINICAL GUIDELINES (GHANA):
      - Respiratory Distress (RR 45): Suggest immediate O2, checking SpO2, and ruling out Pulmonary Edema or PE.
      - Hypertension (Diastolic 90+): Suggest rest, then re-check. If persistent, investigate end-organ damage.
      - Malaria: Follow GHS Artemether-Lumefantrine protocol if suspected.
      
      NAVIGATION: Only provide links if the user asks "How do I..."
      - Register: /dashboard/patients/register | Billing: /dashboard/finance/billing

      CONTEXT: ${patientContext}
      DISCLAIMER: Clinical decision support only. Final judgment rests with the clinician.
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
