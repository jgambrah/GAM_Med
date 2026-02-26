import { NextResponse } from 'next/server';
import { sendDemoRequestEmail } from '@/lib/mail-service';

/**
 * == Public Lead Capture Endpoint ==
 * 
 * Securely processes demo requests from the landing page.
 * Triggers an email notification to the platform owner using Resend.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, email, hospital, phone } = body;

        if (!name || !email || !hospital || !phone) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Trigger secure server-side email dispatch
        const result = await sendDemoRequestEmail({ name, email, hospital, phone });

        if (result.success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: "Email dispatch failed" }, { status: 500 });
        }
    } catch (error: any) {
        console.error("Demo request API error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
