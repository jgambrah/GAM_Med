'use client';

import * as React from 'react';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';

/**
 * == Post-Transaction Triage ==
 * 
 * Displays feedback to the user after a successful Paystack transaction.
 * Background logic: The Webhook will handle the actual provisioning.
 */
function PaymentSuccessContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const reference = searchParams.get('reference');
    const [status, setStatus] = useState('Verifying your payment...');

    useEffect(() => {
        if (reference) {
            // Mocking the delay while the webhook finishes provisioning
            setStatus("Success! We are setting up your hospital dashboard...");
            
            const timer = setTimeout(() => {
                router.push('/login'); 
            }, 4000);
            
            return () => clearTimeout(timer);
        }
    }, [reference, router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen space-y-4 bg-slate-50">
            <div className="p-12 bg-white rounded-3xl shadow-xl flex flex-col items-center max-w-md text-center border">
                <CheckCircle2 className="h-20 w-20 text-green-500 animate-bounce mb-6" />
                <h1 className="text-3xl font-black tracking-tight text-slate-900">Welcome to GamMed!</h1>
                <p className="text-slate-500 font-medium mt-2 leading-relaxed">
                    {status}
                </p>
                <div className="mt-8 flex items-center gap-2 text-blue-600 font-bold uppercase text-xs tracking-widest">
                    <Loader2 className="animate-spin h-4 w-4" />
                    Syncing facility vault...
                </div>
            </div>
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
