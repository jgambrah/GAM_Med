import { adminDb } from '@/firebase/admin';
import { Resend } from 'resend';
import { NextResponse } from 'next/server';

/**
 * == SaaS Lead Generation API ==
 * 
 * Captures "Request Demo" submissions from the landing page.
 * 1. Logs the prospect in the Firestore 'demo_requests' registry.
 * 2. Notifies the platform owner via email using Resend.
 */
export async function POST(req: Request) {
    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
        const { name, email, hospital, phone } = await req.json();

        // 1. Validate Environment
        if (!process.env.RESEND_API_KEY) {
            console.error("CRITICAL: RESEND_API_KEY is missing from process.env");
            return NextResponse.json({ error: "Email configuration missing" }, { status: 500 });
        }

        if (!adminDb) {
            console.error("CRITICAL: Firebase Admin SDK failed to initialize.");
            return NextResponse.json({ error: "Database connection failure" }, { status: 500 });
        }

        // 2. Save to Firestore (The Command Centre Source)
        // This allows the Super Admin to see the lead in their dashboard
        await adminDb.collection('demo_requests').add({
            name,
            email: email.toLowerCase().trim(),
            hospitalName: hospital,
            phone,
            status: 'Pending',
            requestedAt: new Date().toISOString(),
        });

        // 3. Send notification to the Platform Owner
        await resend.emails.send({
            // This MUST be onboarding@resend.dev until you verify a custom domain in the Resend dashboard
            from: 'GamMed System <onboarding@resend.dev>', 
            to: 'jamesgambrah@gmail.com',
            reply_to: email, 
            subject: `New Hospital Lead: ${hospital}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #2563eb;">New Demo Request</h2>
                    <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0 0 10px 0;"><strong>Hospital:</strong> ${hospital}</p>
                        <p style="margin: 0 0 10px 0;"><strong>Contact Name:</strong> ${name}</p>
                        <p style="margin: 0 0 10px 0;"><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
                        <p style="margin: 0;"><strong>Phone:</strong> ${phone}</p>
                    </div>
                    <p style="font-size: 0.8rem; color: #666;">
                        Log in to the GamMed Command Centre to review this lead and provision the new facility.
                    </p>
                </div>
            `
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("DEMO_REQUEST_API_ERROR:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
