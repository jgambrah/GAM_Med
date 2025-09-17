
'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { format, eachHourOfInterval, startOfDay, endOfDay, addHours } from 'date-fns';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { mockResourceBookings, mockResources } from '@/lib/data';

const getStatusColor = (status: string) => {
    switch(status) {
        case 'Confirmed': return 'bg-blue-100 border-blue-300';
        default: return 'bg-gray-100 border-gray-300';
    }
}

export function FacilitySchedule() {
    const today = new Date('2024-08-16T10:15:00.000Z');
    const startOfWorkDay = addHours(startOfDay(today), 7);
    const endOfWorkDay = addHours(startOfDay(today), 19);

    const timeSlots = eachHourOfInterval({
        start: startOfWorkDay,
        end: endOfWorkDay,
    });

    const bookableFacilities = mockResources.filter(r => r.isBookable);
    
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
            <div className="grid grid-cols-[1fr_repeat(48,1fr)] bg-muted/50 font-semibold sticky top-0 z-10">
                <div className="p-2 border-b border-r text-center text-sm">Facility</div>
                {timeSlots.map(time => (
                    <div key={time.toString()} className="p-2 text-center border-b text-xs col-span-4">
                        {format(time, 'HH:mm')}
                    </div>
                ))}
            </div>
            <div className="divide-y relative">
                {bookableFacilities.map(facility => (
                    <div key={facility.assetId} className="grid grid-cols-[1fr_repeat(48,1fr)] items-center min-h-[6rem]">
                        <div className="p-2 border-r h-full flex flex-col justify-center items-center font-semibold bg-muted/10">
                            <span>{facility.name}</span>
                            <span className="text-xs text-muted-foreground">{facility.location}</span>
                        </div>
                         {mockResourceBookings
                            .filter(booking => booking.resourceId === facility.assetId)
                            .map(booking => (
                                <TooltipProvider key={booking.bookingId}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div 
                                                className={cn(
                                                    "border rounded-md p-2 text-xs leading-tight m-1 h-20 flex flex-col justify-center cursor-pointer col-start-[var(--grid-column-start)] col-end-[var(--grid-column-end)]",
                                                    getStatusColor(booking.status)
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
                ))}
            </div>
        </div>
    );
}
