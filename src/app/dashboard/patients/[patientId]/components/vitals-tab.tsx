
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { VitalsSchema } from '@/lib/schemas';
import { logVitals, streamVitals } from '@/lib/actions';
import { mockVitalsLog as allMockVitals, allUsers } from '@/lib/data';
import { toast } from '@/hooks/use-toast';
import { AlertTriangle, Info, Radio } from 'lucide-react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { VitalsLog } from '@/lib/types';

interface VitalsTabProps {
    patientId: string;
}

export function VitalsTab({ patientId }: VitalsTabProps) {
    const { user } = useAuth();
    const [vitalsLog, setVitalsLog] = useLocalStorage<VitalsLog[]>('vitalsLog', allMockVitals);
    const [isStreaming, setIsStreaming] = React.useState(false);

    const patientVitals = vitalsLog.filter(v => v.patientId === patientId);

    const form = useForm<z.infer<typeof VitalsSchema>>({
        resolver: zodResolver(VitalsSchema),
        defaultValues: {
            bloodPressure: '',
            heartRate: '',
            temperature: '',
            respiratoryRate: '',
            oxygenSaturation: '',
            painScore: '',
            notes: '',
        }
    });

    const handleStreamVitals = async () => {
        setIsStreaming(true);
        toast.info('Simulating live sensor data for 30 seconds.');
        await streamVitals(patientId);
        setIsStreaming(false);
        toast.info('Vitals Stream Ended: Live sensor simulation has completed.');
    };

    const onSubmit = async (values: z.infer<typeof VitalsSchema>) => {
        if (!user) {
            toast.error("You must be logged in.");
            return;
        }

        const newVitalsEntry: VitalsLog = {
            vitalId: `vtl-${Date.now()}`,
            patientId,
            ...values,
            recordedByUserId: user.uid,
            recordedAt: new Date().toISOString(),
        };

        setVitalsLog(prev => [newVitalsEntry, ...prev]);

        form.reset();
        
        // Simulate checking for alerts
        const [systolic, diastolic] = values.bloodPressure.split('/').map(Number);
        if (systolic > 180 || diastolic > 110) {
            toast.warning("Patient's blood pressure is critically high. Attending doctor has been notified.", {
                icon: <AlertTriangle className="h-4 w-4" />,
            });
        } else {
             toast.success("The patient's vital signs have been saved.");
        }
    }

    const getStaffName = (userId: string) => {
        return allUsers.find(u => u.uid === userId)?.name || 'Staff';
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Log New Vitals</CardTitle>
                            <CardDescription>Enter the latest vital signs for the patient.</CardDescription>
                        </div>
                         <Button variant="outline" onClick={handleStreamVitals} disabled={isStreaming}>
                            <Radio className="mr-2 h-4 w-4" />
                            {isStreaming ? 'Streaming Vitals...' : 'Start Live Monitoring (Simulated)'}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                                <FormField
                                    control={form.control}
                                    name="bloodPressure"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>BP (Systolic/Diastolic)</FormLabel>
                                            <FormControl><Input placeholder="e.g., 120/80" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="heartRate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Heart Rate (bpm)</FormLabel>
                                            <FormControl><Input type="number" placeholder="e.g., 75" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="temperature"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Temperature (°C)</FormLabel>
                                            <FormControl><Input type="number" step="0.1" placeholder="e.g., 37.5" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="respiratoryRate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Resp. Rate (b/min)</FormLabel>
                                            <FormControl><Input type="number" placeholder="e.g., 18" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="oxygenSaturation"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>SpO2 (%)</FormLabel>
                                            <FormControl><Input type="number" placeholder="e.g., 98" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={form.control}
                                    name="painScore"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Pain Score (0-10)</FormLabel>
                                            <FormControl><Input type="number" placeholder="e.g., 2" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={form.control}
                                name="notes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Notes (Optional)</FormLabel>
                                        <FormControl><Textarea placeholder="Any observations..." {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="flex justify-end">
                                <Button type="submit" disabled={form.formState.isSubmitting}>
                                    {form.formState.isSubmitting ? 'Saving...' : 'Save Vitals'}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Vitals History</CardTitle>
                    <CardDescription>A log of previously recorded vital signs.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Timestamp</TableHead>
                                    <TableHead>BP</TableHead>
                                    <TableHead>HR</TableHead>
                                    <TableHead>Temp</TableHead>
                                    <TableHead>Resp</TableHead>
                                    <TableHead>SpO2</TableHead>
                                    <TableHead>Pain</TableHead>
                                    <TableHead>Recorded By</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {patientVitals.length > 0 ? (
                                    patientVitals.map((log) => (
                                        <TableRow key={log.vitalId}>
                                            <TableCell>{format(new Date(log.recordedAt), 'PPP p')}</TableCell>
                                            <TableCell>{log.bloodPressure}</TableCell>
                                            <TableCell>{log.heartRate}</TableCell>
                                            <TableCell>{log.temperature}°C</TableCell>
                                            <TableCell>{log.respiratoryRate}</TableCell>
                                            <TableCell>{log.oxygenSaturation}%</TableCell>
                                            <TableCell>{log.painScore || 'N/A'}</TableCell>
                                            <TableCell>{getStaffName(log.recordedByUserId)}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center">
                                            No vitals recorded for this patient yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
