
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { User } from '@/lib/types';

interface ChangeEmailDialogProps {
  user: User;
  onEmailChanged: (oldId: string, newUser: User) => void;
  onOpenChange: (isOpen: boolean) => void;
}

/**
 * == Conceptual UI: NoSQL ID Re-keying Workflow ==
 * 
 * In a NoSQL environment where IDs are immutable, changing a unique key (email)
 * requires creating a new document and deleting the old one.
 */
export function ChangeEmailDialog({ user, onEmailChanged, onOpenChange }: ChangeEmailDialogProps) {
  const [newEmail, setNewEmail] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSave = async () => {
    const normalizedEmail = newEmail.toLowerCase().trim();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      toast.error('Please enter a valid email address.');
      return;
    }

    const newId = `${user.hospitalId}_${normalizedEmail}`;

    if (newId === user.uid) {
        toast.info("This is already the user's current email.");
        return;
    }

    setIsSubmitting(true);

    // CONCEPTUAL LOGIC:
    // 1. Check if newId exists: const doc = await getDoc(doc(db, 'users', newId))
    // 2. If exists, error.
    // 3. Otherwise, use a batch to:
    //    a. Set data to newId: batch.set(doc(db, 'users', newId), { ...user, email: normalizedEmail, uid: newId })
    //    b. Delete oldId: batch.delete(doc(db, 'users', user.uid))
    // 4. batch.commit()

    const newUser: User = {
        ...user,
        email: normalizedEmail,
        uid: newId,
    };

    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 800));

    onEmailChanged(user.uid, newUser);
    toast.success('Email Updated', {
        description: `Legacy ID ${user.uid} removed. New ID ${newId} created.`
    });
    setIsSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Email for {user.name}</DialogTitle>
          <DialogDescription>
            Updating the email will change the user's unique Document ID. This involves creating a new record and removing the old one.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <div className="space-y-2">
                <Label>Current Email</Label>
                <Input value={user.email} readOnly disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
                <Label htmlFor="new-email">New Email Address</Label>
                <Input 
                    id="new-email"
                    type="email"
                    placeholder="new.email@hospital.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                />
            </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSubmitting || !newEmail}>
            {isSubmitting ? 'Updating ID...' : 'Update Email & ID'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
