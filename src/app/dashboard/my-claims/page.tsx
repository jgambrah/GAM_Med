
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AddClaimDialog } from './components/add-claim-dialog';
import { MyClaimsList } from './components/my-claims-list';
import { StaffExpenseClaim } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { mockStaffClaims } from '@/lib/data';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { NewStaffClaimSchema } from '@/lib/schemas';
import { z } from 'zod';

const convertFileToDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export default function MyClaimsPage() {
  const { user } = useAuth();
  // Use a shared key for all staff claims to make them visible on the approvals page
  const [allClaims, setAllClaims] = useLocalStorage<StaffExpenseClaim[]>('allStaffClaims', mockStaffClaims);

  const myClaims = React.useMemo(() => {
    if (!user) return [];
    return allClaims.filter(c => c.staffId === user.uid).sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());
  }, [user, allClaims]);


  const handleClaimSubmitted = async (values: z.infer<typeof NewStaffClaimSchema>) => {
      if (!user) return;
      
      let attachmentUrl;
      if (values.attachment) {
        try {
          attachmentUrl = await convertFileToDataURL(values.attachment);
        } catch (error) {
          console.error("Error converting file to Data URL:", error);
          // Handle the error appropriately, maybe show a toast
          return;
        }
      }

      const newClaim: StaffExpenseClaim = {
        claimId: `SEC-${Date.now()}`,
        staffId: user.uid,
        staffName: user.name,
        hodId: user.hodId,
        claimType: values.claimType,
        amount: values.amount,
        description: values.description,
        submissionDate: new Date().toISOString(),
        approvalStatus: 'Pending HOD' as const,
        paymentStatus: 'Unpaid' as const,
        attachmentUrl: attachmentUrl,
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
