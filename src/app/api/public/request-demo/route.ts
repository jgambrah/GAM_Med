import { getAdminDb } from '@/firebase/admin';
import { Resend } from 'resend';
import { NextResponse } from 'next/server';

/**
 * == Lead Capture API (The Gmail Hub) ==
 * 
 * 1. Validates Resend & Firestore connectivity.
 * 2. Logs the prospect into the Super Admin registry.
 * 3. Sends an immediate alert to the platform owner's Gmail.
 */
export async function POST(req: Request) {
    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
        const { name, email, hospital, phone } = await req.json();
        const db = getAdminDb();

        // Safety: Ensure Database is available
        if (!db) {
            console.error("Database service unavailable (check FIREBASE_SERVICE_ACCOUNT)");
            return NextResponse.json({ error: "Database service unavailable" }, { status: 503 });
        }

        // 1. Save Lead to Firestore (The Command Centre Source)
        await db.collection('demo_requests').add({
            name,
            email: email.toLowerCase(),
            hospitalName: hospital,
            phone,
            status: 'Pending',
            requestedAt: new Date().toISOString(),
        });

        // 2. Send the Lead to your Gmail
        // Note: Using 'onboarding@resend.dev' ensures delivery without custom domain verification
        await resend.emails.send({
            from: 'GamMed System <onboarding@resend.dev>', 
            to: 'jamesgambrah@gmail.com',
            reply_to: email,
            subject: `🚨 NEW DEMO REQUEST: ${hospital}`,
            html: `
                <div style="font-family: sans-serif; border: 1px solid #e2e8f0; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #2563eb; margin-bottom: 20px;">New Sales Lead from Landing Page</h2>
                    <p><strong>Hospital:</strong> ${hospital}</p>
                    <p><strong>Contact Person:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Phone:</strong> ${phone}</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #64748b;">
                        Log in to your Command Centre to provision this hospital account.
                    </p>
                </div>
            `
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("API_ROUTE_CRASH:", error.message);
        return NextResponse.json({ 
            error: "Internal Server Error", 
            detail: error.message 
        }, { status: 500 });
    }
}
