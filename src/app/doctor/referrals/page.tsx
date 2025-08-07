
"use client";

import { useAuth } from "@/components/auth-provider";
import { ReferralDashboard } from "@/components/dashboard/referral-dashboard";

export default function DoctorReferralsPage() {
    const { user } = useAuth();

    // In a real app, you might have more robust role checks,
    // but this is sufficient for our current setup.
    if (user?.role !== 'Doctor') {
        return <p>Access Denied. You must have the Doctor role to view this page.</p>
    }
    
    return <ReferralDashboard />;
}
