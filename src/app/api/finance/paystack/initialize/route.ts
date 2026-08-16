export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      hospitalId, 
      patientId, 
      patientName, 
      patientEmail, 
      patientPhone, 
      amount, 
      billingItemIds = [], 
      cashierId,
      callbackUrl 
    } = body;

    if (!hospitalId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid parameters: hospitalId and a positive amount are required.' },
        { status: 400 }
      );
    }

    // 1. Fetch Hospital Credentials from Server-Side Vault
    const hospitalDoc = await adminDb.collection('hospitals').doc(hospitalId).get();
    if (!hospitalDoc.exists) {
      return NextResponse.json({ error: 'Hospital record not found.' }, { status: 404 });
    }

    const hospitalData = hospitalDoc.data();
    const secretKey = hospitalData?.paystackSecretKey || process.env.PAYSTACK_SECRET_KEY;
    const publicKey = hospitalData?.paystackPublicKey || process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;

    if (!secretKey) {
      return NextResponse.json(
        { 
          error: 'Paystack is not configured for this facility. Please enter Paystack API keys in Director Settings.' 
        },
        { status: 400 }
      );
    }

    // 2. Format Amount in Pesewas (GHS 1.00 = 100 Pesewas)
    const amountInPesewas = Math.round(Number(amount) * 100);

    // 3. Prepare Metadata for Cryptographic Webhook Reconciliation
    const metadata = {
      custom_fields: [
        { display_name: "Payment Category", variable_name: "payment_category", value: "PATIENT_BILL" },
        { display_name: "Hospital ID", variable_name: "hospital_id", value: hospitalId },
        { display_name: "Patient ID", variable_name: "patient_id", value: patientId || 'WALK_IN' },
        { display_name: "Patient Name", variable_name: "patient_name", value: patientName || 'Patient' },
        { display_name: "Cashier ID", variable_name: "cashier_id", value: cashierId || 'SYSTEM' },
        { display_name: "Billing Items", variable_name: "billing_item_ids", value: billingItemIds.join(',') },
        { display_name: "Total Amount GHS", variable_name: "total_amount", value: amount.toString() },
      ]
    };

    // 4. Initialize Transaction with Paystack Gateway
    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: patientEmail || `${patientId || 'patient'}@gam-med.com`,
        amount: amountInPesewas,
        currency: 'GHS',
        channels: ['mobile_money', 'card', 'bank'],
        callback_url: callbackUrl,
        metadata: metadata,
      }),
    });

    const paystackData = await paystackRes.json();

    if (!paystackRes.ok || !paystackData.status) {
      return NextResponse.json(
        { error: paystackData.message || 'Failed to initialize Paystack transaction.' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      authorizationUrl: paystackData.data.authorization_url,
      accessCode: paystackData.data.access_code,
      reference: paystackData.data.reference,
      publicKey: publicKey || null,
    });

  } catch (error: any) {
    console.error('Paystack Initialization Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error during checkout initialization.' },
      { status: 500 }
    );
  }
}
