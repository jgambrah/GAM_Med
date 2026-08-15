import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      hospitalId,
      orderId,
      patientId,
      patientName,
      ehrId,
      doctorUid,
      doctorName,
      testName,
      priority,
      results,
      technicianNotes,
      labTechUid,
      labTechName,
    } = body;

    const facilityClean = hospitalId || 'GAM-GAR-7578';
    const db = getAdminFirestore();

    const orderDocId = orderId || `REQ-LAB-${Date.now()}`;
    const orderRef = db.doc(`hospitals/${facilityClean}/lab_orders/${orderDocId}`);

    // Determine if any parameter has a HIGH or LOW flag
    let isAnyAbnormal = false;
    let criticalAlertText = '';

    if (results) {
      Object.keys(results).forEach((paramKey) => {
        const item = results[paramKey];
        if (item && (item.flag === 'HIGH' || item.flag === 'LOW')) {
          isAnyAbnormal = true;
          criticalAlertText += `${item.name}: ${item.value} ${item.unit} [${item.flag}]; `;
        }
      });
    }

    const completedAtIso = new Date().toISOString();

    // 1. Update the lab order to COMPLETED with finalized parameter matrix
    await orderRef.set({
      id: orderDocId,
      hospitalId: facilityClean,
      patientId: patientId || 'p_benjamin',
      patientName: patientName || 'BENJAMIN HEDIDOR',
      ehrId: ehrId || 'MMH/EHR/26/0007',
      providerUid: doctorUid || 'doc_gambrah',
      providerName: doctorName || 'Dr. James Gambrah',
      testName: testName || 'Full Blood Count (FBC)',
      priority: priority || 'STAT',
      status: 'COMPLETED',
      completedAt: completedAtIso,
      labTechUid: labTechUid || 'tech_01',
      labTechName: labTechName || 'Biomedical Scientist',
      technicianNotes: technicianNotes || '',
      isAbnormal: isAnyAbnormal,
      resultsMatrix: results || {},
      resultSummary: isAnyAbnormal ? `ABNORMAL: ${criticalAlertText}` : 'All parameters within reference range.',
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    // 2. Also save to standalone lab_results collection for historical audit
    const labResultRef = db.doc(`hospitals/${facilityClean}/lab_results/${orderDocId}`);
    await labResultRef.set({
      orderId: orderDocId,
      patientId: patientId || 'p_benjamin',
      patientName: patientName || 'BENJAMIN HEDIDOR',
      ehrId: ehrId || 'MMH/EHR/26/0007',
      testName: testName || 'Full Blood Count (FBC)',
      results: results || {},
      isAbnormal: isAnyAbnormal,
      technicianNotes: technicianNotes || '',
      publishedAt: completedAtIso,
      publishedBy: labTechName || 'Biomedical Scientist',
    }, { merge: true });

    // 3. Trigger Doctor Alert / Notification in EMR
    if (isAnyAbnormal) {
      const alertRef = db.collection(`hospitals/${facilityClean}/system_alerts`).doc();
      await alertRef.set({
        id: alertRef.id,
        type: 'CRITICAL_LAB_RESULT',
        patientId: patientId || 'p_benjamin',
        patientName: patientName || 'BENJAMIN HEDIDOR',
        ehrNumber: ehrId || 'MMH/EHR/26/0007',
        testName: testName || 'Full Blood Count (FBC)',
        summary: criticalAlertText,
        severity: 'CRITICAL',
        createdAt: completedAtIso,
        status: 'UNREAD',
        targetDoctorUid: doctorUid || 'doc_gambrah',
      });
    }

    return NextResponse.json({
      success: true,
      message: `Diagnostic results for ${testName} published to Doctor EMR Console successfully.`,
      orderId: orderDocId,
      isAbnormal: isAnyAbnormal,
    });
  } catch (error: any) {
    console.error('Publish Lab Results Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to publish laboratory results' },
      { status: 500 }
    );
  }
}
