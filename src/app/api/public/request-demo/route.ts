import { NextResponse } from 'next/server';
import { sendDemoRequestEmail } from '@/lib/mail-service';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const result = await sendDemoRequestEmail(data);
    
    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
