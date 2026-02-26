import { adminDb } from '@/firebase/admin';
import { Resend } from 'resend';
import { NextResponse } from 'next/server';

/**
 * == Sales Lead Generation Endpoint ==
 * 
 * Captures demo requests from the landing page.
 * 1. Logs the prospect in the global Firestore registry.
 * 2. Notifies the Platform CEO via email.
 */
export async function POST(req: Request) {
    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
        const { name, email, hospital, phone } = await req.json();

        if (!process.env.RESEND_API_KEY) {
            console.error("ERROR: RESEND_API_KEY not found in environment.");
            return NextResponse.json({ error: "Configuration Error" }, { status: 500 });
        }

        // 1. Save to the Platform Command Centre
        await adminDb.collection('demo_requests').add({
            name,
            email: email.toLowerCase().trim(),
            hospitalName: hospital,
            phone,
            status: 'Pending',
            requestedAt: new Date().toISOString(),
        });

        // 2. Alert the CEO (The Gmail Hub)
        await resend.emails.send({
            from: 'GamMed System <onboarding@resend.dev>', 
            to: 'jamesgambrah@gmail.com', 
            reply_to: email,
            subject: `🚨 NEW DEMO REQUEST: ${hospital}`,
            html: `
                <div style="font-family: sans-serif; border: 1px solid #e2e8f0; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #2563eb;">New Sales Lead from Landing Page</h2>
                    <p><strong>Hospital:</strong> ${hospital}</p>
                    <p><strong>Contact Person:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Phone:</strong> ${phone}</p>
                    <hr style="border: none; border-top: 1px solid #eee;" />
                    <p style="font-size: 12px; color: #64748b;">
                        Log in to your Command Centre to provision this hospital account.
                    </p>
                </div>
            `
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("DEMO_REQUEST_API_CRASH:", error.message);
        return NextResponse.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
}
