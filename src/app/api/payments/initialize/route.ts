import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    const { email, amount, planId, hospitalName } = await req.json();

    try {
        const response = await fetch('https://api.paystack.co/transaction/initialize', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                amount: amount * 100, // Paystack uses Kobo/Pesewas (multiply by 100)
                callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment-success`,
                metadata: {
                    planId,
                    hospitalName,
                    custom_fields: [
                        { display_name: "Hospital", variable_name: "hospital", value: hospitalName },
                        { display_name: "Plan", variable_name: "plan", value: planId }
                    ]
                }
            }),
        });

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
