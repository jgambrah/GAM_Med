
"use client";

import { useAuth } from "@/components/auth-provider";
import HousekeepingDashboard from "@/components/dashboard/housekeeping-dashboard";

export default function HousekeepingPage() {
    const { user } = useAuth();
    
    // In a real app, you might have more robust role checks,
    // but this is sufficient for our current setup.
    if (user?.role !== 'Housekeeping') {
        return <p>Access Denied. You must have the Housekeeping role to view this page.</p>
    }

    return (
        <HousekeepingDashboard />
    );
}
