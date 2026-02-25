
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
import { toast } from '@/hooks/use-toast';
import { approveStaffClaim, rejectStaffClaim } from '@/lib/actions';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { StaffExpenseClaim } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

function RejectClaimDialog({ claimId, onRejected }: { claimId: string, onRejected: (claimId: string, reason: string) => Promise<void> }) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error('A reason for rejection is required.');
      return;
    }
    setIsSubmitting(true);
    await onRejected(claimId, reason);
    setIsSubmitting(false);
    setOpen(false);
    setReason('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="destructive">
          <X className="h-4 w-4 mr-2" /> Reject
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Expense Claim</DialogTitle>
          <DialogDescription>
            Please provide a reason for rejecting this claim. This will be visible to the staff member.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2">
          <Label htmlFor="rejection-reason">Rejection Reason</Label>
          <Textarea
            id="rejection-reason"
            placeholder="e.g., Expense not covered by policy, missing receipt..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={isSubmitting || !reason.trim()}>
            {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


export function ClaimsApprovalDashboard() {
  const { user } = useAuth();
  const [allClaims, setAllClaims] = useLocalStorage<StaffExpenseClaim[]>('allStaffClaims', mockStaffClaims);

  // SaaS LOGIC: Filter by hospitalId first
  const pendingClaims = React.useMemo(() => {
    if (!user) return [];
    return allClaims.filter(c => {
        // Must belong to the same hospital
        if (c.hospitalId !== user.hospitalId) return false;

        // Admins see all pending claims in their hospital, HODs only see claims assigned to them.
        if (user.role === 'admin' || user.role === 'director') {
            return c.approvalStatus === 'Pending HOD';
        }
        return c.hodId === user.uid && c.approvalStatus === 'Pending HOD';
    });
  }, [allClaims, user]);

  const handleApprove = async (claimId: string) => {
    const result = await approveStaffClaim(claimId);
    if(result.success) {
        toast.success(`Claim ${claimId} has been approved and sent to accounts for payment.`);
        setAllClaims(prev => prev.map(c => c.claimId === claimId ? { ...c, approvalStatus: 'Approved' } : c));
    } else {
        toast.error(result.message || 'An unexpected error occurred.');
    }
  };
  
  const handleReject = async (claimId: string, reason: string) => {
    const result = await rejectStaffClaim(claimId, reason);
     if(result.success) {
        toast.error(`Claim ${claimId} has been rejected.`);
        setAllClaims(prev => prev.map(c => c.claimId === claimId ? { ...c, approvalStatus: 'Rejected', rejectionReason: reason } : c));
    } else {
        toast.error(result.message || 'An unexpected error occurred.');
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Staff Member</TableHead>
            <TableHead>Date Submitted</TableHead>
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
                <TableCell>{claim.description}</TableCell>
                <TableCell>₵{claim.amount.toFixed(2)}</TableCell>
                <TableCell className="space-x-2">
                  <Button size="sm" variant="outline" onClick={() => handleApprove(claim.claimId)}>
                    <Check className="h-4 w-4 mr-2 text-green-600" /> Approve
                  </Button>
                  <RejectClaimDialog claimId={claim.claimId} onRejected={handleReject} />
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic">
                You have no pending claims to approve for your facility.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
