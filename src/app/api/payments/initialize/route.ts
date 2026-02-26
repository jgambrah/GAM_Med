import { NextResponse } from 'next/server';

/**
 * == Subscription Initialization Engine ==
 * 
 * Securely communicates with Paystack to initialize a new subscription transaction.
 * Includes hospital metadata to ensure proper auto-provisioning via the webhook.
 */
export async function POST(req: Request) {
    try {
        const { email, amount, planId, hospitalName } = await req.json();

        if (!process.env.PAYSTACK_SECRET_KEY) {
            return NextResponse.json({ error: "Payment configuration missing" }, { status: 500 });
        }

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
                    email // Primary identifier for the webhook logic
                }
            }),
        });

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Paystack Initialize Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
