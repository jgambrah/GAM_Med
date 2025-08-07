
"use client";

import { useAuth } from "@/components/auth-provider";

export default function DoctorReferralsPage() {
    const { user } = useAuth();
    // This page will render the dashboard which will handle role-specific views.
    return <div>Referrals page being rebuilt.</div>;
}
