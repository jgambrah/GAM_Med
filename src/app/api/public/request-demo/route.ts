import { adminDb } from '@/firebase/admin';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * == Lead Capture API: Unified Entry Point ==
 * 
 * Securely logs demo requests into Firestore for Super Admin oversight
 * and triggers a notification email to the Platform Owner.
 */
export async function POST(req: Request) {
    try {
        const { name, email, hospital, phone } = await req.json();

        // 1. DATABASE RECORDING (Source for Sales Leads Desk)
        // This ensures leads are never "lost in email"
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

        // 2. EMAIL NOTIFICATION (Real-time awareness)
        if (process.env.RESEND_API_KEY) {
            await resend.emails.send({
                from: 'GamMed Sales <onboarding@resend.dev>',
                to: 'jamesgambrah@gmail.com',
                subject: `New Hospital Lead: ${hospital}`,
                html: `
                    <div style="font-family: sans-serif; padding: 20px;">
                        <h2 style="color: #2563eb;">New Demo Requested</h2>
                        <p><strong>Name:</strong> ${name}</p>
                        <p><strong>Hospital:</strong> ${hospital}</p>
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Phone:</strong> ${phone}</p>
                        <hr />
                        <p style="font-size: 0.8rem; color: #666;">View this lead in the Super Admin Command Centre to provision their account.</p>
                    </div>
                `
            });
        }

        return Response.json({ success: true });
    } catch (error: any) {
        console.error("Lead processing error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
