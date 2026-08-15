import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      hospitalId,
      orderId,
      encounterId,
      patientId,
      patientName,
      scanType,
      findings,
      impression,
      isCritical,
      imageUrl,
      radiologistName,
    } = body;

    const facilityClean = hospitalId || 'GAM-GAR-7578';
    const db = getAdminFirestore();

    const orderIdClean = orderId || `RAD-${Date.now()}`;
    const orderRef = db.doc(`hospitals/${facilityClean}/radiology_orders/${orderIdClean}`);

    const batch = db.batch();
    const nowIso = new Date().toISOString();

    // 1. Update Radiology Order document
    batch.set(orderRef, {
      status: 'COMPLETED',
      findings,
      impression,
      isCritical: !!isCritical,
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&q=80',
      radiologistName: radiologistName || 'Chief Radiologist',
      completedAt: nowIso,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    // 2. Inject report summary into Patient Encounter document
    if (encounterId) {
      const encounterRef = db.doc(`hospitals/${facilityClean}/encounters/${encounterId}`);
      batch.set(encounterRef, {
        radiologyResults: FieldValue.arrayUnion({
          orderId: orderIdClean,
          scanType: scanType || 'Radiology Scan',
          impression,
          findings,
          isCritical: !!isCritical,
          imageUrl: imageUrl || 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&q=80',
          completedAt: nowIso,
        }),
      }, { merge: true });
    }

    // 3. Push Doctor EMR Critical Panic Alert if flagged
    if (isCritical) {
      const alertRef = db.collection(`hospitals/${facilityClean}/emr_alerts`).doc();
      batch.set(alertRef, {
        id: alertRef.id,
        type: 'CRITICAL_RADIOLOGY_ALERT',
        patientId: patientId || 'p_janet',
        patientName: patientName || 'JANET BONAH',
        orderId: orderIdClean,
        message: `🚨 CRITICAL RADIOLOGY PANIC ALERT: ${scanType} for ${patientName} shows high-risk abnormality: ${impression}`,
        severity: 'CRITICAL',
        status: 'UNREAD',
        createdAt: nowIso,
      });
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `Report finalized and transmitted to EMR for ${patientName}.`,
      orderId: orderIdClean,
    });
  } catch (error: any) {
    console.error('Publish Radiology Report API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to transmit radiology report' },
      { status: 500 }
    );
  }
}
