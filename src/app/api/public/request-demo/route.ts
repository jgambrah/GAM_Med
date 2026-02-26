import { getAdminDb } from '@/firebase/admin';
import { Resend } from 'resend';
import { NextResponse } from 'next/server';

/**
 * == Lead Capture API (Gmail Hub Pattern) ==
 * 
 * Securely captures demo requests from the landing page.
 * 1. Logs the prospect into the Super Admin Demo Registry.
 * 2. Notifies the Platform CEO via email.
 */
export async function POST(req: Request) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const db = getAdminDb();

    try {
        const { name, email, hospital, phone } = await req.json();

        // 1. Validate Configuration
        if (!process.env.RESEND_API_KEY) {
            console.error("ERROR: RESEND_API_KEY missing from environment.");
            return NextResponse.json({ error: "Email service configuration missing" }, { status: 500 });
        }

        if (!db) {
            console.error("ERROR: Firebase Admin SDK failed to initialize.");
            return NextResponse.json({ error: "Database service unavailable" }, { status: 500 });
        }

        // 2. Save Lead to Registry
        await db.collection('demo_requests').add({
            name,
            email: email.toLowerCase().trim(),
            hospitalName: hospital,
            phone,
            status: 'Pending',
            requestedAt: new Date().toISOString(),
        });

        // 3. Send Notification Hub Email
        await resend.emails.send({
            from: 'GamMed System <onboarding@resend.dev>', 
            to: 'jamesgambrah@gmail.com', // Primary Sales Hub
            reply_to: email, 
            subject: `🚨 NEW DEMO REQUEST: ${hospital}`,
            html: `
                <div style="font-family: sans-serif; border: 1px solid #e2e8f0; padding: 24px; border-radius: 12px; color: #1e293b;">
                    <h2 style="color: #2563eb; margin-top: 0;">New Sales Lead Detected</h2>
                    <p style="font-size: 16px;">A prospective facility has requested a platform demonstration.</p>
                    <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Hospital:</strong> ${hospital}</p>
                        <p><strong>Contact:</strong> ${name}</p>
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Phone:</strong> ${phone}</p>
                    </div>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                    <p style="font-size: 12px; color: #64748b;">
                        This lead is now visible in your <strong>Command Centre > Sales Leads</strong> dashboard for one-click provisioning.
                    </p>
                </div>
            `
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("LEAD_CAPTURE_CRASH:", error.message);
        return NextResponse.json({ 
            error: "Internal Server Error", 
            message: error.message 
        }, { status: 500 });
    }
}
