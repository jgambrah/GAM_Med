'use client';

import { useAuth } from './use-auth';
import { useEffect, useState } from 'react';

/**
 * == SaaS Subscription Guard ==
 * 
 * High-level check that runs to verify the hospital's trial status.
 * If the trial is over and no plan is active, it flags the system for locking.
 */
export function useSubscriptionGuard() {
    const { user, hospital } = useAuth();
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        if (!hospital) return;

        // 1. BYPASS LOGIC: Super Admins and the Platform HQ (Internal) are never locked.
        if (user?.role === 'super_admin' || hospital.hospitalId === 'GAMMED_HQ' || hospital.isInternal) {
            setIsExpired(false);
            return;
        }

        // 2. ACTIVE SUBSCRIPTION: If the hospital has already paid and is active, bypass the lock.
        if (hospital.subscriptionStatus === 'active') {
            setIsExpired(false);
            return;
        }

        const now = new Date();
        
        // 3. TRIAL LOGIC: Check if the 30-day trial has concluded.
        if (hospital.subscriptionStatus === 'trialing' && hospital.trialEndsAt) {
            // Handle both Firestore Timestamps and ISO strings
            const expiryDate = hospital.trialEndsAt?.toDate 
                ? hospital.trialEndsAt.toDate() 
                : new Date(hospital.trialEndsAt);

            if (now > expiryDate) {
                setIsExpired(true);
            } else {
                setIsExpired(false);
            }
        } else {
            // If they aren't trialing and aren't active, assume expired/suspended.
            setIsExpired(hospital.status === 'suspended' || hospital.subscriptionStatus === 'expired');
        }
    }, [hospital, user?.role]);

    return { isExpired };
}
