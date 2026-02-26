'use client';

import { useAuth } from './use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * == SaaS Subscription Guard ==
 * 
 * High-level check that runs to verify the hospital's trial status.
 * If the trial is over and no plan is active, it flags the system for locking.
 */
export function useSubscriptionGuard() {
    const { user, hospital } = useAuth();
    const router = useRouter();
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        if (!hospital) return;

        // Skip check for Super Admins or internal HQ
        if (user?.role === 'super_admin' || hospital.hospitalId === 'GAMMED_HQ') {
            setIsExpired(false);
            return;
        }

        const now = new Date();
        
        // Handle both Firestore Timestamps and ISO strings
        const expiryDate = hospital.trialEndsAt?.toDate 
            ? hospital.trialEndsAt.toDate() 
            : new Date(hospital.trialEndsAt);

        // Check if trial is over AND they haven't upgraded yet
        if (hospital.subscriptionStatus === 'trialing' && now > expiryDate) {
            setIsExpired(true);
        } else {
            setIsExpired(false);
        }
    }, [hospital, user?.role]);

    return { isExpired };
}
