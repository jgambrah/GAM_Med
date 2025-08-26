
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AddClaimDialog } from './components/add-claim-dialog';
import { MyClaimsList } from './components/my-claims-list';

export default function MyClaimsPage() {
  const [key, setKey] = React.useState(0); // Used to force re-render of the list

  const handleClaimSubmitted = () => {
    // Increment the key to trigger a re-render of MyClaimsList, simulating a refresh
    setKey(prevKey => prevKey + 1);
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
          <MyClaimsList key={key} />
        </CardContent>
      </Card>
    </div>
  );
}
