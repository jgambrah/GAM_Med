import { getAdminServices } from '@/firebase/admin';
import { Resend } from 'resend';
import { NextResponse } from 'next/server';

/**
 * == Public Lead Capture API ==
 * 
 * Securely logs prospective leads to Firestore and notifies the platform owner.
 * Uses Diagnostic Admin SDK to ensure descriptive errors on Vercel.
 */
export async function POST(req: Request) {
    try {
        // 1. Get diagnostic services
        const { adminDb } = getAdminServices();
        const { name, email, hospital, phone } = await req.json();

        // 2. Log Lead to Firestore (Global Registry)
        await adminDb.collection('demo_requests').add({
            name,
            email: email.toLowerCase(),
            hospitalName: hospital,
            phone,
            status: 'Pending',
            requestedAt: new Date().toISOString(),
        });

        // 3. Notify Dr. James (Platform Owner)
        const resendKey = process.env.RESEND_API_KEY;
        if (resendKey) {
            const resend = new Resend(resendKey);
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
                        <hr />
                        <p style="font-size: 0.8rem; color: #666;">View this lead in the Super Admin Command Centre.</p>
                    </div>
                `
            });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("LEAD_CAPTURE_ERROR:", error.message);
        // Returns exact error for rapid debugging during Vercel setup
        return NextResponse.json({ 
            error: "Service Unavailable", 
            diagnostic: error.message 
        }, { status: 503 });
    }
}
