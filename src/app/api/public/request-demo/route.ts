import { getAdminDb } from '@/firebase/admin';
import { Resend } from 'resend';
import { NextResponse } from 'next/server';

/**
 * == Professional Lead Capture API ==
 * 
 * Securely logs landing page demo requests to Firestore and notifies the Platform Owner.
 * Designed to handle build-time static analysis gracefully.
 */
export async function POST(req: Request) {
    const db = getAdminDb();
    const resendKey = process.env.RESEND_API_KEY;

    if (!db) {
        console.error("DEMO_REQUEST_FAILURE: Firestore Admin service unavailable.");
        return NextResponse.json({ error: "Database service unavailable" }, { status: 503 });
    }

    if (!resendKey) {
        console.error("DEMO_REQUEST_FAILURE: RESEND_API_KEY is missing from environment.");
        return NextResponse.json({ error: "Email configuration missing" }, { status: 500 });
    }

    const resend = new Resend(resendKey);

    try {
        const body = await req.json();
        const { name, email, hospital, phone } = body;

        console.log(`Processing demo request for: ${hospital}`);

        // 1. Log to the Platform Lead Registry
        await db.collection('demo_requests').add({
            name,
            email: email.toLowerCase(),
            hospitalName: hospital,
            phone,
            status: 'Pending',
            requestedAt: new Date().toISOString(),
        });

        // 2. Notify the CEO via stylized email
        // Uses the onboarding verified sender for reliability
        await resend.emails.send({
            from: 'GamMed Leads <onboarding@resend.dev>', 
            to: 'jamesgambrah@gmail.com', // CEO Hub
            reply_to: email, 
            subject: `🚨 NEW DEMO REQUEST: ${hospital}`,
            html: `
                <div style="font-family: sans-serif; border: 1px solid #e2e8f0; padding: 24px; border-radius: 12px; max-width: 600px;">
                    <h2 style="color: #2563eb; margin-bottom: 16px;">New Hospital Sales Lead</h2>
                    <p style="font-size: 16px; margin-bottom: 8px;"><strong>Facility:</strong> ${hospital}</p>
                    <p style="font-size: 16px; margin-bottom: 8px;"><strong>Contact:</strong> ${name}</p>
                    <p style="font-size: 16px; margin-bottom: 8px;"><strong>Email:</strong> ${email}</p>
                    <p style="font-size: 16px; margin-bottom: 24px;"><strong>Phone:</strong> ${phone}</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin-bottom: 16px;" />
                    <p style="font-size: 12px; color: #64748b;">
                        Log in to the Command Centre to provision this tenant dashboard.
                    </p>
                </div>
            `
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("DEMO_REQUEST_CRASH:", error.message);
        return NextResponse.json({ error: "Internal Server Error", detail: error.message }, { status: 500 });
    }
}
