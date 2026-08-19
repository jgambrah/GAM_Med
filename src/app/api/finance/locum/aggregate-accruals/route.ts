import { NextRequest, NextResponse } from 'next/server';
import { aggregateLocumAttendanceLogs } from '@/lib/locum-accrual-engine';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const hospitalId = body.hospitalId;

    if (!hospitalId) {
      return NextResponse.json(
        { error: 'hospitalId is required to aggregate locum accruals.' },
        { status: 400 }
      );
    }

    const result = await aggregateLocumAttendanceLogs(hospitalId);

    return NextResponse.json({
      success: true,
      message: `Successfully aggregated locum attendance records for ${hospitalId}.`,
      data: result,
    });
  } catch (error: any) {
    console.error('Locum Accrual Aggregation Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to aggregate locum attendance logs.' },
      { status: 500 }
    );
  }
}
