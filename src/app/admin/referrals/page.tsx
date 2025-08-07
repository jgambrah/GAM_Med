
"use client";

import { ReferralDashboard } from "@/components/dashboard/referral-dashboard";

export default function ReferralsPage() {
    // The robust role-checking is now handled within the ReferralDashboard component itself.
    // This page component simply needs to render it.
    return <ReferralDashboard />;
}
