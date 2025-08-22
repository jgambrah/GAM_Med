
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
import { Button } from '@/components/ui/button';
import { Claim, FollowUpNote } from '@/lib/types';
import { format } from 'date-fns';
import Link from 'next/link';
import { AlertTriangle, MessageSquare, Send } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';

interface ClaimDetailDialogProps {
  claim: Claim;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const getStatusVariant = (status: Claim['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'Paid': return 'secondary';
        case 'Submitted': return 'default';
        case 'Denied': return 'destructive';
        default: return 'outline';
    }
}

export function ClaimDetailDialog({ claim, isOpen, onOpenChange }: ClaimDetailDialogProps) {
  const { user } = useAuth();
  const [newNote, setNewNote] = React.useState('');

  const handleAddNote = () => {
    if (!newNote.trim() || !user) return;
    // In a real app, this would call a server action `addFollowUpNote(claim.claimId, newNote)`
    alert(`Simulating adding note to claim ${claim.claimId}: "${newNote}" by ${user.name}`);
    setNewNote('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Claim Details: {claim.claimId}</DialogTitle>
          <DialogDescription>
            A full history and audit trail for this insurance claim.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="flex justify-between items-start gap-4">
                <div>
                    <p className="font-bold">{claim.patientName}</p>
                    <p className="text-sm text-muted-foreground">
                        <Link href={`/dashboard/patients/${claim.patientId}`} className="hover:underline text-primary">
                            Patient ID: {claim.patientId}
                        </Link>
                    </p>
                </div>
                <div>
                     <p className="text-sm font-medium">Provider: {claim.providerId}</p>
                     <p className="text-sm text-muted-foreground">Submitted: {format(new Date(claim.submissionDate), 'PPP')}</p>
                     <p className="text-sm text-muted-foreground">Linked Invoice: {claim.invoiceId}</p>
                </div>
                 <div className="text-right">
                    <p className="text-2xl font-bold">₵{claim.payoutAmount?.toFixed(2) || 'N/A'}</p>
                    <Badge variant={getStatusVariant(claim.status)}>{claim.status}</Badge>
                </div>
            </div>

            {claim.status === 'Denied' && (
                 <div className="p-4 bg-destructive/10 border-l-4 border-destructive rounded-md">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-destructive">Claim Denied</h3>
                            <div className="mt-2 text-sm text-destructive/80">
                                <p>Reason Code: <strong>{claim.denialReasonCode || 'Not Provided'}</strong></p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="space-y-4">
                <h4 className="text-md font-semibold flex items-center">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Follow-up Notes
                </h4>
                <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                    {claim.followUpNotes && claim.followUpNotes.length > 0 ? (
                        claim.followUpNotes.map((note, index) => (
                            <div key={index} className="text-sm border-l-2 pl-3">
                                <p className="font-medium">{note.note}</p>
                                <p className="text-xs text-muted-foreground">
                                    by {note.userId} on {format(new Date(note.date), 'PPP p')}
                                </p>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No follow-up notes recorded.</p>
                    )}
                </div>
                <div className="flex gap-2">
                    <Textarea 
                        placeholder="Add a new note about actions taken on this claim..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                    />
                    <Button onClick={handleAddNote} disabled={!newNote.trim()}>
                        <Send className="h-4 w-4" />
                        <span className="sr-only">Add Note</span>
                    </Button>
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
