
import { adminDb } from '@/firebase/admin';
import { sendDemoRequestEmail } from '@/lib/mail-service';
import { NextResponse } from 'next/server';

/**
 * == SaaS Lead Capture API ==
 * 
 * Public endpoint to receive "Request Demo" submissions from the landing page.
 * Logic:
 * 1. Logs the lead into Firestore for the Super Admin dashboard.
 * 2. Triggers an email notification to platform owners.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, email, hospital, phone } = body;

        if (!name || !email || !hospital) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Log Lead in Firestore (Internal CRM)
        // Access restricted to Super Admin via Security Rules
        if (adminDb) {
            await adminDb.collection('demo_requests').add({
                name,
                email,
                hospitalName: hospital,
                phone,
                status: 'Pending',
                requestedAt: new Date().toISOString(),
                source: 'Landing Page'
            });
        }

        // 2. Notify Platform Owner via stylized email
        await sendDemoRequestEmail({ name, email, hospital, phone });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Lead Capture Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
