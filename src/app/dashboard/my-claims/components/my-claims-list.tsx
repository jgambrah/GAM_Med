
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
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { StaffExpenseClaim } from '@/lib/types';

const getStatusVariant = (status: StaffExpenseClaim['approvalStatus']): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'Approved':
      return 'secondary';
    case 'Pending HOD':
      return 'default';
    case 'Rejected':
      return 'destructive';
    default:
      return 'outline';
  }
};

const getPaymentStatusVariant = (status: StaffExpenseClaim['paymentStatus']): 'default' | 'secondary' => {
    return status === 'Paid' ? 'secondary' : 'default';
}

interface MyClaimsListProps {
    claims: StaffExpenseClaim[];
}

export function MyClaimsList({ claims }: MyClaimsListProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Submission Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Approval Status</TableHead>
            <TableHead>Payment Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {claims.length > 0 ? (
            claims.map((claim) => (
              <TableRow key={claim.claimId}>
                <TableCell>{format(new Date(claim.submissionDate), 'PPP')}</TableCell>
                <TableCell>{claim.claimType}</TableCell>
                <TableCell>{claim.description}</TableCell>
                <TableCell>₵{claim.amount.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(claim.approvalStatus)}>{claim.approvalStatus}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getPaymentStatusVariant(claim.paymentStatus)}>{claim.paymentStatus}</Badge>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                You have not submitted any claims.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
