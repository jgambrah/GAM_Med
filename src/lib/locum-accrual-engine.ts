import { getAdminFirestore } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

export interface AttendanceLogRecord {
  id: string;
  staffId?: string;
  clinician_id?: string;
  staffName?: string;
  clinician_name?: string;
  role?: string;
  specialty?: string;
  department?: string;
  contractType?: string;
  is_locum?: boolean;
  clockInTime?: any;
  clock_in?: any;
  clockOutTime?: any;
  clock_out?: any;
  shiftName?: string;
  shift_type?: string;
  hoursWorked?: number;
  status?: string;
  paymentStatus?: string;
  accrual_processed?: boolean;
  accrual_id?: string;
  tin?: string;
}

export interface LocumAccrualRecord {
  accrual_id: string;
  attendance_log_id: string;
  hospital_id: string;
  clinician_id: string;
  clinician_name: string;
  tin_number?: string;
  shift_date: string;
  shift_type: 'Morning' | 'Afternoon' | 'Night' | 'Overnight Cover' | 'General';
  clock_in_iso: string;
  clock_out_iso?: string | null;
  duration: number; // in hours, e.g. 12.00
  hourly_rate: number;
  gross_amount: number;
  wht_rate: number; // e.g. 0.075 (7.5%)
  wht_amount: number;
  net_amount: number;
  department: string;
  gl_account_code: string;
  gl_account_name: string;
  status: 'READY_FOR_DISBURSEMENT' | 'NEEDS_HR_REVIEW' | 'FLAGGED_MISSING_TIN';
  review_reason?: string | null;
  payment_status: 'UNPAID' | 'QUEUED_FOR_PV' | 'PAID';
  processed_at: any;
}

export interface AccrualAggregationResult {
  hospitalId: string;
  totalLogsScanned: number;
  processedCount: number;
  flaggedReviewCount: number;
  skippedCount: number;
  totalGrossAccrued: number;
  totalNetAccrued: number;
  records: LocumAccrualRecord[];
}

/**
 * Converts various timestamp representations (Firestore Timestamp, Date, ISO string, milliseconds) into a JavaScript Date.
 */
function parseTimestamp(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val.toDate === 'function') return val.toDate();
  if (val._seconds !== undefined) return new Date(val._seconds * 1000);
  if (val.seconds !== undefined) return new Date(val.seconds * 1000);
  if (typeof val === 'number') return new Date(val);
  if (typeof val === 'string') {
    const parsed = new Date(val);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

/**
 * Derives shift type (Morning, Afternoon, Night) based on the clock-in hour.
 */
function determineShiftType(clockIn: Date, durationHours: number): 'Morning' | 'Afternoon' | 'Night' | 'Overnight Cover' | 'General' {
  const hour = clockIn.getHours();
  if (durationHours >= 18) return 'Overnight Cover';
  if (hour >= 6 && hour < 14) return 'Morning';
  if (hour >= 14 && hour < 20) return 'Afternoon';
  return 'Night';
}

/**
 * Maps clinician specialty or department to appropriate General Ledger expenditure account.
 */
function resolveGlCostCenter(roleOrSpecialty: string = '', department: string = ''): { code: string; name: string } {
  const text = `${roleOrSpecialty} ${department}`.toUpperCase();
  if (text.includes('ICU') || text.includes('INTENSIVIST') || text.includes('CRITICAL')) {
    return { code: '5120', name: 'ICU Locum Intensivist Fees' };
  }
  if (text.includes('NURSE') || text.includes('MIDWIFE') || text.includes('MATERNITY')) {
    return { code: '5125', name: 'Nursing & Locum Midwifery Care' };
  }
  if (text.includes('SURGEON') || text.includes('THEATRE') || text.includes('ANESTH')) {
    return { code: '5130', name: 'Surgical & Locum Specialist Consultancy' };
  }
  return { code: '5105', name: 'OPD & Clinical Locum Medical Officers' };
}

/**
 * Core engine that queries raw attendance logs, performs statutory math, and writes immutable accruals.
 */
export async function aggregateLocumAttendanceLogs(
  hospitalId: string,
  dbInstance?: admin.firestore.Firestore
): Promise<AccrualAggregationResult> {
  const db = dbInstance || getAdminFirestore();

  const attendanceLogsRef = db.collection(`hospitals/${hospitalId}/attendance_logs`);
  const accrualsRef = db.collection(`hospitals/${hospitalId}/locum_accruals`);
  const salaryProfilesRef = db.collection(`hospitals/${hospitalId}/salary_profiles`);
  const usersRef = db.collection('users');

  // 1. Fetch Salary Profiles for rate resolution
  const salaryProfilesSnap = await salaryProfilesRef.get();
  const salaryMap = new Map<string, any>();
  salaryProfilesSnap.forEach((doc) => {
    const data = doc.data();
    if (data.staffId) salaryMap.set(data.staffId, data);
  });

  // 2. Fetch Clinician Users for TIN and Contact details
  const usersSnap = await usersRef.where('hospitalId', '==', hospitalId).get();
  const userMap = new Map<string, any>();
  usersSnap.forEach((doc) => {
    userMap.set(doc.id, doc.data());
  });

  // 3. Query all candidate raw attendance logs
  const logsSnap = await attendanceLogsRef.get();

  let totalGrossAccrued = 0;
  let totalNetAccrued = 0;
  let processedCount = 0;
  let flaggedReviewCount = 0;
  let skippedCount = 0;
  const createdRecords: LocumAccrualRecord[] = [];

  const now = new Date();

  for (const doc of logsSnap.docs) {
    const log = { id: doc.id, ...doc.data() } as AttendanceLogRecord;

    // Filter criteria: is_locum == true OR contractType == 'LOCUM'
    const isLocum = log.is_locum === true || log.contractType === 'LOCUM';
    if (!isLocum) {
      continue;
    }

    // Idempotency: skip if already processed into accruals
    if (log.accrual_processed === true || log.accrual_id) {
      skippedCount++;
      continue;
    }

    const clinicianId = log.clinician_id || log.staffId || '';
    if (!clinicianId) {
      skippedCount++;
      continue;
    }

    // Deterministic Accrual Document ID for strict idempotency
    const accrualDocId = `accrual_${log.id}`;
    const existingAccrualSnap = await accrualsRef.doc(accrualDocId).get();
    if (existingAccrualSnap.exists) {
      // Mark source log as processed to repair state and skip
      await doc.ref.update({ accrual_processed: true, accrual_id: accrualDocId });
      skippedCount++;
      continue;
    }

    const clockIn = parseTimestamp(log.clock_in || log.clockInTime);
    const clockOut = parseTimestamp(log.clock_out || log.clockOutTime);

    // If no clock-in timestamp exists, flag for manual review
    if (!clockIn) {
      skippedCount++;
      continue;
    }

    // User / Profile Rate Lookup
    const salaryProfile = salaryMap.get(clinicianId);
    const userProfile = userMap.get(clinicianId);

    const clinicianName =
      log.clinician_name ||
      log.staffName ||
      userProfile?.fullName ||
      userProfile?.displayName ||
      userProfile?.name ||
      'Locum Clinician';

    const tinNumber =
      log.tin ||
      salaryProfile?.tin ||
      userProfile?.tin ||
      userProfile?.tinNumber ||
      null;

    const baseSalary = Number(salaryProfile?.basicSalary || 0);
    const hourlyRate =
      Number(salaryProfile?.hourlyRate) ||
      (baseSalary > 0 ? parseFloat((baseSalary / 192).toFixed(2)) : 80.00);

    const specialty = log.specialty || log.role || userProfile?.role || 'Locum Clinician';
    const department = log.department || userProfile?.department || 'Clinical Services';
    const glCostCenter = resolveGlCostCenter(specialty, department);

    // -------------------------------------------------------------
    // EDGE CASE & DURATION ANALYSIS
    // -------------------------------------------------------------
    let durationHours = 0;
    let status: 'READY_FOR_DISBURSEMENT' | 'NEEDS_HR_REVIEW' | 'FLAGGED_MISSING_TIN' = 'READY_FOR_DISBURSEMENT';
    let reviewReason: string | null = null;

    if (!clockOut) {
      const elapsedMs = now.getTime() - clockIn.getTime();
      const elapsedHours = elapsedMs / (1000 * 60 * 60);

      if (elapsedHours > 24) {
        // Missing clock-out abandoned after 24h -> Flag for HR Review
        status = 'NEEDS_HR_REVIEW';
        reviewReason = `Missing clock-out timestamp. Shift elapsed ${elapsedHours.toFixed(1)} hrs without sign-off. Requires Medical Director verification.`;
        durationHours = 0;
      } else {
        // Shift is currently in-progress; skip until clocked out
        skippedCount++;
        continue;
      }
    } else {
      // Exact duration math supporting overnight shifts spanning midnight
      const diffMs = clockOut.getTime() - clockIn.getTime();
      durationHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));

      if (durationHours <= 0) {
        status = 'NEEDS_HR_REVIEW';
        reviewReason = 'Invalid shift duration (clock-out is before or equal to clock-in).';
        durationHours = 0;
      } else if (durationHours > 24) {
        status = 'NEEDS_HR_REVIEW';
        reviewReason = `Shift duration of ${durationHours.toFixed(2)} hrs exceeds 24-hour ceiling. Possible unclosed shift.`;
      }
    }

    // Check GRA TIN Compliance Gate
    if (status === 'READY_FOR_DISBURSEMENT' && (!tinNumber || tinNumber === 'MISSING' || tinNumber === 'PENDING')) {
      status = 'FLAGGED_MISSING_TIN';
      reviewReason = 'Missing statutory GRA Tax Identification Number (TIN). 7.5% WHT remittance blocked.';
    }

    // Statutory Financial Calculations (7.5% GRA WHT)
    const grossAmount = parseFloat((durationHours * hourlyRate).toFixed(2));
    const whtRate = 0.075;
    const whtAmount = parseFloat((grossAmount * whtRate).toFixed(2));
    const netAmount = parseFloat((grossAmount - whtAmount).toFixed(2));

    const shiftDateStr = clockIn.toISOString().split('T')[0];
    const shiftType = determineShiftType(clockIn, durationHours);

    const accrualRecord: LocumAccrualRecord = {
      accrual_id: accrualDocId,
      attendance_log_id: doc.id,
      hospital_id: hospitalId,
      clinician_id: clinicianId,
      clinician_name: clinicianName,
      tin_number: tinNumber || undefined,
      shift_date: shiftDateStr,
      shift_type: shiftType,
      clock_in_iso: clockIn.toISOString(),
      clock_out_iso: clockOut ? clockOut.toISOString() : null,
      duration: durationHours,
      hourly_rate: hourlyRate,
      gross_amount: grossAmount,
      wht_rate: whtRate,
      wht_amount: whtAmount,
      net_amount: netAmount,
      department,
      gl_account_code: glCostCenter.code,
      gl_account_name: glCostCenter.name,
      status,
      review_reason: reviewReason,
      payment_status: 'UNPAID',
      processed_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    // -------------------------------------------------------------
    // ATOMIC WRITE: Write Accrual & Mark Source Attendance Log
    // -------------------------------------------------------------
    const batch = db.batch();
    const accrualDocRef = accrualsRef.doc(accrualDocId);
    batch.set(accrualDocRef, accrualRecord);

    batch.update(doc.ref, {
      accrual_processed: true,
      accrual_id: accrualDocId,
      accrual_status: status,
      accrual_processed_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();

    if (status === 'READY_FOR_DISBURSEMENT') {
      totalGrossAccrued += grossAmount;
      totalNetAccrued += netAmount;
      processedCount++;
    } else {
      flaggedReviewCount++;
    }

    createdRecords.push(accrualRecord);
  }

  return {
    hospitalId,
    totalLogsScanned: logsSnap.size,
    processedCount,
    flaggedReviewCount,
    skippedCount,
    totalGrossAccrued: parseFloat(totalGrossAccrued.toFixed(2)),
    totalNetAccrued: parseFloat(totalNetAccrued.toFixed(2)),
    records: createdRecords,
  };
}
