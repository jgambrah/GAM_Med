import { adminDb } from '@/firebase/admin';
import { sendDemoRequestEmail } from '@/lib/mail-service';
import { NextResponse } from 'next/server';

/**
 * == SaaS Lead Capture API ==
 * 
 * Public endpoint to receive "Request Demo" submissions from the landing page.
 * Logs leads into the central Firestore registry and notifies the platform owner.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, hospital, email, phone } = body;

        if (!name || !hospital || !email) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Check if adminDb is initialized (prevents build-time crashes)
        if (!adminDb) {
            console.error("Firebase Admin not initialized. Skipping DB write.");
            return NextResponse.json({ success: true, warning: "Lead received but not logged." });
        }

        // 2. Log Lead in Firestore (The Prospect Registry)
        const leadId = `lead-${Date.now()}`;
        await adminDb.collection('demo_requests').doc(leadId).set({
            id: leadId,
            name,
            hospitalName: hospital,
            email: email.toLowerCase().trim(),
            phone,
            status: 'Pending',
            requestedAt: new Date().toISOString()
        });

        // 3. Notify Platform Owner via stylized email
        await sendDemoRequestEmail({ name, hospital, email, phone });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Lead Capture Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}