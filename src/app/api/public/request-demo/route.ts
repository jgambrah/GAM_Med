import { adminDb } from '@/firebase/admin';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * == Lead Capture API (Professional) ==
 * 
 * Logs incoming interest into Firestore for the Super Admin Sales Desk
 * and dispatches a high-priority email notification.
 */
export async function POST(req: Request) {
    try {
        const { name, email, hospital, phone } = await req.json();

        // 1. LOG THE LEAD (Command Centre Registry)
        await adminDb.collection('demo_requests').add({
            name,
            email: email.toLowerCase(),
            hospitalName: hospital,
            phone,
            status: 'Pending', 
            requestedAt: new Date().toISOString(),
        });

        // 2. DISPATCH NOTIFICATION
        await resend.emails.send({
            from: 'GamMed Sales <onboarding@resend.dev>',
            to: 'jamesgambrah@gmail.com',
            subject: `Hospital Lead: ${hospital}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h2 style="color: #2563eb;">New Demo Requested</h2>
                    <p><strong>Facility:</strong> ${hospital}</p>
                    <p><strong>Contact:</strong> ${name} (${phone})</p>
                    <p>Access your Super Admin dashboard to provision this account.</p>
                </div>
            `
        });

        return Response.json({ success: true });
    } catch (error: any) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
