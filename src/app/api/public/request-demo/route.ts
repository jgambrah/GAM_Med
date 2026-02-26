import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * == SaaS Lead Generation API ==
 * 
 * Secure route to process "Request Demo" submissions from the landing page.
 * Authenticates with Resend to notify the platform owner immediately.
 */
export async function POST(req: Request) {
    try {
        const { name, email, hospital, phone } = await req.json();

        if (!name || !email || !hospital) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        // Send notification to the Platform CEO
        await resend.emails.send({
            from: 'GamMed Leads <system@resend.dev>', // Note: Use verified domain in production
            to: 'jamesgambrah@gmail.com', // YOUR TARGET EMAIL
            subject: `New Sales Lead: ${hospital}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #2563eb;">New Demo Request Received</h2>
                    <p>A prospective client has requested a platform demonstration.</p>
                    <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Name:</strong> ${name}</p>
                        <p><strong>Hospital:</strong> ${hospital}</p>
                        <p><strong>Work Email:</strong> ${email}</p>
                        <p><strong>Phone:</strong> ${phone}</p>
                    </div>
                    <hr style="border: none; border-top: 1px solid #eee;" />
                    <p style="font-size: 0.8rem; color: #999;">This lead was captured from the GamMed Login/Landing Page.</p>
                </div>
            `
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Lead capture failed:', error);
        return new NextResponse(error.message, { status: 500 });
    }
}
