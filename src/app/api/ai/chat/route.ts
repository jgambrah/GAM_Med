import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { prompt, patientId, userRole } = await req.json();
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent([
      `You are the GamMed AI Clinical Assistant. Role: ${userRole}. Patient context: ${patientId || 'None'}`,
      prompt
    ]);
    
    const response = await result.response;
    return NextResponse.json({ text: response.text() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
