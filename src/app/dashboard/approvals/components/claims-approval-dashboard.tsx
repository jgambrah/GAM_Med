
'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { mockStaffClaims } from '@/lib/data';
import { Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { approveStaffClaim, rejectStaffClaim } from '@/lib/actions';

export function ClaimsApprovalDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  // In a real app, this would be a Firestore query for claims where `hodId === user.uid` and status is 'Pending HOD'
  const pendingClaims = mockStaffClaims.filter(c => c.hodId === user?.uid && c.approvalStatus === 'Pending HOD');

  const handleApprove = async (claimId: string) => {
    const result = await approveStaffClaim(claimId);
    if(result.success) {
        toast({
            title: 'Claim Approved',
            description: `Claim ${claimId} has been approved and sent to accounts for payment.`,
        });
        // Here you would re-fetch the data to update the UI
    } else {
        toast.error('Approval Failed', {
            description: result.message || 'An unexpected error occurred.',
        });
    }
  };
  
  const handleReject = async (claimId: string) => {
    const result = await rejectStaffClaim(claimId);
     if(result.success) {
        toast({
            title: 'Claim Rejected',
            description: `Claim ${claimId} has been rejected and the staff member notified.`,
        });
    } else {
        toast.error('Rejection Failed', {
            description: result.message || 'An unexpected error occurred.',
        });
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Staff Member</TableHead>
            <TableHead>Date Submitted</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pendingClaims.length > 0 ? (
            pendingClaims.map((claim) => (
              <TableRow key={claim.claimId}>
                <TableCell className="font-medium">{claim.staffName}</TableCell>
                <TableCell>{format(new Date(claim.submissionDate), 'PPP')}</TableCell>
                <TableCell>{claim.claimType}</TableCell>
                <TableCell>{claim.description}</TableCell>
                <TableCell>₵{claim.amount.toFixed(2)}</TableCell>
                <TableCell className="space-x-2">
                  <Button size="sm" variant="outline" onClick={() => handleApprove(claim.claimId)}>
                    <Check className="h-4 w-4 mr-2 text-green-600" /> Approve
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleReject(claim.claimId)}>
                     <X className="h-4 w-4 mr-2" /> Reject
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                You have no pending claims to approve.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
