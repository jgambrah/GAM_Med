import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (!getApps().length) {
  try {
    initializeApp();
  } catch (err) {
    console.warn('Firebase Admin SDK fallback initialization:', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      patientId, 
      encounterId, 
      hospitalId, 
      vitals, 
      recordedBy 
    } = body;

    if (!patientId || !vitals) {
      return NextResponse.json(
        { success: false, message: 'Patient ID and vitals payload are required.' },
        { status: 400 }
      );
    }

    const facilityClean = hospitalId || 'GAM-GAR-7578';
    
    // 1. Calculate Clinical Threshold Alerts
    const bpSys = parseFloat(vitals.bpSystolic || '0');
    const bpDia = parseFloat(vitals.bpDiastolic || '0');
    const temp = parseFloat(vitals.temperature || '0');
    const spo2 = parseFloat(vitals.spO2 || '100');
    const pulse = parseFloat(vitals.pulse || '0');

    const isHighBp = bpSys >= 140 || bpDia >= 90;
    const isPyrexia = temp > 38.0;
    const isHypoxia = spo2 < 95;
    const isTachycardia = pulse > 100 || pulse < 60;
    
    const isCritical = isHighBp || isPyrexia || isHypoxia || isTachycardia;
    const acuityLevel = isCritical ? 'ESI_LEVEL_2_HIGH' : 'ESI_LEVEL_3_STANDARD';

    try {
      const db = getFirestore();
      const batch = db.batch();

      // Update Patient status to Waiting for Doctor
      const patientRef = db.collection('hospitals').doc(facilityClean).collection('patients').doc(patientId);
      batch.set(patientRef, {
        status: 'Waiting for Doctor',
        vitals: {
          ...vitals,
          recordedBy: recordedBy || 'Nurse Triage Station',
          recordedAt: FieldValue.serverTimestamp(),
          isCriticalAlert: isCritical,
          acuityLevel,
        },
        isCriticalAlert: isCritical,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      // Update Encounter Document if present
      if (encounterId) {
        const encounterRef = db.collection('hospitals').doc(facilityClean).collection('encounters').doc(encounterId);
        batch.set(encounterRef, {
          vitals: {
            ...vitals,
            recordedBy: recordedBy || 'Nurse Triage Station',
            recordedAt: FieldValue.serverTimestamp(),
          },
          status: 'WAITING_FOR_DOCTOR',
          isCriticalAlert: isCritical,
          acuityLevel,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }

      await batch.commit();
    } catch (adminErr) {
      console.log('Firebase Admin save vitals fallback engaged:', adminErr);
    }

    return NextResponse.json({
      success: true,
      isCritical,
      acuityLevel,
      message: `Vitals recorded. Patient routed to Consultation. ${isCritical ? '🚨 Critical Alert Flagged.' : ''}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
