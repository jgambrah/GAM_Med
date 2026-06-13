// Forces Vercel to skip static generation for this route
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'crypto';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';

const db = adminDb;

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const url = new URL(req.url);
    const hospitalId = url.searchParams.get('hospitalId') || url.searchParams.get('hospital_id');

    if (hospitalId) {
      // 1. Fetch Hospital configuration
      const hospitalRef = db.collection("hospitals").doc(hospitalId);
      const hDoc = await hospitalRef.get();
      if (!hDoc.exists) {
        return new NextResponse('Hospital not found', { status: 404 });
      }

      const hData = hDoc.data();
      const secret = hData?.paystackSecretKey;
      if (!secret) {
        return new NextResponse('Paystack keys not configured', { status: 400 });
      }

      // 2. Verify Paystack Signature using Hospital's custom secret key
      const signature = req.headers.get('x-paystack-signature');
      if (!signature) {
        return new NextResponse('Missing signature', { status: 401 });
      }

      const hash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
      if (hash !== signature) {
        return new NextResponse('Invalid signature', { status: 401 });
      }

      const event = JSON.parse(rawBody);

      // 3. Process Patient checkout payments
      if (event.event === 'charge.success') {
        const metadata = event.data.metadata;
        const customFields = metadata?.custom_fields || [];
        const fields = customFields.reduce((acc: any, curr: any) => ({...acc, [curr.variable_name]: curr.value}), {});

        if (fields.payment_category === 'PATIENT_BILL') {
          const patientId = fields.patient_id;
          const patientName = fields.patient_name || 'Patient';
          const billingItemIdsStr = fields.billing_item_ids || '';
          const billingItemIds = billingItemIdsStr.split(',').filter(Boolean);
          const isMortuary = fields.is_mortuary === 'true';
          const chamberId = fields.chamber_id || '';
          const totalAmount = Number(fields.total_amount || 0);

          if (billingItemIds.length > 0) {
            let assignedPaymentId = '';

            await db.runTransaction(async (transaction) => {
              const hDocSnap = await transaction.get(hospitalRef);
              const hDataSnap = hDocSnap.data();
              const prefix = hDataSnap?.mrnPrefix || 'GAM';
              const currentReceiptCount = (hDataSnap?.receiptCounter || 0) + 1;
              const year = new Date().getFullYear().toString().slice(-2);
              const paymentId = `${prefix}-REC-${year}-${currentReceiptCount.toString().padStart(4, '0')}`;
              assignedPaymentId = paymentId;

              const paymentRef = hospitalRef.collection('payments').doc(paymentId);
              transaction.set(paymentRef, {
                paymentId: paymentId,
                patientId: patientId,
                patientName: patientName,
                totalAmount: totalAmount,
                paymentMode: 'MoMo',
                hospitalId: hospitalId,
                processedBy: 'SYSTEM_PAYSTACK',
                processedByName: 'Paystack Gateway',
                createdAt: FieldValue.serverTimestamp(),
                paystackReference: event.data.reference
              });

              // Mark all billing items as PAID
              billingItemIds.forEach((itemId: string) => {
                const itemRef = hospitalRef.collection('billing_items').doc(itemId);
                transaction.update(itemRef, { status: 'PAID', paymentId: paymentId });
              });

              // If it's a mortuary record, finalize the release and free the chamber
              if (isMortuary) {
                const recordRef = hospitalRef.collection('mortuary_records').doc(patientId);
                transaction.update(recordRef, {
                  status: 'RELEASED',
                  releasedAt: FieldValue.serverTimestamp(),
                });

                if (chamberId) {
                  const chamberRef = hospitalRef.collection('mortuary_chambers').doc(chamberId);
                  transaction.update(chamberRef, {
                    status: 'AVAILABLE',
                    bodyId: null,
                    bodyName: null,
                    admittedAt: null,
                  });
                }
              }

              // Increment receipt counter
              transaction.update(hospitalRef, { receiptCounter: FieldValue.increment(1) });
            });

            console.log(`✅ Webhook Patient Payment Processed: ${assignedPaymentId} for ${patientName}`);
          }
        }
      }

      return NextResponse.json({ received: true }, { status: 200 });

    } else {
      // 1. Verify Paystack Signature (Global SaaS Platform subscription)
      const secret = process.env.PAYSTACK_SECRET_KEY;
      const signature = req.headers.get('x-paystack-signature');
      
      if (!secret || !signature) {
          return new NextResponse('Missing signature', { status: 401 });
      }

      const hash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');

      if (hash !== signature) {
        return new NextResponse('Invalid signature', { status: 401 });
      }
      
      const event = JSON.parse(rawBody);

      // 2. Logic for success (SaaS billing)
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
    }
  } catch (error: any) {
    console.error('Webhook Error:', error.message);
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
  }
}
