
'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { format, eachHourOfInterval, startOfDay, endOfDay, isWithinInterval, addHours } from 'date-fns';

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
        leadSurgeonName: 'Dr. Evelyn Mensah',
        startTime: new Date('2024-08-16T09:00:00Z'),
        endTime: new Date('2024-08-16T11:00:00Z'),
    },
    {
        sessionId: 'session-2',
        otRoomId: 'OT-1',
        procedureName: 'Hernia Repair',
        patientName: 'Jane Smith',
        leadSurgeonName: 'Dr. Kofi Asante',
        startTime: new Date('2024-08-16T12:00:00Z'),
        endTime: new Date('2024-08-16T14:30:00Z'),
    },
    {
        sessionId: 'session-3',
        otRoomId: 'OT-3',
        procedureName: 'Knee Replacement',
        patientName: 'Kwame Owusu',
        leadSurgeonName: 'Dr. Amina El-Rufai',
        startTime: new Date('2024-08-16T10:00:00Z'),
        endTime: new Date('2024-08-16T13:00:00Z'),
    },
];

export function OtScheduleDashboard() {
    const today = new Date('2024-08-16T10:15:00.000Z');
    const startOfWorkDay = addHours(startOfDay(today), 7);
    const endOfWorkDay = addHours(startOfDay(today), 19);

    const timeSlots = eachHourOfInterval({
        start: startOfWorkDay,
        end: endOfWorkDay,
    });

    const getSessionForSlot = (otRoomId: string, slot: Date) => {
        return mockOtSessions.find(session => 
            session.otRoomId === otRoomId &&
            isWithinInterval(slot, { start: session.startTime, end: session.endTime })
        );
    }

    const calculateGridSpan = (startTime: Date, endTime: Date) => {
        const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
        return Math.ceil(durationMinutes / 60);
    }
    
    return (
        <div className="border rounded-lg overflow-hidden">
            <div className="grid grid-cols-[1fr_repeat(12,2fr)] bg-muted/50 font-semibold">
                <div className="p-2 border-b border-r text-center">OT Room</div>
                {timeSlots.map(time => (
                    <div key={time.toString()} className="p-2 text-center border-b">
                        {format(time, 'HH:mm')}
                    </div>
                ))}
            </div>
            <div className="divide-y">
                {mockOperatingTheaters.map(ot => (
                    <div key={ot.otRoomId} className="grid grid-cols-[1fr_repeat(12,2fr)] items-center">
                        <div className="p-2 border-r h-full flex flex-col justify-center items-center font-semibold bg-muted/10">
                            <span>{ot.name}</span>
                            <span className="text-xs text-muted-foreground">{ot.specialty}</span>
                        </div>
                        {mockOtSessions
                            .filter(session => session.otRoomId === ot.otRoomId)
                            .map(session => {
                                const startHour = session.startTime.getHours();
                                const colStart = startHour - startOfWorkDay.getHours() + 2;
                                const colSpan = calculateGridSpan(session.startTime, session.endTime);
                                return (
                                    <div 
                                        key={session.sessionId}
                                        className="bg-blue-100 border border-blue-300 rounded-md p-2 text-xs leading-tight m-1"
                                        style={{
                                            gridColumn: `${colStart} / span ${colSpan}`,
                                        }}
                                    >
                                        <p className="font-bold truncate">{session.procedureName}</p>
                                        <p className="truncate">{session.patientName}</p>
                                        <p className="text-muted-foreground truncate">{session.leadSurgeonName}</p>
                                        <p className="text-muted-foreground truncate">{format(session.startTime, 'p')} - {format(session.endTime, 'p')}</p>
                                    </div>
                                )
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}
