'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This is a redirect component.
// It will automatically redirect users from /mortuary to the intake page.
export default function MortuaryRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/mortuary/intake');
    }, [router]);
    return null; // This component renders nothing.
}
