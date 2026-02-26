import { getAdminServices } from '@/firebase/admin';
import { Resend } from 'resend';
import { NextResponse } from 'next/server';

/**
 * == SaaS Lead Capture API ==
 * 
 * Securely logs landing page demo requests into the platform's central registry.
 * Triggers a stylized notification to the platform owner's Gmail Hub.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, email, hospital, phone } = body;

        // 1. Initialize Admin Services (Build-safe getter)
        let adminDb;
        try {
            const services = getAdminServices();
            adminDb = services.adminDb;
        } catch (e: any) {
            console.error("SERVICE_UNAVAILABLE:", e.message);
            return NextResponse.json({ error: "Backend service unavailable", diagnostic: e.message }, { status: 503 });
        }

        // 2. Record Lead in Central Repository
        try {
            await adminDb.collection('demo_requests').add({
                name,
                email: email.toLowerCase().trim(),
                hospitalName: hospital,
                phone,
                status: 'Pending',
                requestedAt: new Date().toISOString(),
            });
        } catch (dbError: any) {
            console.error("FIRESTORE_WRITE_FAILURE:", dbError.message);
            return NextResponse.json({ error: "Lead logging failed" }, { status: 500 });
        }

        // 3. Notify Platform Owner via Resend (Gmail Hub)
        try {
            if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY missing");
            
            const resend = new Resend(process.env.RESEND_API_KEY);
            await resend.emails.send({
                from: 'GamMed Lead Hub <onboarding@resend.dev>', 
                to: 'jamesgambrah@gmail.com',
                reply_to: email,
                subject: `🚨 NEW DEMO REQUEST: ${hospital}`,
                html: `
                    <div style="font-family: sans-serif; border: 1px solid #e2e8f0; padding: 24px; border-radius: 12px;">
                        <h2 style="color: #2563eb; margin-top: 0;">New Sales Prospect</h2>
                        <p>A new demo request has been logged in your Command Centre.</p>
                        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 0 0 8px 0;"><strong>Facility:</strong> ${hospital}</p>
                            <p style="margin: 0 0 8px 0;"><strong>Contact:</strong> ${name}</p>
                            <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${email}</p>
                            <p style="margin: 0;"><strong>Phone:</strong> ${phone}</p>
                        </div>
                        <p style="font-size: 12px; color: #64748b;">
                            Provision this facility via your Super Admin dashboard to start their 30-day evaluation.
                        </p>
                    </div>
                `
            });
        } catch (mailError: any) {
            console.warn("NOTIFICATION_FAILURE:", mailError.message);
            // Non-critical: lead is already saved in DB
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("GLOBAL_API_ERROR:", error.message);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
