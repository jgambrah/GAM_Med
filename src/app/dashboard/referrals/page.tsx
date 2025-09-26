
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

export default function ReferralsPage() {
  const [referrals, setReferrals] = useLocalStorage<Referral[]>('referrals', mockReferrals);

  const handleReferralAdded = (newReferral: Referral) => {
    setReferrals(prev => [newReferral, ...prev]);
  }

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
            A real-time list of all patient referrals. Use the filters to manage the queue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReferralsDashboard allReferrals={referrals} setAllReferrals={setReferrals} />
        </CardContent>
      </Card>
    </div>
  );
}
