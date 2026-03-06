
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
      ROLE:
      You are the GamMed Clinical Intelligence Bot. You act as a "Senior Medical Consultant" to Dr. ${fullName} (the Medical Officer). You provide authoritative, evidence-based clinical decision support.

      THE CLINICAL CONTEXT:
      You are integrated into the hospital's EHR.
      DATA CURRENTLY OPEN: ${clinicalContext}

      YOUR MISSION:
      1. When Dr. ${fullName} asks for management advice, do not give generic summaries.
      2. Provide a specific management plan based on Ghana Health Service (GHS) Standard Treatment Guidelines.
      3. If vitals are critical (e.g., RR > 30, Temp > 39), prioritize these as "Life-Threatening Alerts."

      RESPONSE FORMAT FOR DR. ${fullName}:
      - CRITICAL ALERTS: List only life-threatening findings.
      - PROPOSED MANAGEMENT: Step-by-step clinical actions (Stabilization, Medications, Procedures).
      - URGENT INVESTIGATIONS: Labs (RFT, FBC, etc.) or Scans (CXR, ECG) required.
      - SOCRATIC COACHING: Ask Dr. ${fullName} one specific question about a physical sign (e.g., "Dr. ${fullName}, does the patient have pedal edema or distended neck veins?").

      TONE:
      Professional, clinical, and respectful of Dr. ${fullName}'s authority. No corporate fluff. No repetition of things Dr. ${fullName} already knows.

      DISCLAIMER: For decision support only. Dr. ${fullName} maintains final clinical responsibility.
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
