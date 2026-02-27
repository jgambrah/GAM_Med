import { getAdminServices } from '@/firebase/admin';
import { Resend } from 'resend';
import { NextResponse } from 'next/server';

/**
 * == SaaS Lead Capture API ==
 * 
 * Securely logs prospective hospital leads to Firestore and 
 * notifies the platform owner via Resend.
 * Includes detailed diagnostics for build-time/config troubleshooting.
 */
export async function POST(req: Request) {
    try {
        // 1. Initialize services or throw diagnostic error
        const { adminDb } = getAdminServices();
        const { name, email, hospital, phone } = await req.json();

        // 2. Log lead to global registry
        await adminDb.collection('demo_requests').add({
            name,
            email: email.toLowerCase(),
            hospitalName: hospital,
            phone,
            status: 'Pending',
            requestedAt: new Date(),
        });

        // 3. Notify Platform Owner
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
            from: 'GamMed System <onboarding@resend.dev>', 
            to: 'jamesgambrah@gmail.com',
            subject: `🚨 NEW LEAD: ${hospital}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h2 style="color: #2563eb;">New Demo Requested</h2>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Hospital:</strong> ${hospital}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Phone:</strong> ${phone}</p>
                </div>
            `
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("LEAD_CAPTURE_DIAGNOSTIC:", error.message);
        return NextResponse.json({ 
            error: "Service Unavailable", 
            diagnostic: error.message 
        }, { status: 503 });
    }
}
