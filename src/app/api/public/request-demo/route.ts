
import { NextResponse } from 'next/server';
import { adminDb } from '@/firebase/admin';
import { sendDemoRequestEmail } from '@/lib/mail-service';

/**
 * == SaaS Lead Capture API ==
 * 
 * Securely logs prospective hospital leads into Firestore
 * and triggers an internal notification email.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, email, hospital, phone } = body;

        if (!adminDb) {
            throw new Error("Firestore Admin SDK not initialized");
        }

        const leadId = `lead-${Date.now()}`;
        
        // 1. Log Prospect in Firestore (Platform Registry)
        await adminDb.collection('demo_requests').doc(leadId).set({
            id: leadId,
            name,
            email,
            hospitalName: hospital,
            phone,
            status: 'Pending',
            requestedAt: new Date().toISOString()
        });

        // 2. Notify Platform CEO via stylised email
        await sendDemoRequestEmail({ name, email, hospital, phone });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Demo Request Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
