import { adminDb } from '@/firebase/admin';
import { Resend } from 'resend';
import { NextResponse } from 'next/server';

/**
 * == Lead Capture API: The Gmail Hub ==
 * 
 * Securely captures prospective hospital leads from the landing page.
 * 1. Logs lead to Firestore for platform-wide analytics.
 * 2. Triggers an email alert to the platform owner via Resend.
 */
export async function POST(req: Request) {
    // 1. Initialize Resend inside the function to ensure it picks up .env.local
    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
        const { name, email, hospital, phone } = await req.json();

        // 2. Validate Key exists
        if (!process.env.RESEND_API_KEY) {
            console.error("ERROR: RESEND_API_KEY not found in .env.local");
            return NextResponse.json({ error: "Configuration Error" }, { status: 500 });
        }

        // 3. Save to Firestore (The Command Centre Source)
        // Uses the build-safe adminDb singleton
        if (adminDb) {
            await adminDb.collection('demo_requests').add({
                name,
                email: email.toLowerCase().trim(),
                hospitalName: hospital,
                phone,
                status: 'Pending',
                requestedAt: new Date().toISOString(),
            });
        }

        // 4. Send the Lead Notification to the Platform Hub (jamesgambrah@gmail.com)
        await resend.emails.send({
            // Note: You CANNOT send FROM your personal gmail via Resend.
            // You must use onboarding@resend.dev or a verified domain.
            from: 'GamMed System <onboarding@resend.dev>', 
            to: 'jamesgambrah@gmail.com', // Primary Lead Recipient
            reply_to: email, // Direct reply to the prospective client
            subject: `🚨 NEW DEMO REQUEST: ${hospital}`,
            html: `
                <div style="font-family: sans-serif; border: 1px solid #e2e8f0; padding: 20px; border-radius: 10px; line-height: 1.6;">
                    <h2 style="color: #2563eb; margin-bottom: 20px;">New Sales Lead from Landing Page</h2>
                    <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                        <p style="margin: 0 0 10px 0;"><strong>Hospital:</strong> ${hospital}</p>
                        <p style="margin: 0 0 10px 0;"><strong>Contact Person:</strong> ${name}</p>
                        <p style="margin: 0 0 10px 0;"><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
                        <p style="margin: 0;"><strong>Phone:</strong> ${phone}</p>
                    </div>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #64748b; text-align: center;">
                        Log in to your Command Centre to provision this hospital account.
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
