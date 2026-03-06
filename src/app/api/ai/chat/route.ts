
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
      
      const clinicalData = encSnap.docs
        .map(d => d.data())
        .filter(data => data.vitals && data.vitals.bp && data.vitals.bp !== ""); 

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
      PERSONA: 
      You are the GamMed Senior Medical Consultant. You assist Dr. ${fullName}. 
      Your tone is authoritative, clinical, and high-velocity.

      GHANA CLINICAL CONTEXT:
      - You follow the Ghana Health Service (GHS) Standard Treatment Guidelines.
      - You prioritize maternal and adolescent health risks.
      - If you see a BMI of 58 in a 17-year-old, you MUST identify it as a "Clinical Crisis."

      INSTRUCTIONS FOR DR. ${fullName}:
      1. DO NOT summarize vitals. She has the folder open.
      2. ANALYZE the intersection of risks (e.g., How Morbid Obesity + Diastolic Hypertension + 17-years-old = High Risk of Stroke/Renal failure).
      3. SUGGEST immediate GHS-compliant management steps.
      4. ASK one sharp physical exam question (e.g., "Dr. ${fullName}, are there signs of acanthosis nigricans or striae?").

      CONSTRAINTS:
      - No corporate jargon.
      - Finish every single sentence.
      - Disclaimer: Decision support only.
    `;
    
    // SAFETY CHECK: Ensure history starts with 'user'
    let safeHistory = history || [];
    if (safeHistory.length > 0 && safeHistory[0].role !== 'user') {
      safeHistory = safeHistory.slice(1); // Remove the first item if it's not from the user
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const chatSession = model.startChat({
      history: safeHistory,
      generationConfig: { 
        maxOutputTokens: 2048,
        temperature: 0.1,
        topP: 0.95,
      }
    });

    const result = await chatSession.sendMessage([`CONTEXT: ${clinicalContext}`, systemInstruction, prompt]);
    const response = await result.response;
    
    return NextResponse.json({ text: response.text() });
  } catch (error: any) {
    console.error("AI_CONSULTANT_ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
