import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { hospitalId, clinicianId, clinicianName, phone, email, netPayable } = body;

    if (!clinicianId && !clinicianName) {
      return NextResponse.json({ error: 'Clinician identification is required.' }, { status: 400 });
    }

    const formattedAmount = (netPayable || 0).toLocaleString('en-GH', {
      style: 'currency',
      currency: 'GHS',
    });

    const message = `GAM MED COMPLIANCE NOTICE: Dear ${clinicianName || 'Clinician'}, we cannot process your ${formattedAmount} locum disbursement until your statutory GRA Tax Identification Number (TIN) is provided for 7.5% WHT filing. Please update your profile or reply with your TIN.`;

    const arkeselApiKey = process.env.ARKESEL_SMS_API_KEY || process.env.SMS_API_KEY;
    let smsDispatched = false;

    if (phone && arkeselApiKey) {
      try {
        const smsRes = await fetch('https://api.arkesel.com/sms/v2/sms/send', {
          method: 'POST',
          headers: {
            'api-key': arkeselApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sender: 'GAM MED',
            message,
            recipients: [phone],
          }),
        });
        smsDispatched = smsRes.ok;
      } catch (e) {
        console.warn('SMS dispatch warning:', e);
      }
    }

    return NextResponse.json({
      success: true,
      smsDispatched,
      message: `Compliance notification sent to ${clinicianName || 'Clinician'}.`,
      preview: message,
    });
  } catch (err: any) {
    console.error('Ping TIN Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to ping clinician.' }, { status: 500 });
  }
}
