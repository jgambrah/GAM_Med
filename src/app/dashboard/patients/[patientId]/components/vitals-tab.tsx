
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Plus } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';
import { VitalSign } from '@/lib/types';
import { NewVitalsSchema } from '@/lib/schemas';
import { addVitals } from '@/lib/actions';
import { useParams } from 'next/navigation';

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

function RecordVitalsDialog() {
    const params = useParams();
    const patientId = params.patientId as string;
    const [open, setOpen] = React.useState(false);

    const form = useForm<z.infer<typeof NewVitalsSchema>>({
        resolver: zodResolver(NewVitalsSchema),
        defaultValues: {
            temperature: 36.5,
            bloodPressure: '',
            heartRate: 70,
            respiratoryRate: 16,
            oxygenSaturation: 98,
        }
    });

    const onSubmit = async (values: z.infer<typeof NewVitalsSchema>) => {
        const result = await addVitals(patientId, values);
        if(result.success) {
            alert('Vitals recorded successfully (simulated).');
            setOpen(false);
            form.reset();
        } else {
            alert(`Error: ${result.message}`);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Record Vitals
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Record New Vital Signs</DialogTitle>
                    <DialogDescription>
                        Enter the patient's latest vital signs.
                    </DialogDescription>
                </DialogHeader>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                             <FormField
                                control={form.control}
                                name="bloodPressure"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Blood Pressure (mmHg)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., 120/80" {...field} />
                                        </FormControl>
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
                                        <FormControl>
                                            <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10))}/>
                                        </FormControl>
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
                                        <FormControl>
                                            <Input type="number" step="0.1" {...field} onChange={e => field.onChange(parseFloat(e.target.value))}/>
                                        </FormControl>
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
                                        <FormControl>
                                            <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10))}/>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="respiratoryRate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Respiratory Rate</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10))}/>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? 'Saving...' : 'Save Vitals'}
                            </Button>
                        </DialogFooter>
                    </form>
                 </Form>
            </DialogContent>
        </Dialog>
    )
}

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
                {canAddVitals && <RecordVitalsDialog />}
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
