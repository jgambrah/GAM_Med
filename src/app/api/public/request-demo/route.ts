import { getAdminDb } from '@/firebase/admin';
import { Resend } from 'resend';
import { NextResponse } from 'next/server';

/**
 * == SaaS Lead Capture API ==
 * 
 * Securely handles "Request Demo" submissions from the landing page.
 * It logs prospects into the global registry and notifies the platform owner.
 */
export async function POST(req: Request) {
    // Use the lazy getter to ensure the Admin SDK is initialized at runtime
    const db = getAdminDb();
    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
        const { name, email, hospital, phone } = await req.json();

        // 1. Verify Service Connectivity
        if (!db) {
            console.error("DATABASE_UNAVAILABLE: Admin SDK failed to initialize. Check FIREBASE_SERVICE_ACCOUNT.");
            return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
        }

        if (!process.env.RESEND_API_KEY) {
            console.error("RESEND_CONFIG_MISSING: Check RESEND_API_KEY environment variable.");
            return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
        }

        // 2. Log Lead to Firestore (The Command Centre Source)
        await db.collection('demo_requests').add({
            name,
            email: email.toLowerCase().trim(),
            hospitalName: hospital,
            phone,
            status: 'Pending',
            requestedAt: new Date().toISOString(),
        });

        // 3. Send Notification to Hub (jamesgambrah@gmail.com)
        await resend.emails.send({
            from: 'GamMed System <onboarding@resend.dev>', 
            to: 'jamesgambrah@gmail.com',
            reply_to: email,
            subject: `🚨 NEW DEMO REQUEST: ${hospital}`,
            html: `
                <div style="font-family: sans-serif; border: 1px solid #e2e8f0; padding: 25px; border-radius: 12px; max-width: 600px;">
                    <h2 style="color: #2563eb; margin-top: 0;">New Sales Lead</h2>
                    <p style="font-size: 16px;">A representative from a new healthcare facility has requested a demo.</p>
                    <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0;"><strong>Hospital:</strong> ${hospital}</p>
                        <p style="margin: 5px 0;"><strong>Contact:</strong> ${name}</p>
                        <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
                        <p style="margin: 0;"><strong>Phone:</strong> ${phone}</p>
                    </div>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #64748b; text-align: center;">
                        Log in to the Command Centre to provision this hospital dashboard.
                    </p>
                </div>
            `
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("API_ROUTE_FAILURE:", error.message);
        return NextResponse.json({ 
            error: "Internal Server Error", 
            details: error.message 
        }, { status: 500 });
    }
}
