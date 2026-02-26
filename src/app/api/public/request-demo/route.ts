import { getAdminDb } from '@/firebase/admin';
import { Resend } from 'resend';
import { NextResponse } from 'next/server';

/**
 * == Professional Lead Capture API ==
 * 
 * Optimized for reliable Gmail notifications via Resend and secure 
 * Firestore logging for the Super Admin dashboard.
 */
export async function POST(req: Request) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const db = getAdminDb();

    try {
        const { name, email, hospital, phone } = await req.json();

        // 1. Configuration Check
        if (!process.env.RESEND_API_KEY) {
            console.error("CRITICAL: RESEND_API_KEY is missing");
            return NextResponse.json({ error: "Service Configuration Error" }, { status: 500 });
        }

        if (!db) {
            console.error("CRITICAL: Firebase Admin not initialized");
            return NextResponse.json({ error: "Registry Service Error" }, { status: 500 });
        }

        // 2. Log prospect to Firestore (The Command Centre Source)
        await db.collection('demo_requests').add({
            name,
            email: email.toLowerCase().trim(),
            hospitalName: hospital,
            phone,
            status: 'Pending',
            requestedAt: new Date(),
        });

        // 3. Send Notification to Administrator Gmail
        // USES: onboarding@resend.dev until custom domain is verified
        await resend.emails.send({
            from: 'GamMed System <onboarding@resend.dev>', 
            to: 'jamesgambrah@gmail.com',
            reply_to: email, 
            subject: `🚨 NEW DEMO REQUEST: ${hospital}`,
            html: `
                <div style="font-family: sans-serif; border: 1px solid #e2e8f0; padding: 30px; border-radius: 16px; color: #1e293b;">
                    <h2 style="color: #2563eb; margin-top: 0;">New Sales Lead</h2>
                    <p style="font-size: 16px; margin-bottom: 20px;">A new healthcare facility has requested a platform demonstration.</p>
                    
                    <div style="background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #f1f5f9;">
                        <p style="margin: 0 0 8px 0;"><strong>Facility:</strong> ${hospital}</p>
                        <p style="margin: 0 0 8px 0;"><strong>Contact:</strong> ${name}</p>
                        <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${email}</p>
                        <p style="margin: 0;"><strong>Phone:</strong> ${phone}</p>
                    </div>
                    
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
                    
                    <p style="font-size: 12px; color: #64748b; text-align: center;">
                        Open your <a href="https://gammed.vercel.app/dashboard/super-admin/leads" style="color: #2563eb; font-weight: bold;">Super Admin Dashboard</a> to provision this facility.
                    </p>
                </div>
            `
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("DEMO_REQUEST_API_ERROR:", error.message);
        return NextResponse.json({ error: "Process Failed", message: error.message }, { status: 500 });
    }
}
