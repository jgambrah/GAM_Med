
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { NewVitalsSchema } from '@/lib/schemas';
import { addVitals } from '@/lib/actions';
import { Patient } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';

interface RecordVitalsPaneProps {
    patient: Patient;
}

// Add painLevel and notes to the schema for the nursing form
const NursingVitalsSchema = NewVitalsSchema.extend({
    painLevel: z.number().min(0).max(10).optional(),
    notes: z.string().optional(),
})

export function RecordVitalsPane({ patient }: RecordVitalsPaneProps) {

    const form = useForm<z.infer<typeof NursingVitalsSchema>>({
        resolver: zodResolver(NursingVitalsSchema),
        defaultValues: {
            temperature: 36.5,
            bloodPressure: '',
            heartRate: 70,
            respiratoryRate: 16,
            oxygenSaturation: 98,
            painLevel: 0,
            notes: '',
        }
    });

    const onSubmit = async (values: z.infer<typeof NursingVitalsSchema>) => {
        /**
         * == WORKFLOW: LOG VITALS ==
         * This function calls the `logVitals` server action which would, in a real app,
         * invoke the corresponding secure Cloud Function.
         */
        const result = await addVitals(patient.patient_id, values);
        if(result.success) {
            alert('Vitals recorded successfully (simulated).');
            form.reset();
        } else {
            alert(`Error: ${result.message}`);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Record Vitals for {patient.full_name}</CardTitle>
                <CardDescription>Enter the patient's latest vital signs.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
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
                             <FormField
                                control={form.control}
                                name="painLevel"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Pain Level (0-10)</FormLabel>
                                        <FormControl>
                                            <Input type="number" min="0" max="10" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10))}/>
                                        </FormControl>
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
                                    <FormControl>
                                        <Textarea placeholder="Any relevant observations..." {...field} />
                                    </FormControl>
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
    );
}
