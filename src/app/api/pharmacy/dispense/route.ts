import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      hospitalId,
      encounterId,
      patientId,
      patientName,
      items,
      pharmacistUid,
      pharmacistName,
      paymentMethod,
    } = body;

    const facilityClean = hospitalId || 'GAM-GAR-7578';
    const db = getAdminFirestore();

    const batch = db.batch();

    // 1. Process Inventory Deductions
    const processedItems: any[] = [];
    if (items && Array.isArray(items)) {
      for (const rxItem of items) {
        const qtyToDeduct = Number(rxItem.qty || rxItem.quantity || 1);
        const itemId = rxItem.itemId || rxItem.id;

        if (itemId) {
          const invRef = db.doc(`hospitals/${facilityClean}/pharmacy_inventory/${itemId}`);
          const invDoc = await invRef.get();

          if (invDoc.exists) {
            const currentStock = Number(invDoc.data()?.quantityInStock ?? invDoc.data()?.quantity ?? 0);
            const newStock = Math.max(0, currentStock - qtyToDeduct);
            batch.update(invRef, {
              quantityInStock: newStock,
              quantity: newStock,
              lastDispensedAt: FieldValue.serverTimestamp(),
              lastDispensedBy: pharmacistName || 'Pharmacist',
            });
          }
        }

        processedItems.push({
          name: rxItem.name || 'Medication',
          qty: qtyToDeduct,
          dosage: rxItem.dosage || '',
          unitPrice: rxItem.unitPrice || 15.00,
        });
      }
    }

    // 2. Mark Encounter or Dispensing Record as FULFILLED
    const dispLogRef = db.collection(`hospitals/${facilityClean}/dispensing_logs`).doc();
    const nowIso = new Date().toISOString();

    batch.set(dispLogRef, {
      id: dispLogRef.id,
      encounterId: encounterId || `ENC-${Date.now()}`,
      patientId: patientId || 'P-100',
      patientName: patientName || 'Patient',
      items: processedItems,
      batchId: body.batchId || 'B-882',
      wasSubstituted: body.wasSubstituted || false,
      pharmacistUid: pharmacistUid || 'pharm_01',
      pharmacistName: pharmacistName || 'Chief Pharmacist',
      paymentMethod: paymentMethod || 'NHIS Insurance',
      status: 'FULFILLED',
      dispensedAt: nowIso,
      createdAt: FieldValue.serverTimestamp(),
    });

    // 3. Post Double-Entry Journal to Central Finance Ledger
    const journalRef = db.collection(`hospitals/${facilityClean}/journal_vouchers`).doc();
    const totalAmount = processedItems.reduce((acc, i) => acc + (i.qty * i.unitPrice), 0);

    batch.set(journalRef, {
      id: journalRef.id,
      voucherNumber: `JV-PHARM-${Date.now().toString().slice(-6)}`,
      encounterId: encounterId || `ENC-${Date.now()}`,
      patientName: patientName || 'Patient',
      description: `Medication Dispensing - ${processedItems.length} lines for ${patientName}`,
      debitAccount: '1100-ACCOUNTS-RECEIVABLE',
      creditAccount: '4100-PHARMACY-REVENUE',
      amount: totalAmount,
      currency: 'GHS',
      postedBy: pharmacistName || 'Chief Pharmacist',
      postedAt: nowIso,
      status: 'POSTED',
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `Dispensing complete. Deducted inventory lines and posted GHS ${totalAmount.toFixed(2)} journal to ledger.`,
      dispenseLogId: dispLogRef.id,
    });
  } catch (error: any) {
    console.error('Pharmacy Dispense API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to complete dispensing operation' },
      { status: 500 }
    );
  }
}
