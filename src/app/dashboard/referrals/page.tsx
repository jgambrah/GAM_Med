
'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ReferralsDashboard } from './components/referrals-dashboard';
import { AddReferralDialog } from './components/add-referral-dialog';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { mockReferrals } from '@/lib/data';
import { Referral } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';

export default function ReferralsPage() {
  const { user } = useAuth();
  const [storedReferrals, setStoredReferrals] = useLocalStorage<Referral[]>('referrals', mockReferrals);

  const handleReferralAdded = (newReferral: Referral) => {
    setStoredReferrals(prev => [newReferral, ...prev]);
  }

  // SaaS LOGIC: Always filter by hospitalId first to enforce logical isolation.
  const hospitalReferrals = React.useMemo(() => {
    if (!user) return [];
    return storedReferrals.filter(ref => ref.hospitalId === user.hospitalId);
  }, [storedReferrals, user]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold">Referral Management</h1>
            <p className="text-muted-foreground">
                Track and manage all incoming patient referrals.
            </p>
        </div>
        <AddReferralDialog onReferralAdded={handleReferralAdded} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Referrals Inbox</CardTitle>
          <CardDescription>
            A real-time list of all patient referrals for your hospital.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReferralsDashboard allReferrals={hospitalReferrals} setAllReferrals={setStoredReferrals} />
        </CardContent>
      </Card>
    </div>
  );
}
