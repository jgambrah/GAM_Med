

'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Referral } from '@/lib/types';
import { format } from 'date-fns';

interface ReferralDetailDialogProps {
  referral: Referral;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const DetailItem = ({ label, value, children }: { label: string; value?: string | null; children?: React.ReactNode }) => (
    <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {value && <p className="text-base font-semibold">{value}</p>}
        {children && <div className="text-base font-semibold">{children}</div>}
    </div>
);

export function ReferralDetailDialog({ referral, isOpen, onOpenChange }: ReferralDetailDialogProps) {
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Referral Details: {referral.referral_id}</DialogTitle>
          <DialogDescription>
            Full details for the referral from {referral.referringProvider}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
            <div className="p-4 border rounded-lg space-y-4">
                 <h4 className="font-semibold text-md">Patient Information</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <DetailItem label="Name" value={referral.patientDetails.name} />
                    <DetailItem label="Date of Birth" value={format(new Date(referral.patientDetails.dob), 'PPP')} />
                    <DetailItem label="Phone" value={referral.patientDetails.phone} />
                </div>
            </div>
            <div className="p-4 border rounded-lg space-y-4">
                <h4 className="font-semibold text-md">Referral Information</h4>
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <DetailItem label="Referring Provider" value={referral.referringProvider} />
                    <DetailItem label="Referral Date" value={format(new Date(referral.referralDate), 'PPP')} />
                    <DetailItem label="Assigned Department" value={referral.assignedDepartment} />
                    <DetailItem label="Assigned Doctor" value={referral.assignedDoctorName || 'Not Assigned'} />
                    <DetailItem label="Priority">
                        <Badge>{referral.priority}</Badge>
                    </DetailItem>
                    <DetailItem label="Status">
                         <Badge variant="secondary">{referral.status}</Badge>
                    </DetailItem>
                </div>
                <div className="space-y-2">
                    <h5 className="text-sm font-medium text-muted-foreground">Reason for Referral</h5>
                    <p className="text-sm border p-2 rounded-md bg-muted/50 whitespace-pre-wrap">{referral.reasonForReferral}</p>
                </div>
                {referral.notes && (
                    <div className="space-y-2">
                        <h5 className="text-sm font-medium text-muted-foreground">Internal Notes</h5>
                        <p className="text-sm border p-2 rounded-md bg-muted/50">{referral.notes}</p>
                    </div>
                )}
            </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

    