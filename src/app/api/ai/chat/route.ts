import { NextResponse } from 'next/server';

// This is a placeholder API route to fix a build error.
// The actual AI chat functionality is handled via a Server Action.
export async function POST(request: Request) {
  return NextResponse.json(
    { error: 'This endpoint is not used. Use the `askClinicalAssistant` server action instead.' },
    { status: 404 }
  );
}
