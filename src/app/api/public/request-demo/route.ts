import { adminDb } from '@/firebase/admin';
import { Resend } from 'resend';
import { NextResponse } from 'next/server';

/**
 * == Public Lead Capture API (Gmail Hub) ==
 * 
 * Receives prospective hospital leads from the landing page.
 * 1. Logs the request in Firestore for the Super Admin Command Centre.
 * 2. Sends a notification to the platform owner's Gmail.
 */
export async function POST(req: Request) {
    // Initialize Resend inside the handler to ensure it captures the current process.env
    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
        const { name, email, hospital, phone } = await req.json();

        // 1. ENVIRONMENT VALIDATION
        const missing = [];
        if (!process.env.RESEND_API_KEY) missing.push("RESEND_API_KEY");
        if (!process.env.FIREBASE_PRIVATE_KEY) missing.push("FIREBASE_PRIVATE_KEY");
        
        if (missing.length > 0) {
            console.error("CRITICAL: Missing environment variables for demo request:", missing);
            return NextResponse.json({ 
                error: "Configuration Error", 
                details: `Missing keys: ${missing.join(', ')}` 
            }, { status: 500 });
        }

        // 2. SAVE LEAD TO FIRESTORE (Source for Command Centre)
        await adminDb.collection('demo_requests').add({
            name,
            email: email.toLowerCase(),
            hospitalName: hospital,
            phone,
            status: 'Pending',
            requestedAt: new Date(),
        });

        // 3. SEND ALERT TO PLATFORM OWNER (Gmail Hub)
        await resend.emails.send({
            // NOTE: Must use 'onboarding@resend.dev' until custom domain is verified
            from: 'GamMed System <onboarding@resend.dev>', 
            to: 'jamesgambrah@gmail.com', // Primary Admin Hub
            reply_to: email, 
            subject: `🚨 NEW DEMO REQUEST: ${hospital}`,
            html: `
                <div style="font-family: sans-serif; border: 1px solid #e2e8f0; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #2563eb;">New Sales Lead from Landing Page</h2>
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
        console.error("DEMO_REQUEST_CRASH:", error.message);
        return NextResponse.json({ 
            error: "Internal Server Error", 
            details: error.message 
        }, { status: 500 });
    }
}
