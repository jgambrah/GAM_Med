import { adminDb } from '@/firebase/admin';
import { Resend } from 'resend';
import { NextResponse } from 'next/server';

/**
 * == SaaS Lead Capture API (Gmail Hub) ==
 * 
 * Securely logs prospective hospital leads to Firestore and 
 * notifies the platform owner via Gmail. Optimized for Resend onboarding.
 */
export async function POST(req: Request) {
    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
        const { name, email, hospital, phone } = await req.json();

        // 1. Validate Configuration
        if (!process.env.RESEND_API_KEY) {
            console.error("ERROR: RESEND_API_KEY not found in environment.");
            return NextResponse.json({ error: "Configuration Error" }, { status: 500 });
        }

        if (!adminDb) {
            console.error("ERROR: Firebase Admin SDK not initialized.");
            return NextResponse.json({ error: "Database Error" }, { status: 500 });
        }

        // 2. Save to Firestore (The Command Centre Source)
        await adminDb.collection('demo_requests').add({
            name,
            email: email.toLowerCase().trim(),
            hospitalName: hospital,
            phone,
            status: 'Pending',
            requestedAt: new Date().toISOString(),
        });

        // 3. Send the Lead to Gmail
        await resend.emails.send({
            from: 'GamMed System <onboarding@resend.dev>', 
            to: 'jamesgambrah@gmail.com',
            reply_to: email,
            subject: `🚨 NEW DEMO REQUEST: ${hospital}`,
            html: `
                <div style="font-family: sans-serif; border: 1px solid #e2e8f0; padding: 20px; border-radius: 10px; color: #334155;">
                    <h2 style="color: #2563eb; margin-top: 0;">New Sales Lead</h2>
                    <p style="margin: 5px 0;"><strong>Hospital:</strong> ${hospital}</p>
                    <p style="margin: 5px 0;"><strong>Contact:</strong> ${name}</p>
                    <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
                    <p style="margin: 5px 0;"><strong>Phone:</strong> ${phone}</p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #64748b; text-align: center;">
                        Log in to the GamMed Command Centre to provision this facility.
                    </p>
                </div>
            `
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("API_ROUTE_CRASH:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
