import { adminDb } from '@/firebase/admin';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
    try {
        const { name, email, hospital, phone } = await req.json();

        // 1. Save to Firestore (The Command Centre Source)
        // Check if adminDb is initialized (safety for build/dev environments)
        if (adminDb) {
            await adminDb.collection('demo_requests').add({
                name,
                email: email.toLowerCase(),
                hospitalName: hospital,
                phone,
                status: 'Pending', // Pending, Contacted, Provisioned
                requestedAt: new Date(),
            });
        } else {
            console.warn("Firebase Admin DB not initialized. Skipping Firestore log for demo request.");
        }

        // 2. Send the notification email
        if (process.env.RESEND_API_KEY) {
            await resend.emails.send({
                from: 'GamMed Sales <onboarding@resend.dev>',
                to: 'jamesgambrah@gmail.com',
                subject: `New Hospital Lead: ${hospital}`,
                html: `<p>A new demo has been requested by ${name} for ${hospital}. 
                       Check your Command Centre to provision their account.</p>`
            });
        }

        return Response.json({ success: true });
    } catch (error: any) {
        console.error("Demo Request Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
