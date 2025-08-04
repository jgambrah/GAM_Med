
"use client";
import { useAuth } from "@/components/auth-provider";
import { ReferralDashboard } from "@/components/dashboard/referral-dashboard";
import { allReferrals, allUsers } from "@/lib/data";
import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function DoctorReferralsPage() {
    const { user, loading } = useAuth();

    const doctors = allUsers.filter(u => u.role === 'Doctor');

    const doctorReferrals = React.useMemo(() => {
        if (!user || user.role !== 'Doctor') return [];
        // Use the actual logged-in user's ID to filter their referrals.
        return allReferrals.filter(ref => ref.assignedToDoctorId === user.id);
    }, [user]);
    
    // Wait until the authentication state is fully loaded
    if (loading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-64 w-full" />
            </div>
        )
    }

    // After loading, if the user is not a doctor, deny access.
    if (!user || user.role !== 'Doctor') {
        return <p>Access Denied. You must be a doctor to view this page.</p>;
    }

    return (
        <div>
            <h2 className="text-3xl font-bold tracking-tight font-headline">My Assigned Referrals</h2>
            <p className="text-muted-foreground mb-6">A list of all patients referred to you for review and consultation.</p>
            {/* We can reuse the ReferralDashboard component with filtered data */}
            <ReferralDashboard referrals={doctorReferrals} doctors={doctors} />
        </div>
    );
}
