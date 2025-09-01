
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Supplier } from '@/lib/types';
import { Building, Mail, Phone, User, FileText, Clock } from 'lucide-react';

interface SupplierDetailDialogProps {
  supplier: Supplier;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const DetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string; value?: string | null }) => (
    <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 text-muted-foreground mt-1" />
        <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-base font-semibold">{value || 'N/A'}</p>
        </div>
    </div>
);


export function SupplierDetailDialog({ supplier, isOpen, onOpenChange }: SupplierDetailDialogProps) {

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{supplier.name}</DialogTitle>
          <DialogDescription>
            Full contact and contract details for this supplier.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
            <div className="space-y-4 p-4 border rounded-lg">
                <h4 className="font-semibold text-md">Contact Information</h4>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <DetailItem icon={User} label="Contact Person" value={supplier.contactInfo.person} />
                    <DetailItem icon={Phone} label="Contact Phone" value={supplier.contactInfo.phone} />
                    <DetailItem icon={Mail} label="Contact Email" value={supplier.contactInfo.email} />
                    <DetailItem icon={Building} label="Address" value={supplier.contactInfo.address} />
                 </div>
            </div>
             <div className="space-y-4 p-4 border rounded-lg">
                <h4 className="font-semibold text-md">Financial Information</h4>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <DetailItem icon={Clock} label="Payment Terms" value={supplier.paymentTerms} />
                    <DetailItem icon={FileText} label="Contract Number" value={supplier.contractDetails?.contractNumber} />
                 </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
