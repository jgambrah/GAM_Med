import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { hospitalId, mode, locums, clinicianId, shiftIds, makerName, makerUid } = body;

    if (!hospitalId) {
      return NextResponse.json({ error: 'Hospital ID is required' }, { status: 400 });
    }

    const db = getAdminFirestore();

    // -------------------------------------------------------------
    // CASE A: MULTI-PAYEE BATCH PV GENERATION
    // -------------------------------------------------------------
    if (mode === 'BATCH' && Array.isArray(locums) && locums.length > 0) {
      let totalGross = 0;
      let totalWht = 0;
      let totalNet = 0;
      const batchPayees: any[] = [];
      const allShiftRefs: admin.firestore.DocumentReference[] = [];

      for (let i = 0; i < locums.length; i++) {
        const l = locums[i];
        if (!l.tin) {
          return NextResponse.json({
            error: `Cannot generate Batch PV. ${l.name} is missing a statutory GRA TIN.`
          }, { status: 400 });
        }

        const gross = Number(l.grossPayable || 0);
        const wht = Number(l.whtAmount || gross * 0.075);
        const net = Number(l.netPayable || gross - wht);

        totalGross += gross;
        totalWht += wht;
        totalNet += net;

        batchPayees.push({
          id: `line-${i + 1}`,
          payeeName: l.name,
          staffId: l.staffId,
          department: l.role || 'Locum Clinical Specialist',
          grossAmount: gross,
          whtRate: 0.075,
          whtAmount: wht,
          netPayable: net,
          paymentChannel: l.paymentChannel || 'Bank Transfer / MoMo'
        });

        if (Array.isArray(l.shifts)) {
          l.shifts.forEach((s: any) => {
            if (s.id) {
              allShiftRefs.push(db.collection(`hospitals/${hospitalId}/attendance_logs`).doc(s.id));
            }
          });
        }
      }

      const safeGross = Math.round(totalGross * 100) / 100;
      const safeWht = Math.round(totalWht * 100) / 100;
      const safeNet = Math.round(totalNet * 100) / 100;
      const pvNumber = `PV-BATCH-LOC-${Date.now().toString().slice(-6)}`;
      const pvRef = db.collection(`hospitals/${hospitalId}/payment_vouchers`).doc();

      await db.runTransaction(async (transaction) => {
        // 1. Lock all underlying shifts
        allShiftRefs.forEach((ref) => {
          transaction.update(ref, {
            paymentStatus: 'PAID',
            status: 'VOUCHER_GENERATED',
            linkedPvId: pvRef.id,
            pvReference: pvNumber,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        });

        // 2. Create Consolidated Multi-Payee Batch Payment Voucher
        transaction.set(pvRef, {
          pvNumber,
          disbursementMode: 'BATCH',
          type: 'LOCUM_BATCH_PAYMENT',
          category: 'LOCUM',
          payee: `Consolidated Locum Batch (${locums.length} Clinicians)`,
          narration: `Clinical Locum Shift Allowances for ${locums.length} Clinicians (7.5% GRA WHT Deducted)`,
          grossAmount: safeGross,
          whtRate: 0.075,
          whtAmount: safeWht,
          netAmount: safeNet,
          vatAmount: 0,
          batchPayees,
          debitAccountCode: '5120',
          debitAccountName: 'Locum & Clinical Consultancy Fees',
          creditAccountCode: '1001',
          creditAccountName: 'Cash at Bank - GCB Main Operating Account',
          status: 'AWAITING_FINANCE_APPROVAL',
          createdBy: makerUid || 'maker',
          createdByName: makerName || 'Preparer (Maker)',
          processedByName: makerName || 'Preparer (Maker)',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      return NextResponse.json({
        success: true,
        pvNumber,
        pvId: pvRef.id,
        grossAmount: safeGross,
        whtAmount: safeWht,
        netAmount: safeNet,
        payeeCount: locums.length,
        message: `Consolidated Batch PV ${pvNumber} (${locums.length} Clinicians) created successfully. Routed to Checker Queue.`
      });
    }

    // -------------------------------------------------------------
    // CASE B: SINGLE LOCUM PV GENERATION
    // -------------------------------------------------------------
    if (!clinicianId || !Array.isArray(shiftIds) || shiftIds.length === 0) {
      return NextResponse.json({ error: 'Clinician ID and shift references are required' }, { status: 400 });
    }

    const clinicianRef = db.collection(`hospitals/${hospitalId}/locum_registry`).doc(clinicianId);
    const pvRef = db.collection(`hospitals/${hospitalId}/payment_vouchers`).doc();

    const result = await db.runTransaction(async (transaction) => {
      let clinicianData: any = null;
      const clinicianDoc = await transaction.get(clinicianRef);
      if (clinicianDoc.exists) {
        clinicianData = clinicianDoc.data();
      } else {
        const userDoc = await transaction.get(db.collection('users').doc(clinicianId));
        if (userDoc.exists) clinicianData = userDoc.data();
      }

      const clinicianName = clinicianData?.name || clinicianData?.displayName || clinicianData?.fullName || 'Locum Clinician';
      const clinicianTin = clinicianData?.tin || clinicianData?.tinNumber;

      if (!clinicianTin || clinicianTin === 'MISSING') {
        throw new Error(`Cannot generate PV. ${clinicianName} is missing a statutory GRA TIN.`);
      }

      let calculatedGross = 0;
      const shiftDocs: Array<{ ref: admin.firestore.DocumentReference; data: any }> = [];

      for (const shiftId of shiftIds) {
        const shiftRef = db.collection(`hospitals/${hospitalId}/attendance_logs`).doc(shiftId);
        const shiftDoc = await transaction.get(shiftRef);

        if (!shiftDoc.exists) {
          throw new Error(`Shift ${shiftId} was not found.`);
        }

        const shiftData = shiftDoc.data();
        const hours = Number(shiftData?.hoursWorked || shiftData?.duration || 0);
        const rate = Number(shiftData?.hourlyRate || 80);
        calculatedGross += hours * rate;

        shiftDocs.push({ ref: shiftRef, data: shiftData });
      }

      const whtAmount = calculatedGross * 0.075;
      const netPayable = calculatedGross - whtAmount;

      const safeGross = Math.round(calculatedGross * 100) / 100;
      const safeWht = Math.round(whtAmount * 100) / 100;
      const safeNet = Math.round(netPayable * 100) / 100;
      const pvNumber = `PV-LOC-${Date.now().toString().slice(-6)}`;

      // Lock shifts
      shiftDocs.forEach(s => {
        transaction.update(s.ref, {
          paymentStatus: 'PAID',
          status: 'VOUCHER_GENERATED',
          linkedPvId: pvRef.id,
          pvReference: pvNumber,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      // Write Voucher
      transaction.set(pvRef, {
        pvNumber,
        disbursementMode: 'SINGLE',
        type: 'LOCUM_PAYMENT',
        category: 'LOCUM',
        payeeId: clinicianId,
        payee: clinicianName,
        payeeTin: clinicianTin,
        narration: `Locum Shift Honorarium for ${clinicianName} (${shiftIds.length} Shift Logs, 7.5% WHT Deducted)`,
        grossAmount: safeGross,
        whtRate: 0.075,
        whtAmount: safeWht,
        netAmount: safeNet,
        vatAmount: 0,
        debitAccountCode: '4003',
        debitAccountName: 'Locum & Clinical Consultancy Fees',
        creditAccountCode: '1001',
        creditAccountName: 'Cash at Bank - GCB Main Operating Account',
        status: 'AWAITING_FINANCE_APPROVAL',
        createdBy: makerUid || 'maker',
        createdByName: makerName || 'Preparer (Maker)',
        processedByName: makerName || 'Preparer (Maker)',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return { pvNumber, safeGross, safeWht, safeNet, clinicianName };
    });

    return NextResponse.json({
      success: true,
      pvNumber: result.pvNumber,
      grossAmount: result.safeGross,
      whtAmount: result.safeWht,
      netAmount: result.safeNet,
      message: `Payment Voucher ${result.pvNumber} generated successfully for ${result.clinicianName}. Routed to Checker Queue.`
    });
  } catch (err: any) {
    console.error('Locum Voucher API Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate locum voucher' }, { status: 500 });
  }
}
