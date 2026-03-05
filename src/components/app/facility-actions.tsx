'use client';

import { useState } from "react";
import { doc, Timestamp } from "firebase/firestore";
import { addDays } from "date-fns";
import { useFirestore, updateDocumentNonBlocking } from "@/firebase";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { MoreHorizontal, ToggleLeft, ToggleRight, CalendarPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Hospital = {
  id: string;
  name: string;
  isSuspended?: boolean;
  status?: 'active' | 'suspended';
  trialExpiry?: {
    toDate: () => Date;
  };
};

interface FacilityActionsProps {
  hospital: Hospital;
}

export function FacilityActions({ hospital }: FacilityActionsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState<"suspend" | "trial" | null>(null);
  
  const handleSuspendToggle = () => {
    if (!firestore) return;
    const hospitalRef = doc(firestore, 'hospitals', hospital.id);
    const newStatus = hospital.status === 'active' ? 'suspended' : 'active';
    updateDocumentNonBlocking(hospitalRef, { status: newStatus });
    toast({
        title: `Facility ${newStatus === 'suspended' ? 'Suspended' : 'Reactivated'}`,
        description: `${hospital.name} has been ${newStatus}.`
    });
    setDialogOpen(null);
  };

  const handleExtendTrial = (days: number) => {
    if (!firestore) return;
    const hospitalRef = doc(firestore, 'hospitals', hospital.id);
    const currentExpiry = hospital.trialExpiry?.toDate() || new Date();
    const newExpiryDate = addDays(currentExpiry, days);
    updateDocumentNonBlocking(hospitalRef, { trialExpiry: Timestamp.fromDate(newExpiryDate) });
    toast({
        title: "Trial Extended",
        description: `Trial for ${hospital.name} has been extended by ${days} days.`
    });
    setDialogOpen(null);
  }

  const isSuspended = hospital.status === 'suspended';

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setDialogOpen("trial")}>
            <CalendarPlus className="mr-2" />
            Extend Trial
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setDialogOpen("suspend")} className="text-destructive focus:text-destructive">
            {isSuspended ? <ToggleRight className="mr-2"/> : <ToggleLeft className="mr-2"/>}
            {isSuspended ? 'Reactivate' : 'Suspend'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Suspend/Reactivate Dialog */}
      <Dialog open={dialogOpen === 'suspend'} onOpenChange={(open) => !open && setDialogOpen(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Confirm Action</DialogTitle>
                <DialogDescription>
                    Are you sure you want to {isSuspended ? 'reactivate' : 'suspend'} {hospital.name}? 
                    {isSuspended ? ' They will regain access.' : ' This will immediately block all users from this facility.'}
                </DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(null)}>Cancel</Button>
                <Button variant={isSuspended ? 'default' : 'destructive'} onClick={handleSuspendToggle}>
                    {isSuspended ? 'Confirm Reactivate' : 'Confirm Suspend'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Extend Trial Dialog */}
      <Dialog open={dialogOpen === 'trial'} onOpenChange={(open) => !open && setDialogOpen(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Extend Trial for {hospital.name}</DialogTitle>
                <DialogDescription>
                    Select how many days to extend the trial period.
                </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-4 py-4">
                <Button variant="outline" onClick={() => handleExtendTrial(7)}>7 Days</Button>
                <Button variant="outline" onClick={() => handleExtendTrial(14)}>14 Days</Button>
                <Button variant="outline" onClick={() => handleExtendTrial(30)}>30 Days</Button>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setDialogOpen(null)}>Cancel</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
