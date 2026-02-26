import { adminDb } from '@/firebase/admin';
import { sendDemoRequestEmail } from '@/lib/mail-service';

/**
 * == SaaS Lead Capture API ==
 * 
 * Processes public demo requests. It creates an immutable lead record 
 * in Firestore for the Command Centre and triggers a notification email.
 */
export async function POST(req: Request) {
    try {
        const { name, email, hospital, phone } = await req.json();

        if (!adminDb) {
            return Response.json({ error: "Backend not initialized" }, { status: 500 });
        }

        // 1. SAVE TO FIRESTORE: The Command Centre Lead Source
        // This allows the CEO to manage and provision leads in a central dashboard.
        await adminDb.collection('demo_requests').add({
            name,
            email: email.toLowerCase().trim(),
            hospitalName: hospital,
            phone,
            status: 'Pending', // Default status for new leads
            requestedAt: new Date().toISOString(),
            source: 'Landing Page'
        });

        // 2. SEND NOTIFICATION EMAIL: 
        // Stylized email sent to the platform owner via Resend.
        await sendDemoRequestEmail({ name, email, hospital, phone });

        return Response.json({ success: true });
    } catch (error: any) {
        console.error("Lead Capture Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
