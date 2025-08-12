
'use client';

import *s React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Patient } from '@/lib/types';
import { NewVitalsSchema } from '@/lib/schemas';
import { addVitals } from '@/lib/actions';
import { mockVitals } from '@/lib/data';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface PatientVitalsPaneProps {
  patient: Patient;
}

export function PatientVitalsPane({ patient }: PatientVitalsPaneProps) {
  const form = useForm<z.infer<typeof NewVitalsSchema>>({
    resolver: zodResolver(NewVitalsSchema),
    defaultValues: {
      bloodPressure: '',
      heartRate: undefined,
      oxygenSaturation: undefined,
      respiratoryRate: undefined,
      temperature: undefined,
    },
  });
  
  const onSubmit = async (values: z.infer<typeof NewVitalsSchema>) => {
    const result = await addVitals(patient.patient_id, values);
    if (result.success) {
      alert('Vitals recorded successfully (simulated).');
      form.reset();
    } else {
      alert(`Error: ${result.message}`);
    }
  };

  const patientVitals = mockVitals.filter(v => v.patientId === patient.patient_id)
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Record Vitals for {patient.full_name}</CardTitle>
        <CardDescription>Enter the latest vital signs for the patient.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Vitals Entry Form */}
            <div>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="bloodPressure" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Blood Pressure</FormLabel>
                                    <FormControl><Input placeholder="e.g., 120/80" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="heartRate" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Heart Rate (bpm)</FormLabel>
                                    <FormControl><Input type="number" placeholder="e.g., 75" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="temperature" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Temperature (°C)</FormLabel>
                                    <FormControl><Input type="number" step="0.1" placeholder="e.g., 36.8" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="oxygenSaturation" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>SpO2 (%)</FormLabel>
                                    <FormControl><Input type="number" placeholder="e.g., 98" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="respiratoryRate" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Resp. Rate</FormLabel>
                                    <FormControl><Input type="number" placeholder="e.g., 16" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting ? 'Saving...' : 'Record Vitals'}
                        </Button>
                    </form>
                </Form>
            </div>
            {/* Vitals History */}
            <div>
                <h3 className="text-lg font-semibold mb-2">Recent Vitals History</h3>
                <div className="rounded-md border h-96 overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Time</TableHead>
                                <TableHead>BP</TableHead>
                                <TableHead>HR</TableHead>
                                <TableHead>SpO2</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {patientVitals.length > 0 ? (
                                patientVitals.map((vital) => (
                                    <TableRow key={vital.vitalId}>
                                        <TableCell>{format(new Date(vital.recordedAt), 'p')}</TableCell>
                                        <TableCell>{vital.bloodPressure}</TableCell>
                                        <TableCell>{vital.heartRate}</TableCell>
                                        <TableCell>{vital.oxygenSaturation}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">No vitals recorded yet.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
