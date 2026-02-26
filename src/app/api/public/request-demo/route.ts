import { NextResponse } from 'next/server';
import { sendDemoRequestEmail } from '@/lib/mail-service';

/**
 * == Public Lead Capture API ==
 * 
 * Secure endpoint to process demo requests from the landing page.
 * Leverages the server-side mail service to notify the platform owner.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, email, hospital, phone } = body;

        if (!name || !email || !hospital || !phone) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const emailResult = await sendDemoRequestEmail({ name, email, hospital, phone });

        if (emailResult.success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
        }
    } catch (error: any) {
        console.error("Demo request API error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
