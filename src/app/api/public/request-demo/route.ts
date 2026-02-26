
import { NextResponse } from 'next/server';
import { sendDemoRequestEmail } from '@/lib/mail-service';

/**
 * == Public API: Demo Request Processor ==
 * 
 * Handles lead generation submissions from the landing and login pages.
 * Triggers an automated notification to the platform owner.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        
        // Basic validation
        if (!body.email || !body.name || !body.hospital) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Trigger the internal mail service
        const emailResult = await sendDemoRequestEmail({
            name: body.name,
            email: body.email,
            hospital: body.hospital,
            phone: body.phone || 'N/A'
        });

        if (!emailResult.success) {
            console.error('Email dispatch failed:', emailResult.error);
            // We still return success to the user to avoid friction, 
            // but log the error for internal monitoring.
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('API Error (request-demo):', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
