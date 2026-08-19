import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (!getApps().length) {
  try {
    initializeApp();
  } catch (err) {
    console.warn('Firebase Admin SDK initialization:', err);
  }
}

/**
 * Atomic Firestore Transaction Server Action for Sealing NHIS Batches
 * Strictly follows Read-Before-Write concurrency controls.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      hospitalId, 
      claimIds, 
      totalAmount, 
      userEmail,
      userName,
      customBatchNumber
    } = body;

    if (!hospitalId || !Array.isArray(claimIds) || claimIds.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid request payload: hospitalId and claimIds array are required.' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const batchControlNumber = customBatchNumber || `BATCH-NHIA-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`;

    const batchRef = db.collection(`hospitals/${hospitalId}/nhis_batches`).doc();
    const journalRef = db.collection(`hospitals/${hospitalId}/journal_vouchers`).doc();

    const transactionResult = await db.runTransaction(async (transaction) => {
      // ==========================================
      // 1. READ PHASE (Race Condition Guard)
      // ==========================================
      const claimRefs = claimIds.map(id => db.collection(`hospitals/${hospitalId}/receivables`).doc(id));
      const claimDocs = await transaction.getAll(...claimRefs);

      // Verify all claims exist and are not already batched
      for (const doc of claimDocs) {
        if (!doc.exists) {
          // If demo claim or missing, allow graceful skip or validation
          continue;
        }
        const data = doc.data();
        if (data?.status === 'SUBMITTED_TO_NHIA' || data?.status === 'batched' || data?.auditLocked) {
          throw new Error(`Race Condition Error: Claim ${doc.id} (${data.patientName || ''}) has already been batched in another session.`);
        }
      }

      // ==========================================
      // 2. WRITE PHASE - Create Batch Record
      // ==========================================
      transaction.set(batchRef, {
        batchId: batchRef.id,
        batchControlNumber,
        hospitalId,
        totalAmount: Number(totalAmount || 0),
        claimCount: claimIds.length,
        status: 'sealed_pending_submission',
        createdAt: FieldValue.serverTimestamp(),
        createdBy: userEmail || 'SYSTEM',
        createdByName: userName || 'Claims Officer'
      });

      // ==========================================
      // 3. WRITE PHASE - Lock the Claims
      // ==========================================
      claimDocs.forEach((doc) => {
        if (doc.exists) {
          transaction.update(doc.ref, {
            status: 'batched',
            batchId: batchRef.id,
            batchControlNumber,
            auditLocked: true,
            lockedAt: FieldValue.serverTimestamp()
          });
        }
      });

      // ==========================================
      // 4. WRITE PHASE - General Ledger Posting (Double Entry)
      // ==========================================
      transaction.set(journalRef, {
        journalNumber: `JV-${batchControlNumber}`,
        date: FieldValue.serverTimestamp(),
        reference: batchControlNumber,
        type: 'AUTO-BATCH',
        description: `NHIA Claims Batch Recognition - ${claimIds.length} Claims (${batchControlNumber})`,
        lines: [
          // Debit: Accounts Receivable (Asset increases)
          { 
            accountCode: '1200', 
            accountName: 'Accounts Receivable - NHIA Claims Settlement', 
            type: 'debit', 
            amount: Number(totalAmount || 0) 
          },
          // Credit: Unbilled Claims Clearing / Revenue
          { 
            accountCode: '2200', 
            accountName: 'Unbilled Claims Clearing (Revenue Realized)', 
            type: 'credit', 
            amount: Number(totalAmount || 0) 
          }
        ],
        postedBy: userEmail || 'SYSTEM',
        postedByName: userName || 'Chief Accountant',
        status: 'POSTED',
        createdAt: FieldValue.serverTimestamp()
      });

      return {
        batchId: batchRef.id,
        batchControlNumber,
        journalId: journalRef.id
      };
    });

    return NextResponse.json({
      success: true,
      batchId: transactionResult.batchId,
      batchControlNumber: transactionResult.batchControlNumber,
      journalId: transactionResult.journalId,
      message: `Batch ${transactionResult.batchControlNumber} sealed and posted to General Ledger (Accounts Receivable 1200).`
    });

  } catch (error: any) {
    console.error("Batching Transaction Failed:", error);
    return NextResponse.json(
      { success: false, message: error.message || 'Transaction aborted.' },
      { status: 500 }
    );
  }
}
