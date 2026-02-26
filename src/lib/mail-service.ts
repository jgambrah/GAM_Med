import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sends a stylized welcome email to a newly provisioned staff member.
 * 
 * @param to - Recipient email address.
 * @param name - Staff member's full name.
 * @param hospitalName - The name of the facility they are joining.
 * @param tempPass - The temporary password for their first login.
 * @param role - The assigned system role (e.g., Doctor, Nurse).
 */
export const sendWelcomeEmail = async (to: string, name: string, hospitalName: string, tempPass: string, role: string) => {
  try {
    await resend.emails.send({
      from: 'GamMed Support <onboarding@resend.dev>', // Note: Use verified domain in production
      to: to,
      subject: `Welcome to ${hospitalName} on GamMed`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #2563eb;">Welcome to GamMed, ${name}!</h2>
          <p>You have been added to <strong>${hospitalName}</strong> as a <strong>${role}</strong>.</p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Login URL:</strong> <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://gammed.vercel.app'}/login">gammed.vercel.app/login</a></p>
            <p style="margin: 5px 0 0 0;"><strong>Temporary Password:</strong> ${tempPass}</p>
          </div>
          <p style="font-size: 0.9rem; color: #666;">For security, please change your password immediately after your first login.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 0.8rem; color: #999;">This is an automated message from Gam It Services.</p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error("Resend Error:", error);
    return { success: false, error };
  }
};

/**
 * Sends a notification email to the platform owner when a new demo is requested.
 */
export const sendDemoRequestEmail = async (data: { name: string, email: string, hospital: string, phone: string }) => {
  try {
    await resend.emails.send({
      from: 'GamMed Growth <onboarding@resend.dev>',
      to: 'ceo@gammed.com', // In production, this should be your sales/admin email
      subject: `New Demo Request: ${data.hospital}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #2563eb;">New Lead from Landing Page</h2>
          <p>A new hospital director has requested a demo of the GamMed platform.</p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Name:</strong> ${data.name}</p>
            <p><strong>Hospital:</strong> ${data.hospital}</p>
            <p><strong>Work Email:</strong> ${data.email}</p>
            <p><strong>Phone:</strong> ${data.phone}</p>
          </div>
          <p style="font-size: 0.8rem; color: #999;">This lead was generated from the public landing page.</p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error("Resend Demo Request Error:", error);
    return { success: false, error };
  }
};
