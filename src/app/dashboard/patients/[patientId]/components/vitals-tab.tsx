
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';
import { VitalSign } from '@/lib/types';

// In a real application, this data would come from a real-time listener
// on the /patients/{patientId}/vitals sub-collection.
const mockVitals: VitalSign[] = [
    {
        vitalId: 'vital-1',
        temperature: 36.8,
        bloodPressure: '160/100',
        heartRate: 88,
        respiratoryRate: 18,
        oxygenSaturation: 98,
        recordedByUserId: 'nurse1',
        recordedAt: new Date('2024-07-28T11:00:00Z').toISOString(),
    },
    {
        vitalId: 'vital-2',
        temperature: 37.0,
        bloodPressure: '155/98',
        heartRate: 92,
        respiratoryRate: 18,
        oxygenSaturation: 97,
        recordedByUserId: 'nurse1',
        recordedAt: new Date('2024-07-28T15:30:00Z').toISOString(),
    },
    {
        vitalId: 'vital-3',
        temperature: 36.9,
        bloodPressure: '140/90',
        heartRate: 80,
        respiratoryRate: 16,
        oxygenSaturation: 99,
        recordedByUserId: 'nurse1',
        recordedAt: new Date('2024-07-29T09:15:00Z').toISOString(),
    }
];


export function VitalsTab() {
    const { user } = useAuth();
    const canAddVitals = user?.role === 'nurse';

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Vital Signs</CardTitle>
                    <CardDescription>A chronological record of the patient's vital signs.</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date & Time</TableHead>
                                <TableHead>BP (mmHg)</TableHead>
                                <TableHead>Heart Rate</TableHead>
                                <TableHead>Temp (°C)</TableHead>
                                <TableHead>SpO2 (%)</TableHead>
                                <TableHead>Recorded By</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mockVitals.length > 0 ? (
                                mockVitals.map((vital) => (
                                    <TableRow key={vital.vitalId}>
                                        <TableCell className="font-medium">{format(new Date(vital.recordedAt), 'PPP p')}</TableCell>
                                        <TableCell>{vital.bloodPressure}</TableCell>
                                        <TableCell>{vital.heartRate}</TableCell>
                                        <TableCell>{vital.temperature.toFixed(1)}</TableCell>
                                        <TableCell>{vital.oxygenSaturation}</TableCell>
                                        <TableCell>Florence Agyepong</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        No vital signs recorded.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
