
import { adminDb } from '@/firebase/admin';
import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * == SaaS Lead Generation: Demo Request API ==
 * 
 * Captures prospective hospital leads from the landing page.
 * Logic:
 * 1. Validates environment variables (Debug Mode).
 * 2. Logs the prospect into the 'demo_requests' Firestore collection.
 * 3. Triggers a notification email to the Platform Owner via Resend.
 */
export async function POST(req: Request) {
    try {
        const { name, email, hospital, phone } = await req.json();

        // 1. ENVIRONMENT CHECK (Essential for debugging 500 errors)
        if (!process.env.RESEND_API_KEY) {
            throw new Error("RESEND_API_KEY is missing from server environment variables.");
        }

        if (!adminDb) {
            throw new Error("Firebase Admin SDK failed to initialize. Check service account variables.");
        }

        // 2. LOG TO FIRESTORE (Prospect Registry)
        const leadRef = await adminDb.collection('demo_requests').add({
            name,
            email: email.toLowerCase().trim(),
            hospitalName: hospital,
            phone,
            status: 'Pending',
            requestedAt: new Date().toISOString(),
            source: 'Landing Page Form'
        });

        // 3. TRIGGER NOTIFICATION EMAIL
        // Using 'onboarding@resend.dev' as fallback if custom domain is not yet verified.
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'GamMed Leads <onboarding@resend.dev>';
        
        await resend.emails.send({
            from: fromEmail,
            to: 'jamesgambrah@gmail.com', // Dr. Gambrah's Inbox
            subject: `New Hospital Lead: ${hospital}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #2563eb;">New Sales Lead Detected</h2>
                    <p>A new demo request has been submitted for the GamMed platform.</p>
                    <hr />
                    <p><strong>Hospital Name:</strong> ${hospital}</p>
                    <p><strong>Contact Name:</strong> ${name}</p>
                    <p><strong>Work Email:</strong> ${email}</p>
                    <p><strong>Phone:</strong> ${phone}</p>
                    <hr />
                    <p style="font-size: 0.8rem; color: #666;">This lead has been automatically logged in the Super Admin Command Centre under Lead ID: ${leadRef.id}</p>
                </div>
            `
        });

        return NextResponse.json({ 
            success: true, 
            message: "Lead captured and notifications dispatched." 
        });

    } catch (error: any) {
        console.error("LEAD_CAPTURE_FAILURE:", error);
        
        // DEBUG MODE: Return actual error message to the client for rapid troubleshooting
        return NextResponse.json({ 
            success: false, 
            error: error.message,
            hint: "Check RESEND_API_KEY and FIREBASE_PROJECT_ID environment variables."
        }, { status: 500 });
    }
}
