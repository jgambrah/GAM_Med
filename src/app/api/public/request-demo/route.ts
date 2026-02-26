import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * == Public API: Lead Capture Handler ==
 * 
 * Securely processes demo requests from the landing page.
 * Authenticates with Resend using environment variables to trigger
 * a stylized lead notification email.
 */
export async function POST(req: Request) {
    try {
        const { name, email, hospital, phone } = await req.json();

        // Validate basic fields
        if (!name || !email || !hospital) {
            return new NextResponse("Missing required lead information", { status: 400 });
        }

        await resend.emails.send({
            from: 'GamMed Leads <onboarding@resend.dev>', // Verified Resend domain for testing
            to: 'jamesgambrah@gmail.com',
            subject: `New Demo Request: ${hospital}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #2563eb;">New Sales Lead for GamMed</h2>
                    <div style="background: #f3f4f6; padding: 20px; border-radius: 12px; border: 1px solid #e5e7eb;">
                        <p style="margin: 0 0 10px 0;"><strong>Prospect Name:</strong> ${name}</p>
                        <p style="margin: 0 0 10px 0;"><strong>Facility:</strong> ${hospital}</p>
                        <p style="margin: 0 0 10px 0;"><strong>Work Email:</strong> <a href="mailto:${email}">${email}</a></p>
                        <p style="margin: 0;"><strong>Contact Phone:</strong> ${phone || 'Not Provided'}</p>
                    </div>
                    <p style="font-size: 0.85rem; color: #6b7280; margin-top: 25px;">
                        This request was sent from the public landing page.
                    </p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 0.75rem; color: #9ca3af; text-align: center;">
                        &copy; 2024 Gam It Services System Notifications
                    </p>
                </div>
            `
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("API Error (request-demo):", error);
        return new NextResponse(error.message, { status: 500 });
    }
}
