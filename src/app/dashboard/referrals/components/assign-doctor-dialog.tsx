
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Referral } from '@/lib/types';
import { allUsers } from '@/lib/data';
import { toast } from '@/hooks/use-toast';

interface AssignDoctorDialogProps {
  referral: Referral;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAssigned: (referralId: string, doctorId: string, doctorName: string) => void;
}

export function AssignDoctorDialog({ referral, isOpen, onOpenChange, onAssigned }: AssignDoctorDialogProps) {
  const [selectedDoctorId, setSelectedDoctorId] = React.useState('');
  
  const doctorsInDepartment = allUsers.filter(
    user => user.role === 'doctor' && user.department === referral.assignedDepartment
  );

  const handleAssign = () => {
    if (!selectedDoctorId) {
        toast.error("Please select a doctor to assign.");
        return;
    }
    const selectedDoctor = doctorsInDepartment.find(d => d.uid === selectedDoctorId);
    if (!selectedDoctor) {
        toast.error("Selected doctor not found.");
        return;
    }
    
    // In a real app, this would be a server action call
    onAssigned(referral.referral_id, selectedDoctorId, selectedDoctor.name);

    toast.success(`Referral assigned to ${selectedDoctor.name}.`);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Referral to Doctor</DialogTitle>
          <DialogDescription>
            Select a doctor from the {referral.assignedDepartment} department to handle this referral.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
            <Label htmlFor="doctor-select">Doctor</Label>
            <Select onValueChange={setSelectedDoctorId}>
                <SelectTrigger id="doctor-select">
                    <SelectValue placeholder="Select a doctor..." />
                </SelectTrigger>
                <SelectContent>
                    {doctorsInDepartment.length > 0 ? (
                        doctorsInDepartment.map(doc => (
                            <SelectItem key={doc.uid} value={doc.uid}>
                                {doc.name}
                            </SelectItem>
                        ))
                    ) : (
                        <div className="p-4 text-sm text-muted-foreground text-center">
                            No doctors found in the {referral.assignedDepartment} department.
                        </div>
                    )}
                </SelectContent>
            </Select>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAssign} disabled={!selectedDoctorId}>
            Confirm Assignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
