import { adminDb } from '@/firebase/admin';
import { Resend } from 'resend';
import { NextResponse } from 'next/server';

/**
 * == SaaS Lead Capture API (With Tracing) ==
 * 
 * Securely logs prospective leads and notifies the platform owner.
 * Includes explicit try/catch blocks for Firestore and Resend to aid debugging.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, email, hospital, phone } = body;

        console.log(`Starting lead capture for: ${hospital}`);

        // 1. Validate Admin SDK
        if (!adminDb) {
            console.error("❌ ADMIN_SDK_ERROR: Database service unavailable (adminDb is null)");
            return NextResponse.json({ error: "Database service unavailable" }, { status: 500 });
        }

        // 2. Test Firestore Connection
        try {
            await adminDb.collection('demo_requests').add({
                name,
                email: email.toLowerCase(),
                hospitalName: hospital,
                phone,
                status: 'Pending',
                requestedAt: new Date(),
            });
            console.log("✅ Firestore save successful");
        } catch (dbError: any) {
            console.error("❌ FIRESTORE_ERROR:", dbError.message);
            return NextResponse.json({ error: "Database save failed", detail: dbError.message }, { status: 500 });
        }

        // 3. Test Resend Connection
        try {
            if (!process.env.RESEND_API_KEY) {
                throw new Error("RESEND_API_KEY is missing");
            }
            
            const resend = new Resend(process.env.RESEND_API_KEY);
            await resend.emails.send({
                from: 'GamMed System <onboarding@resend.dev>', 
                to: 'jamesgambrah@gmail.com',
                reply_to: email,
                subject: `🚨 NEW LEAD: ${hospital}`,
                html: `
                    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                        <h2 style="color: #2563eb;">New Sales Lead</h2>
                        <p><strong>Hospital:</strong> ${hospital}</p>
                        <p><strong>Contact:</strong> ${name}</p>
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Phone:</strong> ${phone}</p>
                        <br />
                        <p style="font-size: 12px; color: #666;">Log in to the Command Centre to provision this account.</p>
                    </div>
                `
            });
            console.log("✅ Resend email sent");
        } catch (mailError: any) {
            console.error("❌ RESEND_ERROR:", mailError.message);
            // We don't return 500 here because the lead is already safely saved in the database
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("GLOBAL_API_ERROR:", error.message);
        return NextResponse.json({ error: "Internal Server Error", detail: error.message }, { status: 500 });
    }
}
