
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AddClaimDialog } from './components/add-claim-dialog';
import { MyClaimsList } from './components/my-claims-list';
import { StaffExpenseClaim } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { mockStaffClaims } from '@/lib/data';
import { useLocalStorage } from '@/hooks/use-local-storage';

export default function MyClaimsPage() {
  const { user } = useAuth();
  // Use a shared key for all staff claims to make them visible on the approvals page
  const [allClaims, setAllClaims] = useLocalStorage<StaffExpenseClaim[]>('allStaffClaims', mockStaffClaims);

  const myClaims = React.useMemo(() => {
    if (!user) return [];
    return allClaims.filter(c => c.staffId === user.uid);
  }, [user, allClaims]);


  const handleClaimSubmitted = (newClaimData: Omit<StaffExpenseClaim, 'claimId' | 'staffId' | 'staffName'>) => {
      if (!user) return;
      const newClaim: StaffExpenseClaim = {
        ...newClaimData,
        claimId: `SEC-${Date.now()}`,
        staffId: user.uid,
        staffName: user.name,
      };
      setAllClaims(prevClaims => [newClaim, ...prevClaims]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Expense Claims</h1>
          <p className="text-muted-foreground">
            Submit and track your expense claims for reimbursement.
          </p>
        </div>
        <AddClaimDialog onClaimSubmitted={handleClaimSubmitted} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>My Claim History</CardTitle>
          <CardDescription>
            A record of all your submitted expense claims and their current status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MyClaimsList claims={myClaims} />
        </CardContent>
      </Card>
    </div>
  );
}
