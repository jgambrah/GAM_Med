
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FacilitySchedule } from './components/facility-schedule';
import { mockResourceBookings, mockResources } from '@/lib/data';
import { eachHourOfInterval, startOfDay, endOfDay, getHours } from 'date-fns';

export default function SpaceManagementPage() {
    const totalHours = 12 * 7; // 12 hours a day, 7 days a week
    const bookedHours = mockResourceBookings.reduce((acc, booking) => {
        const start = new Date(booking.startTime);
        const end = new Date(booking.endTime);
        const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return acc + duration;
    }, 0);

    const bookableResources = mockResources.filter(r => r.isBookable);
    const totalAvailableHours = bookableResources.length * totalHours;
    const utilizationRate = (bookedHours / totalAvailableHours) * 100;
    
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Space & Facility Management</h1>
                <p className="text-muted-foreground">
                    A real-time dashboard for monitoring and managing facility utilization.
                </p>
            </div>
            
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Bookable Facilities</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{bookableResources.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Space Utilization Rate (Weekly)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{utilizationRate.toFixed(1)}%</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Booked Hours (Weekly)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{bookedHours.toFixed(1)}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Available Hours (Weekly)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{(totalAvailableHours - bookedHours).toFixed(1)}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Facility Schedule</CardTitle>
                    <CardDescription>
                        A color-coded calendar view showing the schedules for all facilities.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <FacilitySchedule />
                </CardContent>
            </Card>
        </div>
    )
}
