'use client';

import * as React from 'react';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';

function PaymentSuccessContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const reference = searchParams.get('reference');
    const [status, setStatus] = useState('Verifying your payment...');

    useEffect(() => {
        if (reference) {
            // Mocking the backend provisioning delay
            setStatus("Success! We are setting up your hospital dashboard...");
            
            const timer = setTimeout(() => {
                router.push('/login'); 
            }, 3000);
            
            return () => clearTimeout(timer);
        }
    }, [reference, router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 animate-bounce" />
            <h1 className="text-2xl font-bold">Thank you for joining GamMed!</h1>
            <p className="text-slate-500">{status}</p>
            <Loader2 className="animate-spin h-6 w-6 text-blue-600" />
        </div>
    );
}

export default function PaymentSuccess() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>}>
            <PaymentSuccessContent />
        </Suspense>
    );
}
