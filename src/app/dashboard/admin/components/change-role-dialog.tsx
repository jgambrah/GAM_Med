
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { User } from '@/lib/types';
import { Label } from '@/components/ui/label';

interface ChangeRoleDialogProps {
  user: User;
  onRoleChanged: (userId: string, newRole: User['role']) => void;
  onOpenChange: (isOpen: boolean) => void;
}

const availableRoles: User['role'][] = ['admin', 'doctor', 'nurse', 'pharmacist', 'patient', 'billing_clerk', 'lab_technician', 'ot_coordinator', 'receptionist', 'radiologist', 'dietitian'];

export function ChangeRoleDialog({ user, onRoleChanged, onOpenChange }: ChangeRoleDialogProps) {
  const [newRole, setNewRole] = React.useState<User['role'] | ''>('');

  const handleSave = () => {
    if (!newRole) {
      toast.error('Please select a new role.');
      return;
    }
    // In a real app, this would call a server action to update the user's role in Firestore
    // and potentially in Firebase Auth custom claims.
    console.log(`Changing role for ${user.name} to ${newRole}`);
    onRoleChanged(user.uid, newRole);
    toast.success(`${user.name}'s role has been updated to ${newRole}.`);
  };

  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Role for {user.name}</DialogTitle>
          <DialogDescription>
            Select a new role for this user. This will change their permissions across the system.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
            <Label htmlFor="role-select">New Role</Label>
             <Select onValueChange={(value) => setNewRole(value as User['role'])} value={newRole}>
                <SelectTrigger id="role-select">
                    <SelectValue placeholder="Select a new role..." />
                </SelectTrigger>
                <SelectContent>
                    {availableRoles.map(role => (
                        <SelectItem key={role} value={role} disabled={user.role === role}>
                            {role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ')}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!newRole || newRole === user.role}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

