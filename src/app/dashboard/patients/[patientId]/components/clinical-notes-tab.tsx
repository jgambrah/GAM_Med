'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { ClinicalNote } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { FileText, Loader2 } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';

export function AddNoteDialog({ patientId, disabled, onNoteAdded }: { patientId: string, disabled?: boolean, onNoteAdded: (note: ClinicalNote) => void }) {
    const { user } = useAuth();
    const firestore = useFirestore();
    const [open, setOpen] = React.useState(false);
    const [newNote, setNewNote] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNote.trim() || !user || !firestore) return;

        setIsSubmitting(true);

        const newNoteData = {
            hospitalId: user.hospitalId,
            patientId: patientId,
            noteType: 'Consultation',
            recordedByUserId: user.uid,
            noteText: newNote,
            recordedAt: new Date().toISOString()
        };

        // NON-BLOCKING WRITE: Optimized for high clinical throughput
        addDocumentNonBlocking(collection(firestore, 'clinical_notes'), newNoteData);
        
        toast.success('Clinical note recorded.');
        setNewNote('');
        setIsSubmitting(false);
        setOpen(false);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={disabled}>
                    <FileText className="h-4 w-4 mr-2" /> Add Note
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Clinical Note</DialogTitle>
                     <DialogDescription>
                        Record observations for this patient.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                     <Textarea 
                        placeholder="Type clinical observations here..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        rows={6}
                        disabled={isSubmitting}
                     />
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting || !newNote.trim()}>
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Save Note
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

interface ClinicalNotesTabProps {
    patientId: string;
}

export function ClinicalNotesTab({ patientId }: ClinicalNotesTabProps) {
    const { user } = useAuth();
    const firestore = useFirestore();
    
    // LIVE QUERY: Filtered by hospital and patient for strict SaaS isolation
    const notesQuery = useMemoFirebase(() => {
        if (!firestore || !patientId || !user?.hospitalId) return null;
        return query(
            collection(firestore, 'clinical_notes'),
            where('hospitalId', '==', user.hospitalId),
            where('patientId', '==', patientId),
            orderBy('recordedAt', 'desc')
        );
    }, [firestore, patientId, user?.hospitalId]);

    const { data: notes, isLoading } = useCollection<ClinicalNote>(notesQuery);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Clinical Notes</CardTitle>
                    <CardDescription>Chronological record of clinical interactions.</CardDescription>
                </div>
                <AddNoteDialog patientId={patientId} onNoteAdded={() => {}} />
            </CardHeader>
            <CardContent className="space-y-6">
                {isLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto pr-4">
                        {notes && notes.length > 0 ? (
                            notes.map((note) => (
                            <div key={note.id} className="border-l-4 border-primary pl-4 py-2">
                               <p className="text-xs text-muted-foreground">
                                 {format(new Date(note.recordedAt), 'PPP p')}
                               </p>
                               <p className="mt-1 whitespace-pre-wrap text-sm">{note.noteText}</p>
                            </div>
                        ))
                        ) : (
                            <div className="flex items-center justify-center h-40 text-center">
                                <p className="text-muted-foreground">No notes on file for this patient.</p>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
