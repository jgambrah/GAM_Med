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
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { AlertTriangle, Radio, Loader2 } from 'lucide-react';
import { VitalsLog } from '@/lib/types';

interface VitalsTabProps {
    patientId: string;
}

export function VitalsTab({ patientId }: VitalsTabProps) {
    const { user } = useAuth();
    const firestore = useFirestore();
    const [isStreaming, setIsStreaming] = React.useState(false);

    // LIVE QUERY: Real-time vitals history
    const vitalsQuery = useMemoFirebase(() => {
        if (!firestore || !patientId || !user?.hospitalId) return null;
        return query(
            collection(firestore, 'vitals_log'),
            where('hospitalId', '==', user.hospitalId),
            where('patientId', '==', patientId),
            orderBy('recordedAt', 'desc')
        );
    }, [firestore, patientId, user?.hospitalId]);

    const { data: vitalsHistory, isLoading } = useCollection<VitalsLog>(vitalsQuery);

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

    const onSubmit = async (values: z.infer<typeof VitalsSchema>) => {
        if (!user || !firestore) return;

        const newVitalsEntry = {
            ...values,
            hospitalId: user.hospitalId,
            patientId,
            recordedByUserId: user.uid,
            recordedAt: new Date().toISOString(),
        };

        addDocumentNonBlocking(collection(firestore, 'vitals_log'), newVitalsEntry);

        form.reset();
        
        const [systolic, diastolic] = values.bloodPressure.split('/').map(Number);
        if (systolic > 180 || diastolic > 110) {
            toast.warning("Critical BP Warning: Provider notified.", {
                icon: <AlertTriangle className="h-4 w-4" />,
            });
        } else {
             toast.success("Vitals saved.");
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Log New Vitals</CardTitle>
                            <CardDescription>Enter latest clinical measurements.</CardDescription>
                        </div>
                         <Button variant="outline" size="sm" onClick={() => setIsStreaming(!isStreaming)} disabled={isStreaming}>
                            <Radio className="mr-2 h-4 w-4" />
                            {isStreaming ? 'Streaming...' : 'Start Monitoring'}
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
                                            <FormLabel className="text-xs">BP (S/D)</FormLabel>
                                            <FormControl><Input placeholder="120/80" className="h-8 text-xs" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="heartRate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs">HR (bpm)</FormLabel>
                                            <FormControl><Input type="number" className="h-8 text-xs" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="temperature"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs">Temp (°C)</FormLabel>
                                            <FormControl><Input type="number" step="0.1" className="h-8 text-xs" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="respiratoryRate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs">Resp (b/m)</FormLabel>
                                            <FormControl><Input type="number" className="h-8 text-xs" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="oxygenSaturation"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs">SpO2 (%)</FormLabel>
                                            <FormControl><Input type="number" className="h-8 text-xs" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={form.control}
                                    name="painScore"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs">Pain (0-10)</FormLabel>
                                            <FormControl><Input type="number" className="h-8 text-xs" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="flex justify-end">
                                <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
                                    Save Vitals
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>History</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Time</TableHead>
                                    <TableHead>BP</TableHead>
                                    <TableHead>HR</TableHead>
                                    <TableHead>Temp</TableHead>
                                    <TableHead>SpO2</TableHead>
                                    <TableHead>Pain</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={6} className="text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></TableCell></TableRow>
                                ) : vitalsHistory && vitalsHistory.length > 0 ? (
                                    vitalsHistory.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell className="text-xs">{format(new Date(log.recordedAt), 'MM/dd p')}</TableCell>
                                            <TableCell className="text-xs">{log.bloodPressure}</TableCell>
                                            <TableCell className="text-xs">{log.heartRate}</TableCell>
                                            <TableCell className="text-xs">{log.temperature}°C</TableCell>
                                            <TableCell className="text-xs">{log.oxygenSaturation}%</TableCell>
                                            <TableCell className="text-xs">{log.painScore || '0'}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No data.</TableCell>
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
