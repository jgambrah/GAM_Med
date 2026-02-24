
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
import { Facility, FacilityBooking } from '@/lib/types';

interface FacilityScheduleProps {
    facilities: Facility[];
    bookings: FacilityBooking[];
}

/**
 * == Facility Schedule Map ==
 * 
 * Renders an interactive, visual grid of room occupancy across the facility.
 */
export function FacilitySchedule({ facilities, bookings }: FacilityScheduleProps) {
    // Current simulation context: Today at 10 AM
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
    
        // Each hour is divided into 4 segments (15 mins each).
        const startCol = (startHour - gridStartHour) * 4 + 1;
        const endCol = (endHour - gridStartHour) * 4 + 1;
    
        return {
            gridColumnStart: `${Math.floor(startCol)}`,
            gridColumnEnd: `${Math.ceil(endCol)}`,
        };
    }
    
    return (
        <div className="border rounded-xl overflow-hidden select-none shadow-sm">
            {/* Header: Time Axis */}
            <div className="grid grid-cols-[180px_repeat(48,1fr)] bg-slate-50 font-black border-b">
                <div className="p-3 border-r text-center text-[10px] uppercase tracking-widest text-slate-400">Unit Label</div>
                {timeSlots.map(time => (
                    <div key={time.toString()} className="p-3 text-center border-r text-[10px] col-span-4 text-slate-500">
                        {format(time, 'HH:mm')}
                    </div>
                ))}
            </div>

            {/* Rows: Facility Axis */}
            <div className="divide-y relative">
                {facilities.map(facility => (
                    <div key={facility.id} className="grid grid-cols-[180px_repeat(48,1fr)] items-center min-h-[5rem] group hover:bg-slate-50/50 transition-colors">
                        {/* Label */}
                        <div className="p-4 border-r h-full flex flex-col justify-center bg-white z-10">
                            <span className="text-sm font-black text-slate-900 leading-tight">{facility.name}</span>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] font-black uppercase tracking-tighter text-blue-600 bg-blue-50 px-1.5 rounded">{facility.type}</span>
                                <span className="text-[9px] font-bold text-slate-400">Cap: {facility.capacity}</span>
                            </div>
                        </div>

                        {/* Booking Lane */}
                        <div className="col-start-2 col-span-full relative h-full grid grid-cols-[repeat(48,1fr)] items-center">
                            {bookings
                                .filter(b => b.facilityId === facility.id)
                                .map(booking => (
                                    <TooltipProvider key={booking.id}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div 
                                                    className={cn(
                                                        "border-2 rounded-xl p-2.5 text-[10px] leading-none m-1.5 h-[70%] flex flex-col justify-center cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md",
                                                        booking.status === 'Confirmed' ? "bg-blue-50 border-blue-200 text-blue-900" : "bg-slate-100 border-slate-200 text-slate-500"
                                                    )}
                                                    style={calculateGridPosition(booking.startTime, booking.endTime) as React.CSSProperties}
                                                >
                                                    <p className="font-black truncate uppercase tracking-tighter">{booking.purpose}</p>
                                                    <p className="text-[9px] font-bold opacity-60 mt-1 truncate">Sched: {format(new Date(booking.startTime), 'HH:mm')}</p>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent className="bg-slate-900 text-white border-none p-3 rounded-xl shadow-2xl">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Reservation Details</p>
                                                    <p className="font-bold text-sm">{booking.purpose}</p>
                                                    <p className="text-[10px] opacity-70">
                                                        Time: {format(new Date(booking.startTime), 'p')} - {format(new Date(booking.endTime), 'p')}
                                                    </p>
                                                    <div className="pt-2 border-t border-white/10 mt-2">
                                                        <p className="text-[9px] font-bold uppercase">Reserved By: {booking.userId}</p>
                                                    </div>
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                ))
                            }
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
