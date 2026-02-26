import { NextResponse } from 'next/server';
import { sendDemoRequestEmail } from '@/lib/mail-service';

/**
 * Public API Route: Handle Demo Requests
 * 
 * This endpoint processes leads from the landing page. It validates 
 * the input and utilizes the mail-service to notify the platform owner.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        
        // Basic validation
        if (!body.name || !body.email || !body.hospital || !body.phone) {
            return new NextResponse("Missing required fields", { status: 400 });
        }

        const result = await sendDemoRequestEmail(body);

        if (result.success) {
            return NextResponse.json({ success: true });
        } else {
            console.error("Mail service failure:", result.error);
            return new NextResponse("Internal Server Error: Failed to send lead notification.", { status: 500 });
        }
    } catch (error: any) {
        console.error("API Route Error (request-demo):", error);
        return new NextResponse(error.message || "Internal Server Error", { status: 500 });
    }
}
