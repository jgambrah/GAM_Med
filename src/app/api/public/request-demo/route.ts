import { adminDb } from '@/firebase/admin';
import { Resend } from 'resend';
import { NextResponse } from 'next/server';

/**
 * == SaaS Lead Capture: Gmail Hub API ==
 * 
 * Captures prospective hospital leads and routes them to:
 * 1. Firestore (The Sales Pipeline Desk)
 * 2. jamesgambrah@gmail.com (Real-time Email Alert)
 */
export async function POST(req: Request) {
    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
        const { name, email, hospital, phone } = await req.json();

        // 1. Verify Configuration
        if (!process.env.RESEND_API_KEY) {
            console.error("API_CONFIG_ERROR: RESEND_API_KEY is missing from environment variables.");
            return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
        }

        if (!adminDb) {
            console.error("API_CONFIG_ERROR: Firebase Admin SDK failed to initialize.");
            return NextResponse.json({ error: "Database service unavailable" }, { status: 500 });
        }

        // 2. Log prospect into the Registry
        await adminDb.collection('demo_requests').add({
            name,
            email: email.toLowerCase().trim(),
            hospitalName: hospital,
            phone,
            status: 'Pending',
            requestedAt: new Date().toISOString(),
        });

        // 3. Send Notification to the Platform Hub
        await resend.emails.send({
            // Note: Sending FROM the verified onboarding address to ensure delivery
            from: 'GamMed Sales <onboarding@resend.dev>', 
            to: 'jamesgambrah@gmail.com', // Primary Sales Notification Hub
            reply_to: email, 
            subject: `🚨 NEW DEMO REQUEST: ${hospital}`,
            html: `
                <div style="font-family: sans-serif; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; max-width: 600px;">
                    <h2 style="color: #2563eb; margin-bottom: 20px;">Sales Lead Captured</h2>
                    <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                        <p style="margin: 0 0 10px 0;"><strong>Facility:</strong> ${hospital}</p>
                        <p style="margin: 0 0 10px 0;"><strong>Prospect:</strong> ${name}</p>
                        <p style="margin: 0 0 10px 0;"><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
                        <p style="margin: 0;"><strong>Phone:</strong> ${phone}</p>
                    </div>
                    <p style="font-size: 13px; color: #64748b; margin-top: 25px;">
                        This lead has been logged in the <strong>Sales Pipeline Desk</strong>. 
                        Log in to the Super Admin dashboard to provision this tenant.
                    </p>
                    <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
                    <p style="font-size: 11px; color: #94a3b8; text-align: center;">
                        &copy; 2024 Gam It Services Cloud Notifications
                    </p>
                </div>
            `
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("API_CRASH_REPORT:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
