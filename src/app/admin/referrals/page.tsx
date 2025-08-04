
"use client";

import { useAuth } from "@/components/auth-provider";
import { ReferralDashboard } from "@/components/dashboard/referral-dashboard";
import { allReferrals, allUsers } from "@/lib/data";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReferralsPage() {
    const { user, loading } = useAuth();
    
    // For the admin dashboard, we pass all referrals and all doctors
    const doctors = allUsers.filter(u => u.role === 'Doctor');

    if (loading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        )
    }

    if (!user || user.role !== 'Admin') {
        return <p>Access Denied. You must be an administrator to view this page.</p>;
    }

    return (
        <div>
            <h2 className="text-3xl font-bold tracking-tight font-headline">Incoming Referrals</h2>
            <p className="text-muted-foreground mb-6">Manage new patient referrals and assign them to the appropriate doctors.</p>
            <ReferralDashboard referrals={allReferrals} doctors={doctors} />
        </div>
    );
}
