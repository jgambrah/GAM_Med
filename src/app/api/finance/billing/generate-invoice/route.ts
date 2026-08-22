import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      hospitalId,
      payerId,
      payerName,
      totalAmount,
      claimCount,
      excludedCount,
      excludedAmount,
      activeClaims,
      userName,
      userUid
    } = body;

    if (!hospitalId) {
      return NextResponse.json({ error: 'Hospital ID is required' }, { status: 400 });
    }

    if (!Array.isArray(activeClaims) || activeClaims.length === 0) {
      return NextResponse.json({ error: 'No active claims provided for corporate invoice' }, { status: 400 });
    }

    const safePayerPrefix = (payerName || 'CORP')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 5)
      .toUpperCase();
    
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const invoiceId = `INV-${safePayerPrefix}-${yearMonth}`;

    const db = getAdminFirestore();
    const batch = db.batch();

    // 1. Create Corporate Master Invoice
    const masterInvoiceRef = db.doc(`hospitals/${hospitalId}/corporate_invoices/${invoiceId}`);
    batch.set(masterInvoiceRef, {
      invoiceId,
      payerId: payerId || 'payer-corporate',
      payerName: payerName || 'Corporate Health Payer',
      totalAmount: Number(totalAmount || 0),
      claimCount: Number(claimCount || activeClaims.length),
      excludedCount: Number(excludedCount || 0),
      excludedAmount: Number(excludedAmount || 0),
      status: 'BILLED',
      billedBy: userUid || 'ACCOUNTANT',
      billedByName: userName || 'Marcus Amosah Henaku',
      billedAt: admin.firestore.FieldValue.serverTimestamp(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 Days Net Terms
      period: yearMonth
    }, { merge: true });

    // 2. Lock active patient claims
    for (const claim of activeClaims) {
      if (claim.id && !claim.id.startsWith('clm-demo')) {
        const claimRef = db.doc(`hospitals/${hospitalId}/receivables/${claim.id}`);
        batch.set(claimRef, {
          status: 'BILLED',
          masterInvoiceId: invoiceId,
          billedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }
    }

    // 3. Push to AR Aging Matrix (Receivables collection)
    const arMasterRef = db.doc(`hospitals/${hospitalId}/receivables/${invoiceId}`);
    batch.set(arMasterRef, {
      id: invoiceId,
      payerId: payerId || 'payer-corporate',
      payerName: payerName || 'Corporate Health Payer',
      invoiceNumber: invoiceId,
      amount: Number(totalAmount || 0),
      netAmount: Number(totalAmount || 0),
      agingBucket: '0-30 Days',
      status: 'UNPAID',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }, { merge: true });

    // 4. Post Double-Entry Journal Voucher (DR 1200 / CR 4050)
    const jvRef = db.collection(`hospitals/${hospitalId}/journal_vouchers`).doc();
    batch.set(jvRef, {
      jvNumber: `JV-${invoiceId}`,
      source: 'CORPORATE_BILLING',
      datePosted: admin.firestore.FieldValue.serverTimestamp(),
      preparerId: userUid || 'ACCOUNTANT',
      preparerName: userName || 'Marcus Amosah Henaku',
      narration: `Corporate Master Invoice ${invoiceId} for ${payerName}. Total ${activeClaims.length} claims locked. Value: GHS ${Number(totalAmount || 0).toFixed(2)}.`,
      status: 'POSTED',
      hospitalId,
      period: yearMonth,
      entries: [
        { 
          accountCode: '1200', 
          accountName: `Accounts Receivable - ${payerName}`, 
          debit: Number(totalAmount || 0), 
          credit: 0 
        },
        { 
          accountCode: '4050', 
          accountName: 'Unbilled Corporate Revenue Clearing', 
          debit: 0, 
          credit: Number(totalAmount || 0) 
        }
      ]
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      invoiceId,
      payerName,
      totalAmount: Number(totalAmount || 0),
      claimCount: activeClaims.length,
      excludedCount: Number(excludedCount || 0),
      excludedAmount: Number(excludedAmount || 0)
    });

  } catch (error: any) {
    console.error('Error generating corporate invoice:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal Server Error while generating corporate invoice' 
    }, { status: 500 });
  }
}
