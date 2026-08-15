import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      hospitalId,
      admissionId,
      patientId,
      patientName,
      bedId,
      wardName,
      clearedBy,
    } = body;

    const facilityClean = hospitalId || 'GAM-GAR-7578';
    const db = getAdminFirestore();

    const admIdClean = admissionId || `ADM-${Date.now()}`;
    const admRef = db.doc(`hospitals/${facilityClean}/admissions/${admIdClean}`);

    const batch = db.batch();
    const nowIso = new Date().toISOString();

    // 1. Update Admission Record Status to DISCHARGED
    batch.set(admRef, {
      status: 'DISCHARGED',
      dischargedAt: nowIso,
      dischargedBy: clearedBy || 'Attending Physician & Finance',
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    // 2. Free up physical bed in Bed Master catalog
    if (bedId) {
      const bedRef = db.doc(`hospitals/${facilityClean}/beds/${bedId}`);
      batch.set(bedRef, {
        status: 'VACANT_NEEDS_HOUSEKEEPING',
        occupiedByPatientId: null,
        occupiedByPatientName: null,
        lastDischargedAt: nowIso,
      }, { merge: true });
    }

    // 3. Generate Gate Pass Document
    const gatePassRef = db.collection(`hospitals/${facilityClean}/gate_passes`).doc();
    batch.set(gatePassRef, {
      id: gatePassRef.id,
      admissionId: admIdClean,
      patientId: patientId || 'p_janet',
      patientName: patientName || 'JANET BONAH',
      ward: wardName || 'FEMALE WARD A - Bed 04',
      issuedAt: nowIso,
      issuedBy: clearedBy || 'Attending Physician & Finance',
      status: 'VALID_FOR_EXIT',
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `Discharge finalized. Gate Pass ${gatePassRef.id} generated for ${patientName}. Bed marked vacant.`,
      gatePassId: gatePassRef.id,
    });
  } catch (error: any) {
    console.error('Inpatient Discharge API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Discharge execution failed' },
      { status: 500 }
    );
  }
}
