
import { ReferralDashboard } from "@/components/dashboard/referral-dashboard";
import { allReferrals, allUsers } from "@/lib/data";

export default function ReferralsPage() {
    // In a real app, you'd fetch this data. For now, we use the mock data.
    const doctors = allUsers.filter(u => u.role === 'Doctor');
    return <ReferralDashboard referrals={allReferrals} doctors={doctors} />;
}
