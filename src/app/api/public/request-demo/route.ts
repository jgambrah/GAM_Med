import { adminDb } from '@/firebase/admin';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * == Sales Lead Generation Pipeline ==
 * 
 * Captures demo requests from the landing page.
 * 1. Logs the prospect into Firestore for the Super Admin Command Centre.
 * 2. Dispatches an email notification to the platform owner.
 */
export async function POST(req: Request) {
    try {
        const { name, email, hospital, phone } = await req.json();

        // 1. HARD ENFORCEMENT: Verify Admin SDK availability
        if (!adminDb) {
            console.error("Critical: Firebase Admin not initialized in API Route.");
            return Response.json({ error: "System Maintenance: Please contact support" }, { status: 503 });
        }

        // 2. SAVE TO PROSPECT REGISTRY (The Command Centre Feed)
        const leadRef = adminDb.collection('demo_requests').doc();
        await leadRef.set({
            id: leadRef.id,
            name,
            email: email.toLowerCase().trim(),
            hospitalName: hospital,
            phone,
            status: 'Pending', // Pending -> Contacted -> Provisioned
            requestedAt: new Date().toISOString(),
            source: 'Web Landing Page'
        });

        // 3. DISPATCH NOTIFICATION
        if (process.env.RESEND_API_KEY) {
            await resend.emails.send({
                from: 'GamMed Sales <onboarding@resend.dev>',
                to: 'jamesgambrah@gmail.com',
                subject: `New Hospital Lead: ${hospital}`,
                html: `
                    <div style="font-family: sans-serif; padding: 20px; color: #333;">
                        <h2 style="color: #2563eb;">New Demo Requested</h2>
                        <p><strong>Contact:</strong> ${name}</p>
                        <p><strong>Hospital:</strong> ${hospital}</p>
                        <p><strong>Phone:</strong> ${phone}</p>
                        <p><strong>Email:</strong> ${email}</p>
                        <hr />
                        <p style="font-size: 0.8rem; color: #666;">This lead has been logged in your Sales Pipeline Desk.</p>
                    </div>
                `
            });
        }

        return Response.json({ success: true });
    } catch (error: any) {
        console.error("Lead capture failed:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
