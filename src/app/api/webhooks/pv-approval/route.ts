import { NextResponse } from 'next/server';
import { adminDb, adminMessaging } from '@/lib/firebase-admin';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    const resend = resendApiKey ? new Resend(resendApiKey) : null;
    const body = await request.json();
    const { hospitalId, pvId, totalAmount, payeeCount, makerName, checkerId } = body;

    let targetCheckers: any[] = [];

    // 1. Fetch the Checker's Contact Details from Firebase
    if (checkerId) {
      const checkerDoc = await adminDb.collection('users').doc(checkerId).get();
      if (checkerDoc.exists) {
        targetCheckers.push({ id: checkerDoc.id, ...checkerDoc.data() });
      }
    } else if (hospitalId) {
      // Dynamic fallback: find designated checkers for this hospital tenant
      const checkersSnapshot = await adminDb
        .collection('users')
        .where('hospitalId', '==', hospitalId)
        .where('role', 'in', ['CHIEF_ACCOUNTANT', 'FINANCE_DIRECTOR', 'DIRECTOR', 'ADMIN'])
        .get();

      checkersSnapshot.docs.forEach((doc) => {
        targetCheckers.push({ id: doc.id, ...doc.data() });
      });
    }

    if (targetCheckers.length === 0) {
      return NextResponse.json({ error: 'Checker(s) not found' }, { status: 404 });
    }

    const formattedAmount = new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
    }).format(totalAmount || 0);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gam-med.vercel.app';
    const notificationTasks: Promise<any>[] = [];

    for (const checker of targetCheckers) {
      const checkerEmail = checker?.email;
      const checkerPhone = checker?.phone;
      const fcmToken = checker?.fcmToken;

      // 2. In-App Firebase Cloud Messaging (FCM) Notification
      if (fcmToken && adminMessaging) {
        const fcmPayload = {
          token: fcmToken,
          notification: {
            title: 'Pending PV Authorization',
            body: `${makerName || 'Maker'} submitted a batch PV for ${formattedAmount} (${payeeCount || 1} payees).`,
          },
          data: {
            url: `/accountant/payments/authorize/${pvId || ''}`,
          },
        };
        notificationTasks.push(adminMessaging.send(fcmPayload).catch((err: any) => console.warn('FCM send error:', err)));
      }

      // 3. Email Notification (via Resend)
      if (checkerEmail && resend) {
        const emailPayload = resend.emails.send({
          from: 'GAM Med Finance <finance@gam-med.com>',
          to: checkerEmail,
          subject: `ACTION REQUIRED: Batch PV ${pvId || ''} Awaiting Approval`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #090d16; color: #ffffff; padding: 32px; border-radius: 16px; border: 1px solid #1e293b;">
              <h3 style="color: #10b981; margin-top: 0;">Payment Voucher Authorization Required</h3>
              <p><strong>Maker:</strong> ${makerName || 'Accountant (Maker)'}</p>
              <p><strong>Total Net Amount:</strong> ${formattedAmount}</p>
              <p><strong>Payees:</strong> ${payeeCount || 1}</p>
              <br/>
              <a href="${appUrl}/accountant/payments/authorize/${pvId || ''}" style="padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Review & Authorize Batch →
              </a>
            </div>
          `,
        });
        notificationTasks.push(emailPayload.catch((err: any) => console.warn('Resend email error:', err)));
      }

      // 4. SMS Notification (Optional integration e.g., Arkesel / Africa's Talking)
      const arkeselApiKey = process.env.ARKESEL_SMS_API_KEY || process.env.SMS_API_KEY;
      if (checkerPhone && arkeselApiKey) {
        const smsPayload = fetch('https://api.arkesel.com/sms/v2/sms/send', {
          method: 'POST',
          headers: {
            'api-key': arkeselApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sender: 'GAM MED',
            message: `GAM Med: Batch PV (${formattedAmount}) submitted by ${makerName || 'Maker'} awaits your approval: ${appUrl}/accountant/payments/authorize/${pvId || ''}`,
            recipients: [checkerPhone],
          }),
        }).catch((err) => console.warn('SMS send error:', err));
        notificationTasks.push(smsPayload);
      }
    }

    // Execute all notifications concurrently
    await Promise.allSettled(notificationTasks);

    return NextResponse.json({
      success: true,
      message: 'Notifications dispatched successfully.',
      dispatchedCount: targetCheckers.length,
    });
  } catch (error: any) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
