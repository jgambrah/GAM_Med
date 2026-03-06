
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
    
    let clinicalContext = "No patient file open.";

    // 1. THE AGGRESSIVE FETCH & FILTER:
    if (patientId) {
      const encSnap = await adminDb.collectionGroup("encounters")
        .where("patientId", "==", patientId)
        .orderBy("createdAt", "desc")
        .limit(5) 
        .get();
      
      // FILTER: Only send records to Gemini that actually have vitals data
      const clinicalData = encSnap.docs
        .map(d => d.data())
        .filter(data => data.vitals && data.vitals.bp && data.vitals.bp !== ""); // Ignore placeholders

      if (clinicalData.length > 0) {
        const latest = clinicalData[0];
        clinicalContext = `
          LATEST VALID CLINICAL DATA:
          - Date: ${latest.createdAt?.toDate().toDateString()}
          - Vitals: BP ${latest.vitals.bp}, Temp ${latest.vitals.temp}°C, Pulse ${latest.vitals.pulse}bpm, Weight ${latest.vitals.weight}kg, BMI ${latest.vitals.bmi}.
          - Chief Complaint: ${latest.chiefComplaint || 'No notes'}
          - Diagnosis: ${latest.diagnosis || 'No diagnosis'}
          - Signed by: ${latest.providerName}
        `;
      }
    }

    // 2. THE COMMANDING SYSTEM PROMPT
    const systemInstruction = `
      You are the GamMed AI Clinical Assistant. 
      You are NOT a generic AI. You ARE integrated into the hospital's EHR.
      
      CURRENT PATIENT FILE: ${clinicalContext}
      
      INSTRUCTIONS:
      - If a patientId is present, you MUST acknowledge the vitals listed above immediately.
      - NEVER say "I do not have access to folders." You have been provided the data in this prompt.
      - If you see a Respiration Rate (RR) over 30, you must treat this as an EMERGENCY.
      - Assist Dr. ${fullName} by summarizing the history found in the "LATEST PATIENT DATA" block.
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const chatSession = model.startChat({
      history: history || [],
      generationConfig: { maxOutputTokens: 800 }
    });

    const result = await chatSession.sendMessage([systemInstruction, prompt]);
    const response = await result.response;
    
    return NextResponse.json({ text: response.text() });
  } catch (error: any) {
    console.error("AI_CONSULTANT_ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
