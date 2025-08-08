// This is a new file
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { addClinicalNote } from '@/lib/actions';
import { format } from 'date-fns';

interface ClinicalNotesTabProps {
    patientId: string;
}

// Mock data for clinical notes
const mockNotes = [
    {
        id: 'note-1',
        author: 'Dr. Evelyn Mensah',
        date: new Date('2024-07-28T11:00:00Z').toISOString(),
        content: 'Patient admitted for observation due to hypertension. BP at 160/100. Started on Amlodipine 5mg daily.'
    },
    {
        id: 'note-2',
        author: 'Florence Agyepong',
        date: new Date('2024-07-28T15:30:00Z').toISOString(),
        content: 'Patient reports feeling dizzy. BP checked: 155/98. Administered evening dose of medication as prescribed. Patient resting comfortably.'
    },
    {
        id: 'note-3',
        author: 'Dr. Evelyn Mensah',
        date: new Date('2024-07-29T09:15:00Z').toISOString(),
        content: 'Morning rounds. Patient feels better, no dizziness reported. BP is stable at 140/90. Continue current treatment plan.'
    }
]

export function ClinicalNotesTab({ patientId }: ClinicalNotesTabProps) {
    const { user } = useAuth();
    const [newNote, setNewNote] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNote.trim()) return;

        setIsSubmitting(true);
        await addClinicalNote(patientId, newNote);
        alert('New clinical note has been added (simulated).');
        setNewNote('');
        setIsSubmitting(false);
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Clinical Notes</CardTitle>
                <CardDescription>Records of all clinical interactions and observations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4 max-h-96 overflow-y-auto pr-4">
                    {mockNotes.map((note) => (
                        <div key={note.id} className="border-l-4 border-primary pl-4 py-2">
                           <p className="text-sm text-muted-foreground">
                             {format(new Date(note.date), 'PPP p')} by <span className="font-semibold">{note.author}</span>
                           </p>
                           <p className="mt-1">{note.content}</p>
                        </div>
                    ))}
                </div>
                 {user && (user.role === 'doctor' || user.role === 'nurse') && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                             <h4 className="font-medium mb-2">Add New Note</h4>
                             <Textarea 
                                placeholder="Type new clinical note here..."
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                rows={4}
                                disabled={isSubmitting}
                             />
                        </div>
                        <div className="flex justify-end">
                            <Button type="submit" disabled={isSubmitting || !newNote.trim()}>
                                {isSubmitting ? 'Saving...' : 'Save Note'}
                            </Button>
                        </div>
                    </form>
                 )}
            </CardContent>
        </Card>
    );
}
