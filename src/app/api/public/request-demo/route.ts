import { getAdminDb } from '@/firebase/admin';
import { Resend } from 'resend';
import { NextResponse } from 'next/server';

/**
 * == Professional Lead Capture API ==
 * 
 * Securely captures prospective hospital leads from the landing page.
 * Logs to Firestore and notifies the platform owner via Resend.
 */
export async function POST(req: Request) {
    try {
        const { name, email, hospital, phone } = await req.json();

        // 1. Verify Resend Configuration
        if (!process.env.RESEND_API_KEY) {
            console.error("CRITICAL: RESEND_API_KEY is missing from environment variables");
            return NextResponse.json({ error: "Email provider not configured" }, { status: 500 });
        }
        const resend = new Resend(process.env.RESEND_API_KEY);

        // 2. Initialize Firestore via build-safe getter
        const db = getAdminDb();
        if (!db) {
            throw new Error("Database service unavailable during lead capture");
        }

        // 3. Save Lead using the Admin SDK
        await db.collection('demo_requests').add({
            name,
            email: email.toLowerCase(),
            hospitalName: hospital,
            phone,
            status: 'Pending',
            requestedAt: new Date().toISOString(),
        });

        // 4. Send Notification to your Gmail
        await resend.emails.send({
            from: 'GamMed System <onboarding@resend.dev>', 
            to: 'jamesgambrah@gmail.com',
            reply_to: email,
            subject: `🚨 NEW LEAD: ${hospital}`,
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
        console.error("LEAD_CAPTURE_CRITICAL_ERROR:", error.message);
        return NextResponse.json({ 
            error: "Service temporarily unavailable", 
            details: error.message 
        }, { status: 500 });
    }
}
