'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { format, eachHourOfInterval, startOfDay, endOfDay, isWithinInterval, addHours } from 'date-fns';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

const mockOperatingTheaters = [
    { otRoomId: 'OT-1', name: 'Operating Theatre 1', specialty: 'General' },
    { otRoomId: 'OT-2', name: 'Operating Theatre 2', specialty: 'Cardiothoracic' },
    { otRoomId: 'OT-3', name: 'Operating Theatre 3', specialty: 'Orthopedic' },
];

const mockOtSessions = [
    {
        sessionId: 'session-1',
        otRoomId: 'OT-1',
        procedureName: 'Appendectomy',
        patientName: 'John Doe',
        surgeonName: 'Dr. Evelyn Mensah',
        startTime: new Date('2024-08-16T09:00:00Z'),
        endTime: new Date('2024-08-16T11:00:00Z'),
        status: 'Scheduled'
    },
    {
        sessionId: 'session-2',
        otRoomId: 'OT-1',
        procedureName: 'Hernia Repair',
        patientName: 'Jane Smith',
        surgeonName: 'Dr. Kofi Asante',
        startTime: new Date('2024-08-16T12:00:00Z'),
        endTime: new Date('2024-08-16T14:30:00Z'),
        status: 'In Progress'
    },
    {
        sessionId: 'session-3',
        otRoomId: 'OT-3',
        procedureName: 'Knee Replacement',
        patientName: 'Kwame Owusu',
        surgeonName: 'Dr. Amina El-Rufai',
        startTime: new Date('2024-08-16T10:00:00Z'),
        endTime: new Date('2024-08-16T13:00:00Z'),
        status: 'Scheduled'
    },
];

const getStatusColor = (status: string) => {
    switch(status) {
        case 'In Progress': return 'bg-yellow-100 border-yellow-300';
        case 'Completed': return 'bg-green-100 border-green-300';
        case 'Canceled': return 'bg-red-100 border-red-300';
        default: return 'bg-blue-100 border-blue-300';
    }
}

export function OtScheduleDashboard() {
    // In a real app, this would be the current date. It's fixed here for consistent demo data.
    const today = new Date('2024-08-16T10:15:00.000Z');
    const startOfWorkDay = addHours(startOfDay(today), 7);
    const endOfWorkDay = addHours(startOfDay(today), 19);

    const timeSlots = eachHourOfInterval({
        start: startOfWorkDay,
        end: endOfWorkDay,
    });

    const calculateGridPosition = (startTime: Date, endTime: Date) => {
        const startHour = startTime.getUTCHours() + startTime.getUTCMinutes() / 60;
        const endHour = endTime.getUTCHours() + endTime.getUTCMinutes() / 60;
        const gridStartHour = startOfWorkDay.getUTCHours();
    
        // Each hour is divided into 4 segments (15 mins each).
        // +1 to account for the first column being the label.
        const startCol = (startHour - gridStartHour) * 4 + 1;
        const endCol = (endHour - gridStartHour) * 4 + 1;
    
        return {
            gridColumnStart: `${Math.floor(startCol)}`,
            gridColumnEnd: `${Math.ceil(endCol)}`,
        };
    }
    
    return (
        <div className="border rounded-lg overflow-hidden select-none">
            <div className="grid grid-cols-[1fr_repeat(48,1fr)] bg-muted/50 font-semibold sticky top-0 z-10">
                <div className="p-2 border-b border-r text-center text-sm">OT Room</div>
                {timeSlots.map(time => (
                    <div key={time.toString()} className="p-2 text-center border-b text-xs col-span-4">
                        {format(time, 'HH:mm')}
                    </div>
                ))}
            </div>
            <div className="divide-y relative">
                {mockOperatingTheaters.map(ot => (
                    <div key={ot.otRoomId} className="grid grid-cols-[1fr_repeat(48,1fr)] items-center min-h-[6rem]">
                        <div className="p-2 border-r h-full flex flex-col justify-center items-center font-semibold bg-muted/10">
                            <span>{ot.name}</span>
                            <span className="text-xs text-muted-foreground">{ot.specialty}</span>
                        </div>
                         {mockOtSessions
                            .filter(session => session.otRoomId === ot.otRoomId)
                            .map(session => (
                                <TooltipProvider key={session.sessionId}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div 
                                                className={cn(
                                                    "border rounded-md p-2 text-xs leading-tight m-1 h-20 flex flex-col justify-center cursor-pointer col-start-[var(--grid-column-start)] col-end-[var(--grid-column-end)]",
                                                    getStatusColor(session.status)
                                                )}
                                                style={calculateGridPosition(session.startTime, session.endTime) as React.CSSProperties}
                                            >
                                                <p className="font-bold truncate">{session.procedureName}</p>
                                                <p className="truncate">{session.patientName}</p>
                                                <p className="text-muted-foreground truncate">{session.surgeonName}</p>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="font-semibold">{session.procedureName}</p>
                                            <p>Patient: {session.patientName}</p>
                                            <p>Surgeon: {session.surgeonName}</p>
                                            <p>Time: {format(session.startTime, 'p')} - {format(session.endTime, 'p')}</p>
                                            <p>Status: {session.status}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            ))
                        }
                    </div>
                ))}
            </div>
        </div>
    );
}