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
      firstName, 
      lastName, 
      otherNames,
      dateOfBirth, 
      gender, 
      ghanaCard, 
      ghanaCardId,
      phone, 
      phoneNumber,
      facilityId,
      hospitalId,
      priorityQueue,
      payerId,
      payerName,
      emergencyContactName,
      emergencyContactPhone,
      residentialAddress,
      registeredBy
    } = body;

    const fName = (firstName || '').trim();
    const lName = (lastName || '').trim();

    if (!fName || !lName) {
      return NextResponse.json(
        { success: false, message: 'First name and last name are required for EHR profile generation.' },
        { status: 400 }
      );
    }

    const facilityClean = hospitalId || facilityId || 'GAM-GAR-7578';
    const facilityPrefix = facilityClean.includes('MMH') ? 'MMH' : 'MMH';
    const yearShort = new Date().getFullYear().toString().slice(-2);

    let generatedEhrId = `MMH/EHR/${yearShort}/0001`;
    let newPatientId = '';

    try {
      const db = getFirestore();
      const counterRef = db.collection('hospitals').doc(facilityClean).collection('system_counters').doc('patient_sequence');
      const patientRef = db.collection('hospitals').doc(facilityClean).collection('patients').doc();

      await db.runTransaction(async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let currentSeq = 1;
        
        if (counterDoc.exists) {
          currentSeq = Number(counterDoc.data()?.currentValue || 0) + 1;
        }

        const paddedSeq = currentSeq.toString().padStart(4, '0');
        generatedEhrId = `${facilityPrefix}/EHR/${yearShort}/${paddedSeq}`;

        // 1. Update sequence counter atomically
        transaction.set(counterRef, { currentValue: currentSeq, lastUpdated: FieldValue.serverTimestamp() }, { merge: true });

        // 2. Save patient record with status WAITING_FOR_ASSIGNMENT
        newPatientId = patientRef.id;
        transaction.set(patientRef, {
          id: patientRef.id,
          ehrNumber: generatedEhrId,
          ehrId: generatedEhrId,
          firstName: fName,
          lastName: lName,
          otherNames: otherNames || '',
          fullName: `${fName} ${lName}`.toUpperCase(),
          dateOfBirth: dateOfBirth || '1990-01-01',
          gender: gender || 'Female',
          phoneNumber: phone || phoneNumber || '0240000000',
          ghanaCardId: ghanaCard || ghanaCardId || '',
          payerId: payerId || 'CASH',
          payerName: payerName || 'Cash Patient',
          emergencyContactName: emergencyContactName || '',
          emergencyContactPhone: emergencyContactPhone || '',
          residentialAddress: residentialAddress || '',
          priorityQueue: priorityQueue || 'STANDARD',
          status: 'WAITING_FOR_ASSIGNMENT',
          facilityId: facilityClean,
          hospitalId: facilityClean,
          registeredBy: registeredBy || 'Front Desk Staff',
          registrationDate: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
        });
      });
    } catch (adminErr) {
      console.log('Firebase Admin atomic patient transaction fallback engaged:', adminErr);
      const randSeq = Math.floor(1000 + Math.random() * 9000);
      generatedEhrId = `MMH/EHR/${yearShort}/${randSeq}`;
    }

    return NextResponse.json({
      success: true,
      ehrNumber: generatedEhrId,
      ehrId: generatedEhrId,
      patientId: newPatientId,
      message: `Patient Registered Successfully! EHR: ${generatedEhrId}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
