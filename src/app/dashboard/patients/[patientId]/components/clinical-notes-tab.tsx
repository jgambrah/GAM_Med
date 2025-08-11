
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

export interface ClinicalNote {
    id: string;
    author: string;
    date: string; // ISO string
    content: string;
}

interface ClinicalNotesTabProps {
    notes: ClinicalNote[];
}

// Mock data for clinical notes
export const mockNotes: ClinicalNote[] = [
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
                        <div key={note.id} className="border-l-4 border-primary pl-4 py-2">
                           <p className="text-sm text-muted-foreground">
                             {format(new Date(note.date), 'PPP p')} by <span className="font-semibold">{note.author}</span>
                           </p>
                           <p className="mt-1 whitespace-pre-wrap">{note.content}</p>
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
