
"use client";
import { useAuth } from "@/components/auth-provider";
import { ReferralDashboard } from "@/components/dashboard/referral-dashboard";
import { allReferrals, allUsers } from "@/lib/data";
import { Skeleton } from "@/components/ui/skeleton";
import * as React from "react";

export default function DoctorReferralsPage() {
    const { user, loading } = useAuth();
    
    // For the assignment dropdown, we pass all doctors
    const doctors = allUsers.filter(u => u.role === 'Doctor');

    // Filter referrals to show only those assigned to the current doctor
    const doctorReferrals = React.useMemo(() => {
        if (!user || user.role !== 'Doctor') return [];
        return allReferrals.filter(ref => ref.assignedToDoctorId === user.id);
    }, [user]);

    if (loading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        )
    }

    if (!user || user.role !== 'Doctor') {
        return <p>Access Denied. You must be a doctor to view this page.</p>;
    }

    return (
        <div>
            <h2 className="text-3xl font-bold tracking-tight font-headline">My Assigned Referrals</h2>
            <p className="text-muted-foreground mb-6">A list of all patients referred to you for review and consultation.</p>
            
            {/* The shared dashboard component is reused with the filtered data */}
            <ReferralDashboard referrals={doctorReferrals} doctors={doctors} />
        </div>
    );
}
