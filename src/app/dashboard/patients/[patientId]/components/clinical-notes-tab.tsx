
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { ClinicalNote } from '@/lib/types';
import { mockNotes as allMockNotes } from '@/lib/data';
import { useParams } from 'next/navigation';

interface ClinicalNotesTabProps {
    notes: ClinicalNote[];
}

export function ClinicalNotesTab({ notes }: ClinicalNotesTabProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Clinical Notes</CardTitle>
                <CardDescription>A chronological record of all clinical interactions and observations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4 max-h-96 overflow-y-auto pr-4">
                    {notes.length > 0 ? (
                        notes.map((note) => (
                        <div key={note.noteId} className="border-l-4 border-primary pl-4 py-2">
                           <p className="text-sm text-muted-foreground">
                             {format(new Date(note.recordedAt), 'PPP p')} by <span className="font-semibold">{note.recordedByUserId === 'doc1' ? 'Dr. Evelyn Mensah' : 'Staff'}</span>
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
