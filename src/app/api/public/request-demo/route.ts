import { getAdminServices } from '@/firebase/admin';
import { Resend } from 'resend';
import { NextResponse } from 'next/server';

/**
 * == SaaS Lead Capture API ==
 * 
 * Securely captures demo requests from the landing page.
 * 1. Logs lead to Firestore Registry
 * 2. Notifies Platform Owner via Email
 */
export async function POST(req: Request) {
    try {
        // 1. Verify Admin SDK Health
        const { adminDb } = getAdminServices();
        
        const body = await req.json();
        const { name, email, hospital, phone } = body;

        // 2. Validate Resend Configuration
        if (!process.env.RESEND_API_KEY) {
            console.error("ERROR: RESEND_API_KEY is missing from environment variables");
            return NextResponse.json({ error: "Email configuration missing" }, { status: 500 });
        }
        const resend = new Resend(process.env.RESEND_API_KEY);

        // 3. Save Lead to Firestore (Master Sales Registry)
        await adminDb.collection('demo_requests').add({
            name,
            email: email.toLowerCase().trim(),
            hospitalName: hospital,
            phone,
            status: 'Pending',
            requestedAt: new Date(),
        });

        // 4. Send Notification to Gmail Hub
        await resend.emails.send({
            from: 'GamMed System <onboarding@resend.dev>', 
            to: 'jamesgambrah@gmail.com',
            reply_to: email,
            subject: `🚨 NEW DEMO REQUEST: ${hospital}`,
            html: `
                <div style="font-family: sans-serif; border: 1px solid #e2e8f0; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #2563eb;">New Sales Lead: ${hospital}</h2>
                    <p><strong>Contact Person:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Phone:</strong> ${phone}</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #64748b;">
                        Log in to the GamMed Command Centre to provision this hospital account.
                    </p>
                </div>
            `
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("LEAD_CAPTURE_CRASH:", error.message);
        return NextResponse.json({ 
            error: "Service Error", 
            message: error.message 
        }, { status: 500 });
    }
}
