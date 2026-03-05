import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'crypto';
import { Resend } from 'resend';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Add this line to prevent Next.js from trying to pre-render this during build
export const dynamic = 'force-dynamic';

// Initialize with a fallback to prevent build crashes
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_for_build');

// Securely initialize Firebase Admin SDK
if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
  initializeApp({
    credential: cert(serviceAccount)
  });
}
const db = getFirestore();


export async function POST(req: NextRequest) {
  const secret = process.env.PAYSTACK_SECRET_KEY;

  if (!secret) {
    console.error("Paystack secret key is not set.");
    return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
  }

  const body = await req.json();
  const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(body)).digest('hex');

  // 1. Verify that the request actually came from Paystack
  if (hash !== req.headers.get('x-paystack-signature')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const event = body;

  if (event.event === 'charge.success') {
    try {
      const { hospital_id, billing_cycle, plan_id } = event.data.metadata.custom_fields.reduce((acc: any, curr: any) => ({...acc, [curr.variable_name]: curr.value}), {});
      
      const hospitalRef = db.collection("hospitals").doc(hospital_id);
      const hDoc = await hospitalRef.get();
      
      if (hDoc.exists) {
        const hospitalData = hDoc.data();
        const currentNextBilling = (hospitalData?.nextBillingDate as Timestamp)?.toDate() || new Date();
        const newNextBilling = new Date(currentNextBilling > new Date() ? currentNextBilling : new Date());

        // 2. Add Time: 30 Days or 365 Days
        if (billing_cycle === 'ANNUAL') {
          newNextBilling.setFullYear(newNextBilling.getFullYear() + 1);
        } else {
          newNextBilling.setMonth(newNextBilling.getMonth() + 1);
        }

        const newGracePeriod = new Date(newNextBilling);
        newGracePeriod.setDate(newGracePeriod.getDate() + 5);

        // 3. EXECUTE RE-ACTIVATION
        await hospitalRef.update({
          nextBillingDate: Timestamp.fromDate(newNextBilling),
          gracePeriodExpiry: Timestamp.fromDate(newGracePeriod),
          subscriptionStatus: 'ACTIVE',
          status: 'active',
          subscriptionPlan: plan_id,
          lastPaymentRef: event.data.reference
        });
        
        console.log(`✅ System Reactivated for ${hospital_id} until ${newNextBilling.toDateString()}`);
      }
    } catch (error) {
        console.error("Webhook processing error:", error);
    }
  }

  return NextResponse.json({ received: true });
}
