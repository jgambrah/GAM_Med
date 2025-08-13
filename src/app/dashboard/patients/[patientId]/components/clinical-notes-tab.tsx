
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { ClinicalNote } from '@/lib/types';
import { mockNotes as allMockNotes } from '@/lib/data';
import { useParams } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { addClinicalNote } from '@/lib/actions';
import { useAuth } from '@/hooks/use-auth';
import { FileText } from 'lucide-react';

export function AddNoteDialog({ patientId, disabled }: { patientId: string, disabled?: boolean }) {
    const { user } = useAuth();
    const [open, setOpen] = React.useState(false);
    const [newNote, setNewNote] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNote.trim()) return;

        setIsSubmitting(true);
        // This server action encapsulates the logic to write to the
        // /patients/{patientId}/clinical_notes sub-collection.
        await addClinicalNote(patientId, newNote);
        alert('New clinical note has been added (simulated).');
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
                    <DialogTitle>Add New Clinical Note</DialogTitle>
                     <DialogDescription>
                        Recording a new note for the patient as {user?.name}.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                     <Textarea 
                        placeholder="Type new clinical note here..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        rows={6}
                        disabled={isSubmitting}
                     />
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting || !newNote.trim()}>
                            {isSubmitting ? 'Saving...' : 'Save Note'}
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
    const isDoctor = user?.role === 'doctor';
    const notes = allMockNotes.filter(note => note.patientId === patientId)

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Clinical Notes</CardTitle>
                    <CardDescription>A chronological record of all clinical interactions and observations.</CardDescription>
                </div>
                {isDoctor && <AddNoteDialog patientId={patientId} />}
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4 max-h-96 overflow-y-auto pr-4">
                    {notes.length > 0 ? (
                        notes.map((note) => (
                        <div key={note.noteId} className="border-l-4 border-primary pl-4 py-2">
                           <p className="text-sm text-muted-foreground">
                             {format(new Date(note.recordedAt), 'PPP p')} by <span className="font-semibold">{note.recordedByUserId === 'doc1' ? 'Dr. Evelyn Mensah' : 'F. Agyepong'}</span>
                           </p>
                           <p className="mt-1 whitespace-pre-wrap">{note.noteText}</p>
                        </div>
                    ))
                    ) : (
                        <div className="flex items-center justify-center h-40 text-center">
                            <p className="text-muted-foreground">No clinical notes recorded for this patient.</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

    