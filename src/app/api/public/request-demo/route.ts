import { getAdminServices } from '@/firebase/admin';
import { Resend } from 'resend';
import { NextResponse } from 'next/server';

/**
 * == Lead Capture API with Detailed Diagnostics ==
 * 
 * Securely logs demo requests to Firestore and notifies the platform owner.
 * Catch block provides specific feedback if the Admin SDK or Resend fails.
 */
export async function POST(req: Request) {
    try {
        // 1. Attempt to get admin services (will throw diagnostic error if init failed)
        const { adminDb } = getAdminServices();
        
        const body = await req.json();
        const { name, email, hospital, phone } = body;

        // 2. Log to Firestore
        await adminDb.collection('demo_requests').add({
            name,
            email: email.toLowerCase().trim(),
            hospitalName: hospital,
            phone,
            status: 'Pending',
            requestedAt: new Date().toISOString(),
        });

        // 3. Send Notification via Resend
        if (process.env.RESEND_API_KEY) {
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
                        <p style="font-size: 12px; color: #666;">Log in to the Super Admin panel to provision this facility.</p>
                    </div>
                `
            });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("DETAILED_DIAGNOSTIC:", error.message);
        
        // Return 503 with diagnostic info to help identify the specific credential issue
        return NextResponse.json({ 
            error: "Service Temporarily Unavailable", 
            diagnostic: error.message 
        }, { status: 503 });
    }
}
