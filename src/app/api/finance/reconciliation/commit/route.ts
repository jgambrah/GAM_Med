import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { 
      hospitalId, 
      selectedBankAccount, 
      period, 
      statementClosingBalance, 
      summaryTelemetry, 
      clearedLines, 
      userName 
    } = body;

    if (!hospitalId) {
      return NextResponse.json({ error: 'Hospital ID is required' }, { status: 400 });
    }

    if (!Array.isArray(clearedLines) || clearedLines.length === 0) {
      return NextResponse.json({ error: 'No cleared transactions provided for reconciliation' }, { status: 400 });
    }

    const db = getAdminFirestore();
    const batch = db.batch();

    const reconciliationRunId = `REC-${(selectedBankAccount || '1001-GCB').replace(/\s+/g, '-')}-${Date.now()}`;
    const recHeaderRef = db.doc(`hospitals/${hospitalId}/bank_reconciliations/${reconciliationRunId}`);

    let liveUpdatesCount = 0;

    for (const item of clearedLines) {
      // If it's a real live Firestore document, update its reconciled state
      if (!item.isDemo && item.firestoreId && !item.firestoreId.startsWith('jv-auto-') && !item.firestoreId.startsWith('pv-10') && !item.firestoreId.startsWith('pay-20')) {
        const collectionName = item.ledgerDocType === 'OUTFLOW' ? 'payment_vouchers' : 'payments';
        const docRef = db.doc(`hospitals/${hospitalId}/${collectionName}/${item.firestoreId}`);

        batch.set(docRef, {
          reconciled: true,
          reconciledAt: admin.firestore.FieldValue.serverTimestamp(),
          reconciliationRunId,
          bankClearedDate: item.bankDate,
          bankDescription: item.bankDescription,
          bankReference: item.bankReference,
          status: item.ledgerDocType === 'OUTFLOW' ? 'PAID' : 'COMPLETED',
        }, { merge: true });

        liveUpdatesCount++;
      }
    }

    // Save immutable IFRS Audit Reconciliation Run Document
    batch.set(recHeaderRef, {
      reconciliationId: reconciliationRunId,
      bankAccount: selectedBankAccount || '1001-GCB',
      period: period || 'AUGUST 2026',
      statementClosingBalance: Number(statementClosingBalance || 0),
      depositsInTransit: Number(summaryTelemetry?.depositsInTransit || 0),
      unpresentedCheques: Number(summaryTelemetry?.unpresentedCheques || 0),
      adjustedBankBalance: Number(summaryTelemetry?.adjustedBankBalance || 0),
      cashBookBalance: Number(summaryTelemetry?.cashBookBalance || 0),
      netVariance: Number(summaryTelemetry?.variance || 0),
      isBalanced: Boolean(summaryTelemetry?.isBalanced),
      clearedCount: clearedLines.length,
      liveDocumentsUpdated: liveUpdatesCount,
      clearedLines,
      reconciledBy: userName || 'FINANCE CONTROLLER',
      reconciledAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await batch.commit();

    return NextResponse.json({
      success: true,
      reconciliationRunId,
      clearedCount: clearedLines.length,
      liveUpdatesCount,
      message: `Reconciliation run ${reconciliationRunId} committed successfully with ${clearedLines.length} lines.`
    });

  } catch (error: any) {
    console.error('Error committing bank reconciliation:', error);
    return NextResponse.json({
      error: error.message || 'Failed to commit bank reconciliation transaction'
    }, { status: 500 });
  }
}
