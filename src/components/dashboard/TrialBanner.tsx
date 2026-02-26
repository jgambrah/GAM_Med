
'use client';

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * == Customer Success: Dynamic Trial Countdown ==
 * 
 * Informs the user of their remaining trial days.
 * Switches colors based on urgency: Blue (>7d) -> Orange (<=7d) -> Red (<=2d).
 */
export function TrialBanner() {
    const { hospital } = useAuth();

    // 1. HIDE if not in trial or internal facility
    if (!hospital || hospital.subscriptionStatus !== 'trialing' || hospital.isInternal) return null;

    // 2. CALCULATE REMAINING TIME
    // Handle both Firestore Timestamp (.toDate()) and ISO strings
    const expiry = hospital.trialEndsAt?.toDate 
        ? hospital.trialEndsAt.toDate() 
        : new Date(hospital.trialEndsAt || Date.now());
        
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // If trial is already over, the SubscriptionLock will handle the full-screen lockout.
    if (daysLeft < 0) return null;

    // 3. DEFINE URGENCY STYLES
    const isUrgent = daysLeft <= 7;
    const isCritical = daysLeft <= 2;

    return (
        <div className={cn(
            "w-full px-6 py-2 flex items-center justify-between text-white transition-all shadow-md z-40",
            isCritical ? "bg-red-600 shadow-red-500/20" : isUrgent ? "bg-orange-500 shadow-orange-500/20" : "bg-blue-600 shadow-blue-500/20"
        )}>
            <div className="flex items-center gap-3">
                {isCritical ? <AlertCircle className="h-4 w-4 animate-pulse" /> : <Clock className="h-4 w-4" />}
                <p className="text-xs font-bold uppercase tracking-wide">
                    {isCritical 
                        ? `Urgent: Your free trial ends in ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}.` 
                        : `GamMed Trial: ${daysLeft} days remaining.`
                    }
                    <span className="ml-3 hidden md:inline font-medium lowercase opacity-90 normal-case tracking-normal">
                        Upgrade now to ensure uninterrupted service for your clinical team.
                    </span>
                </p>
            </div>
            
            <Button 
                variant="secondary" 
                size="sm" 
                className="h-7 text-[10px] font-black uppercase tracking-widest text-slate-900 bg-white hover:bg-slate-100"
                onClick={() => {
                    const pricing = document.getElementById('pricing');
                    if (pricing) pricing.scrollIntoView({ behavior: 'smooth' });
                }}
            >
                <Zap className="mr-1.5 h-3 w-3 fill-current text-blue-600" />
                Upgrade Plan
            </Button>
        </div>
    );
}
