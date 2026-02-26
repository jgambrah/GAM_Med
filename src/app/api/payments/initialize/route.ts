import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { email, amount, planId, hospitalName } = await req.json();

        const response = await fetch('https://api.paystack.co/transaction/initialize', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                amount: amount * 100, // Paystack uses Kobo/Pesewas
                callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment-success`,
                metadata: {
                    planId,
                    hospitalName,
                    email // Pass the email here so the webhook can find it
                }
            }),
        });

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
