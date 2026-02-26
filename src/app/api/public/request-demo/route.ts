
import { adminDb } from '@/firebase/admin';
import { sendDemoRequestEmail } from '@/lib/mail-service';
import { NextResponse } from 'next/server';

/**
 * == SaaS Lead Capture API ==
 * 
 * Securely logs prospective hospital clients into Firestore and
 * triggers an automated notification email to the Platform Owner.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, email, hospital, phone } = body;

        if (!name || !email || !hospital) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Log the lead in Firestore (The SaaS Prospect Registry)
        // Check if adminDb is available (it might be null during build/misconfiguration)
        if (adminDb) {
            const leadRef = adminDb.collection('demo_requests').doc();
            await leadRef.set({
                id: leadRef.id,
                name,
                email: email.toLowerCase().trim(),
                hospitalName: hospital,
                phone: phone || 'Not provided',
                status: 'Pending',
                requestedAt: new Date().toISOString(),
                source: 'Landing Page'
            });
        }

        // 2. Notify the Platform Owner via Email
        await sendDemoRequestEmail({ name, email, hospital, phone });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Demo Request Failure:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
