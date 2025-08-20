
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { format, eachHourOfInterval, startOfDay, endOfDay, addHours } from 'date-fns';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { ResourceBooking } from '@/lib/types';

interface ResourceCalendarProps {
    bookings: ResourceBooking[];
}

export function ResourceCalendar({ bookings }: ResourceCalendarProps) {
    // In a real app, this would be the current date. It's fixed here for consistent demo data.
    const today = new Date('2024-08-16T10:15:00.000Z');
    const startOfWorkDay = addHours(startOfDay(today), 7);
    const endOfWorkDay = addHours(startOfDay(today), 19);

    const timeSlots = eachHourOfInterval({
        start: startOfWorkDay,
        end: endOfWorkDay,
    });

    const calculateGridPosition = (startTimeStr: string, endTimeStr: string) => {
        const startTime = new Date(startTimeStr);
        const endTime = new Date(endTimeStr);
        const startHour = startTime.getUTCHours() + startTime.getUTCMinutes() / 60;
        const endHour = endTime.getUTCHours() + endTime.getUTCMinutes() / 60;
        const gridStartHour = startOfWorkDay.getUTCHours();
    
        const startCol = (startHour - gridStartHour) * 4 + 1;
        const endCol = (endHour - gridStartHour) * 4 + 1;
    
        return {
            gridColumnStart: `${Math.floor(startCol)}`,
            gridColumnEnd: `${Math.ceil(endCol)}`,
        };
    }
    
    return (
        <div className="border rounded-lg overflow-hidden select-none">
            <div className="grid grid-cols-[repeat(48,1fr)] bg-muted/50 font-semibold sticky top-0 z-10">
                {timeSlots.map(time => (
                    <div key={time.toString()} className="p-2 text-center border-b text-xs col-span-4">
                        {format(time, 'HH:mm')}
                    </div>
                ))}
            </div>
            <div className="relative">
                <div className="grid grid-cols-[repeat(48,1fr)] items-center min-h-[6rem]">
                    {bookings
                        .map(booking => (
                            <TooltipProvider key={booking.bookingId}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div 
                                            className={cn(
                                                "border rounded-md p-2 text-xs leading-tight m-1 h-20 flex flex-col justify-center cursor-pointer col-start-[var(--grid-column-start)] col-end-[var(--grid-column-end)] bg-blue-100 border-blue-300"
                                            )}
                                            style={calculateGridPosition(booking.startTime, booking.endTime) as React.CSSProperties}
                                        >
                                            <p className="font-bold truncate">{booking.reason}</p>
                                            <p className="text-muted-foreground truncate">Ref: {booking.relatedAppointmentId}</p>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="font-semibold">{booking.reason}</p>
                                        <p>Time: {format(new Date(booking.startTime), 'p')} - {format(new Date(booking.endTime), 'p')}</p>
                                        <p>Booked by: {booking.bookedByUserId}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ))
                    }
                </div>
            </div>
        </div>
    );
}
