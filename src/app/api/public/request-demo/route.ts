import { NextResponse } from 'next/server';
import { sendDemoRequestEmail } from '@/lib/mail-service';

/**
 * == SaaS Public API: Demo Request Handler ==
 * 
 * Securely processes demo requests from the landing page and triggers
 * internal notifications via the mail service.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, email, hospital, phone } = body;

        // Validation
        if (!name || !email || !hospital || !phone) {
            return NextResponse.json(
                { success: false, message: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Trigger the internal notification email
        const result = await sendDemoRequestEmail({ name, email, hospital, phone });

        if (result.success) {
            return NextResponse.json({ success: true, message: 'Request processed' });
        } else {
            throw new Error('Email service failed');
        }
    } catch (error: any) {
        console.error('Demo request API error:', error);
        return NextResponse.json(
            { success: false, message: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
