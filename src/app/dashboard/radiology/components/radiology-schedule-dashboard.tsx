
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
import { mockRadiologyOrders, allPatients, mockResources } from '@/lib/data';
import { RadiologyOrder } from '@/lib/types';


const getStatusColor = (status: string) => {
    switch(status) {
        case 'Scheduled': return 'bg-blue-100 border-blue-300';
        case 'Completed': return 'bg-green-100 border-green-300';
        default: return 'bg-gray-100 border-gray-300';
    }
}

export function RadiologyScheduleDashboard() {
    // In a real app, this would be the current date. It's fixed here for consistent demo data.
    const today = new Date('2024-08-16T10:15:00.000Z');
    const startOfWorkDay = addHours(startOfDay(today), 7);
    const endOfWorkDay = addHours(startOfDay(today), 19);

    const timeSlots = eachHourOfInterval({
        start: startOfWorkDay,
        end: endOfWorkDay,
    });
    
    const radiologyEquipment = mockResources.filter(r => r.department === 'Radiology');
    const scheduledOrders = mockRadiologyOrders.filter(o => o.status === 'Scheduled' || o.status === 'Awaiting Report');


    const calculateGridPosition = (startTimeStr: string, duration: number) => {
        const startTime = new Date(startTimeStr);
        const startHour = startTime.getUTCHours() + startTime.getUTCMinutes() / 60;
        const endHour = startHour + duration / 60;
        const gridStartHour = startOfWorkDay.getUTCHours();
    
        const startCol = (startHour - gridStartHour) * 4 + 1;
        const endCol = (endHour - gridStartHour) * 4 + 1;
    
        return {
            gridColumnStart: `${Math.floor(startCol)}`,
            gridColumnEnd: `${Math.ceil(endCol)}`,
        };
    }
    
    const getPatientName = (patientId: string) => allPatients.find(p => p.patient_id === patientId)?.full_name || 'Unknown Patient';

    const getEquipmentForOrder = (order: RadiologyOrder) => {
        // This is a simplified mapping. A real app might store the assigned equipmentId on the order.
        const studyType = order.studyIds[0].split('-')[0]; // e.g., 'CT' from 'CT-Chest'
        return radiologyEquipment.find(eq => eq.modality === studyType);
    }
    
    return (
        <div className="border rounded-lg overflow-hidden select-none">
            <div className="grid grid-cols-[1fr_repeat(48,1fr)] bg-muted/50 font-semibold sticky top-0 z-10">
                <div className="p-2 border-b border-r text-center text-sm">Equipment</div>
                {timeSlots.map(time => (
                    <div key={time.toString()} className="p-2 text-center border-b text-xs col-span-4">
                        {format(time, 'HH:mm')}
                    </div>
                ))}
            </div>
            <div className="divide-y relative">
                {radiologyEquipment.map(equip => (
                    <div key={equip.assetId} className="grid grid-cols-[1fr_repeat(48,1fr)] items-center min-h-[6rem]">
                        <div className="p-2 border-r h-full flex flex-col justify-center items-center font-semibold bg-muted/10">
                            <span>{equip.name}</span>
                            <span className="text-xs text-muted-foreground">{equip.modality}</span>
                        </div>
                         {scheduledOrders
                            .filter(order => getEquipmentForOrder(order)?.assetId === equip.assetId)
                            .map(order => (
                                <TooltipProvider key={order.orderId}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div 
                                                className={cn(
                                                    "border rounded-md p-2 text-xs leading-tight m-1 h-20 flex flex-col justify-center cursor-pointer col-start-[var(--grid-column-start)] col-end-[var(--grid-column-end)]",
                                                    getStatusColor(order.status)
                                                )}
                                                style={calculateGridPosition(order.scheduledDateTime!, 60) as React.CSSProperties}
                                            >
                                                <p className="font-bold truncate">{order.studyIds.join(', ')}</p>
                                                <p className="truncate">{getPatientName(order.patientId)}</p>
                                                <p className="text-muted-foreground truncate">Order: {order.orderId}</p>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="font-semibold">{order.studyIds.join(', ')}</p>
                                            <p>Patient: {getPatientName(order.patientId)}</p>
                                            <p>Time: {format(new Date(order.scheduledDateTime!), 'p')}</p>
                                            <p>Status: {order.status}</p>
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
