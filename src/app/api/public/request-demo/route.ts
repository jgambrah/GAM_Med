import { getAdminDb } from '@/firebase/admin';
import { Resend } from 'resend';
import { NextResponse } from 'next/server';

/**
 * == Lead Capture API (Gmail Hub) ==
 * 
 * Securely logs prospective hospital leads into Firestore and 
 * notifies the platform owner via Gmail.
 */
export async function POST(req: Request) {
    const db = getAdminDb();
    
    // Build Safety: If DB service didn't initialize (e.g. during build), return error.
    if (!db) {
        return NextResponse.json({ error: "Service Unavailable" }, { status: 503 });
    }

    try {
        const { name, email, hospital, phone } = await req.json();

        // 1. Verify Resend Configuration
        if (!process.env.RESEND_API_KEY) {
            console.error("ERROR: RESEND_API_KEY not found");
            return NextResponse.json({ error: "Configuration Error" }, { status: 500 });
        }
        
        const resend = new Resend(process.env.RESEND_API_KEY);

        // 2. Save Lead to Firestore (Registry for Super Admin)
        await db.collection('demo_requests').add({
            name,
            email: email.toLowerCase(),
            hospitalName: hospital,
            phone,
            status: 'Pending',
            requestedAt: new Date().toISOString(),
        });

        // 3. Send Notification to Gmail
        await resend.emails.send({
            from: 'GamMed System <onboarding@resend.dev>', 
            to: 'jamesgambrah@gmail.com',
            reply_to: email,
            subject: `🚨 NEW DEMO REQUEST: ${hospital}`,
            html: `
                <div style="font-family: sans-serif; border: 1px solid #e2e8f0; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #2563eb;">New Sales Lead from Landing Page</h2>
                    <p><strong>Hospital:</strong> ${hospital}</p>
                    <p><strong>Contact Person:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Phone:</strong> ${phone}</p>
                    <hr style="border: none; border-top: 1px solid #eee;" />
                    <p style="font-size: 12px; color: #64748b;">
                        Log in to your Command Centre to provision this hospital account.
                    </p>
                </div>
            `
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("API_ROUTE_CRASH:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
