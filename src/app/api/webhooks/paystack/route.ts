// Forces Vercel to skip static generation for this route
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';

const db = adminDb;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Verify Paystack Signature
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const signature = req.headers.get('x-paystack-signature');
    
    if (!secret || !signature) {
        return new NextResponse('Missing signature', { status: 401 });
    }

    const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(body)).digest('hex');

    if (hash !== signature) {
      return new NextResponse('Invalid signature', { status: 401 });
    }
    
    const event = body;

    // 2. Logic for success
    if (event.event === 'charge.success') {
      const { hospital_id, billing_cycle, plan_id } = event.data.metadata.custom_fields.reduce((acc: any, curr: any) => ({...acc, [curr.variable_name]: curr.value}), {});
      
      const hospitalRef = db.collection("hospitals").doc(hospital_id);
      const hDoc = await hospitalRef.get();
      
      if (hDoc.exists) {
        const hospitalData = hDoc.data();
        const currentNextBilling = (hospitalData?.nextBillingDate as Timestamp)?.toDate() || new Date();
        const newNextBilling = new Date(currentNextBilling > new Date() ? currentNextBilling : new Date());

        if (billing_cycle === 'ANNUAL') {
          newNextBilling.setFullYear(newNextBilling.getFullYear() + 1);
        } else {
          newNextBilling.setMonth(newNextBilling.getMonth() + 1);
        }

        const newGracePeriod = new Date(newNextBilling);
        newGracePeriod.setDate(newGracePeriod.getDate() + 5);

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
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error('Webhook Error:', error.message);
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
  }
}
