'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function BloodBankRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/lab/blood-bank/inventory');
    }, [router]);
    return null;
}
