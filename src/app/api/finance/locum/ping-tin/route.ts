import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore, adminMessaging } from '@/lib/firebase-admin';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { hospitalId, clinicianId, clinicianName, phone, email, netPayable } = body;

    if (!clinicianId && !clinicianName) {
      return NextResponse.json({ error: 'Clinician identification is required.' }, { status: 400 });
    }

    const db = getAdminFirestore();
    let targetPhone = phone;
    let targetEmail = email;
    let targetFcmToken: string | null = null;
    let resolvedName = clinicianName;

    // 1. Dynamic Contact Lookup from Firestore if not provided
    if (clinicianId) {
      try {
        const userDoc = await db.collection('users').doc(clinicianId).get();
        if (userDoc.exists) {
          const uData = userDoc.data();
          targetPhone = targetPhone || uData?.phone || uData?.phoneNumber;
          targetEmail = targetEmail || uData?.email;
          targetFcmToken = uData?.fcmToken || null;
          resolvedName = resolvedName || uData?.fullName || uData?.name || uData?.displayName;
        }
      } catch (lookupErr) {
        console.warn('Clinician contact lookup warning:', lookupErr);
      }
    }

    const clinicianDisplayName = resolvedName || 'Clinician';
    const formattedAmount = (netPayable || 0).toLocaleString('en-GH', {
      style: 'currency',
      currency: 'GHS',
    });

    const smsMessage = `GAM MED COMPLIANCE: Dear ${clinicianDisplayName}, we cannot process your ${formattedAmount} locum payment until your statutory GRA TIN is provided for 7.5% WHT. Update your profile: https://gam-med.vercel.app/doctor/my-claims`;

    const notificationTasks: Promise<any>[] = [];
    let smsDispatched = false;
    let emailDispatched = false;

    // 2. Multi-Channel SMS Gateway (Arkesel / Africa's Talking / Twilio)
    const arkeselApiKey = process.env.ARKESEL_SMS_API_KEY || process.env.SMS_API_KEY;
    if (targetPhone && arkeselApiKey) {
      const smsPromise = fetch('https://api.arkesel.com/sms/v2/sms/send', {
        method: 'POST',
        headers: {
          'api-key': arkeselApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: 'GAM MED',
          message: smsMessage,
          recipients: [targetPhone],
        }),
      })
        .then((res) => {
          if (res.ok) smsDispatched = true;
        })
        .catch((e) => console.warn('SMS dispatch warning:', e));

      notificationTasks.push(smsPromise);
    }

    // 3. Email Notification via Resend (Same Gateway as Maker-Checker)
    const resendApiKey = process.env.RESEND_API_KEY;
    if (targetEmail && resendApiKey) {
      const resend = new Resend(resendApiKey);
      const emailPromise = resend.emails
        .send({
          from: 'GAM Med Compliance <finance@gam-med.com>',
          to: targetEmail,
          subject: `🚨 ACTION REQUIRED: Statutory GRA TIN Required for Locum Disbursement (${formattedAmount})`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #090d16; color: #ffffff; padding: 32px; border-radius: 16px; border: 1px solid #1e293b;">
              <div style="border-bottom: 1px solid #1e293b; padding-bottom: 16px; margin-bottom: 24px;">
                <h2 style="margin: 0; color: #f59e0b; font-size: 18px; text-transform: uppercase;">GAM Med Statutory Compliance Alert</h2>
                <span style="color: #94a3b8; font-size: 12px;">7.5% GRA Withholding Tax Requirement</span>
              </div>
              <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
                Dear <strong>${clinicianDisplayName}</strong>,
              </p>
              <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
                Your accrued locum shift earnings totaling <strong style="color: #10b981; font-size: 16px;">${formattedAmount}</strong> are currently ready for payment processing.
              </p>
              <div style="background: #0f172a; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #f59e0b; font-weight: bold; margin: 0 0 6px 0; font-size: 13px;">Disbursement Gateway Hold</p>
                <p style="color: #94a3b8; margin: 0; font-size: 12px;">
                  As per Ghana Revenue Authority (GRA) Income Tax Act regulations, 7.5% statutory Withholding Tax must be withheld and remitted under your Tax Identification Number (TIN).
                </p>
              </div>
              <div style="text-align: center; margin: 28px 0;">
                <a href="https://gam-med.vercel.app/doctor/my-claims" 
                   style="background: #10b981; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: bold; font-size: 14px; display: inline-block;">
                  Submit Your GRA TIN →
                </a>
              </div>
              <p style="color: #64748b; font-size: 11px; text-align: center; margin-top: 24px; border-top: 1px solid #1e293b; padding-top: 16px;">
                GAM Med Healthcare Finance & Compliance Division • Automated Dispatch
              </p>
            </div>
          `,
        })
        .then(() => {
          emailDispatched = true;
        })
        .catch((e: any) => console.warn('Resend compliance email warning:', e));

      notificationTasks.push(emailPromise);
    }

    // 4. In-App Firebase Push if FCM token registered
    if (targetFcmToken && adminMessaging) {
      const fcmPromise = adminMessaging
        .send({
          token: targetFcmToken,
          notification: {
            title: 'TIN Required for Locum Payout',
            body: `Provide your GRA TIN to release your ${formattedAmount} locum payment.`,
          },
          data: { url: '/doctor/my-claims' },
        })
        .catch((e: any) => console.warn('FCM locum ping warning:', e));

      notificationTasks.push(fcmPromise);
    }

    await Promise.allSettled(notificationTasks);

    return NextResponse.json({
      success: true,
      smsDispatched,
      emailDispatched,
      message: `Compliance notification dispatched to ${clinicianDisplayName}.`,
      preview: smsMessage,
    });
  } catch (err: any) {
    console.error('Ping TIN Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to ping clinician.' }, { status: 500 });
  }
}
