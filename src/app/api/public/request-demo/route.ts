import { getAdminServices } from '@/firebase/admin';
import { Resend } from 'resend';
import { NextResponse } from 'next/server';

/**
 * == SaaS Lead Capture API ==
 * 
 * Securely handles "Request Demo" submissions from the landing page.
 * 1. Logs the prospect to the platform-wide demo_requests collection.
 * 2. Notifies the Platform Owner via stylized email.
 */
export async function POST(req: Request) {
    try {
        // Build-safe lazy initialization
        const { adminDb } = getAdminServices();
        const { name, email, hospital, phone } = await req.json();

        if (!process.env.RESEND_API_KEY) {
            return NextResponse.json({ error: "Email provider configuration missing" }, { status: 500 });
        }

        const resend = new Resend(process.env.RESEND_API_KEY);

        // 1. SAVE LEAD TO REGISTRY
        await adminDb.collection('demo_requests').add({
            name,
            email: email.toLowerCase().trim(),
            hospitalName: hospital,
            phone,
            status: 'Pending',
            requestedAt: new Date().toISOString(),
        });

        // 2. NOTIFY PLATFORM OWNER
        // Using the Resend onboarding verified address for reliability in prototype
        await resend.emails.send({
            from: 'GamMed Leads <onboarding@resend.dev>', 
            to: 'jamesgambrah@gmail.com',
            reply_to: email,
            subject: `🚨 NEW SALES LEAD: ${hospital}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
                    <h2 style="color: #2563eb;">New Demo Request</h2>
                    <p><strong>Hospital:</strong> ${hospital}</p>
                    <p><strong>Contact:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Phone:</strong> ${phone}</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 0.8rem; color: #666;">This lead has been logged in the Super Admin dashboard.</p>
                </div>
            `
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("LEAD_CAPTURE_CRASH:", error.message);
        // We report the diagnostic at the API level for Vercel logging
        return NextResponse.json({ 
            error: "Service Unavailable", 
            diagnostic: error.message 
        }, { status: 503 });
    }
}
