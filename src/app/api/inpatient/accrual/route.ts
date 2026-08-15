import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const facilityClean = body.hospitalId || 'GAM-GAR-7578';
    const db = getAdminFirestore();

    // Query all currently admitted patients
    const admissionsSnap = await db
      .collection(`hospitals/${facilityClean}/admissions`)
      .where('status', '==', 'ADMITTED')
      .get();

    const bedTariffs: Record<string, number> = {
      'VIP_SUITE': 850.00,
      'PRIVATE_ROOM': 500.00,
      'SEMI_PRIVATE': 350.00,
      'GENERAL_WARD': 250.00,
      'ICU_BED': 1500.00,
    };

    let totalAccrued = 0;
    let countProcessed = 0;

    const batch = db.batch();
    const nowIso = new Date().toISOString();

    admissionsSnap.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const wardCategory = data.bedCategory || 'GENERAL_WARD';
      const dailyRate = bedTariffs[wardCategory] || 250.00;

      // 1. Post daily accrual line item to patient billing items
      const billItemRef = db.collection(`hospitals/${facilityClean}/billing_items`).doc();
      batch.set(billItemRef, {
        id: billItemRef.id,
        encounterId: data.encounterId || data.id,
        patientId: data.patientId || 'p_benjamin',
        patientName: data.patientName || 'Admitted Patient',
        category: 'INPATIENT_ROOM_BOARD',
        description: `Daily Room & Board Accrual (${data.wardName || 'Ward Bed'})`,
        amount: dailyRate,
        billingType: data.paymentMethod || 'CASH',
        status: 'UNPAID',
        accruedAt: nowIso,
        createdAt: FieldValue.serverTimestamp(),
      });

      // 2. Post Journal Voucher to Ledger
      const journalRef = db.collection(`hospitals/${facilityClean}/journal_vouchers`).doc();
      batch.set(journalRef, {
        id: journalRef.id,
        voucherNumber: `JV-BED-${Date.now().toString().slice(-6)}-${countProcessed}`,
        encounterId: data.encounterId || data.id,
        patientName: data.patientName || 'Admitted Patient',
        description: `Automated Midnight Room & Board Accrual - ${data.wardName || 'Ward Bed'}`,
        debitAccount: '1100-ACCOUNTS-RECEIVABLE',
        creditAccount: '4200-INPATIENT-REVENUE',
        amount: dailyRate,
        currency: 'GHS',
        postedBy: 'SYSTEM_CRON_ACCROUAL_ENGINE',
        postedAt: nowIso,
        status: 'POSTED',
      });

      // 3. Increment total running balance on admission record
      batch.update(docSnap.ref, {
        runningBalance: FieldValue.increment(dailyRate),
        lastAccruedAt: nowIso,
      });

      totalAccrued += dailyRate;
      countProcessed++;
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `Midnight Accrual Engine completed. Processed ${countProcessed} admitted beds for GHS ${totalAccrued.toLocaleString('en-GH', { minimumFractionDigits: 2 })} total revenue.`,
      countProcessed,
      totalAccrued,
    });
  } catch (error: any) {
    console.error('Inpatient Accrual Engine Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process midnight billing accruals' },
      { status: 500 }
    );
  }
}
