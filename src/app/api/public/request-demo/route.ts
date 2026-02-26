import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * == Public API: Demo Request Lead Capture ==
 * 
 * Securely handles incoming demo requests and routes them to the Platform Owner.
 */
export async function POST(req: Request) {
    try {
        const { name, email, hospital, phone } = await req.json();

        if (!process.env.RESEND_API_KEY) {
            console.error("RESEND_API_KEY is missing from environment variables.");
            return NextResponse.json({ error: "Email service misconfigured" }, { status: 500 });
        }

        await resend.emails.send({
            from: 'GamMed Leads <onboarding@resend.dev>', // Note: Use verified domain in production
            to: 'jamesgambrah@gmail.com', // Primary Sales Lead Target
            subject: `New Demo Request: ${hospital}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #2563eb;">New Sales Lead for GamMed</h2>
                    <div style="background: #f3f4f6; padding: 20px; border-radius: 12px; border: 1px solid #e5e7eb;">
                        <p style="margin: 0 0 10px 0;"><strong>Prospect Name:</strong> ${name}</p>
                        <p style="margin: 0 0 10px 0;"><strong>Facility:</strong> ${hospital}</p>
                        <p style="margin: 0 0 10px 0;"><strong>Work Email:</strong> <a href="mailto:${email}">${email}</a></p>
                        <p style="margin: 0;"><strong>Contact Phone:</strong> ${phone}</p>
                    </div>
                    <p style="font-size: 0.85rem; color: #6b7280; margin-top: 25px;">
                        This request was submitted via the "Request Demo" form on the GamMed portal.
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
        console.error("API Route Error:", error);
        return new NextResponse(error.message, { status: 500 });
    }
}
