
"use client";

import { ReferralDashboard } from "@/components/dashboard/referral-dashboard";
import { useAuth } from "@/components/auth-provider";

export default function DoctorReferralsPage() {
    const { user } = useAuth();
    // This page will render the dashboard which will handle role-specific views.
    return <ReferralDashboard />;
}
