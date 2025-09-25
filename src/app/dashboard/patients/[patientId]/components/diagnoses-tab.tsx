
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
import { Diagnosis } from '@/lib/types';
import { NewDiagnosisSchema } from '@/lib/schemas';
import { useParams } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import { mockDiagnoses as allMockDiagnoses } from '@/lib/data';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { toast } from '@/hooks/use-toast';

function AddDiagnosisDialog({ onDiagnosisAdded }: { onDiagnosisAdded: (newDiagnosis: Diagnosis) => void }) {
    const params = useParams();
    const patientId = params.patientId as string;
    const { user } = useAuth();
    const [open, setOpen] = React.useState(false);

    const form = useForm<z.infer<typeof NewDiagnosisSchema>>({
        resolver: zodResolver(NewDiagnosisSchema),
        defaultValues: {
            icd10Code: '',
            diagnosisText: '',
            isPrimary: false,
        }
    });

    const onSubmit = async (values: z.infer<typeof NewDiagnosisSchema>) => {
        if (!user) {
            toast.error("You must be logged in.");
            return;
        }

        const newDiagnosis: Diagnosis = {
            diagnosisId: `diag-${Date.now()}`,
            icd10Code: values.icd10Code,
            diagnosisText: values.diagnosisText,
            isPrimary: values.isPrimary,
            diagnosedByDoctorId: user.uid,
            diagnosedAt: new Date().toISOString(),
        };

        onDiagnosisAdded(newDiagnosis);
        toast.success('Diagnosis added successfully.');
        setOpen(false);
        form.reset();
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                 <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Diagnosis
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Diagnosis</DialogTitle>
                    <DialogDescription>
                        Record a new medical diagnosis for this patient.
                    </DialogDescription>
                </DialogHeader>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="diagnosisText"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Diagnosis</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Essential hypertension" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="icd10Code"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>ICD-10 Code</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., I10" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="isPrimary"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                    <FormControl>
                                        <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>
                                        Set as primary diagnosis
                                        </FormLabel>
                                    </div>
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? 'Saving...' : 'Save Diagnosis'}
                            </Button>
                        </DialogFooter>
                    </form>
                 </Form>
            </DialogContent>
        </Dialog>
    )
}

export function DiagnosesTab() {
    const { user } = useAuth();
    const canAddDiagnosis = user?.role === 'doctor';
    const [diagnoses, setDiagnoses] = useLocalStorage<Diagnosis[]>('diagnoses', allMockDiagnoses);

    const handleDiagnosisAdded = (newDiagnosis: Diagnosis) => {
        setDiagnoses(prev => [newDiagnosis, ...prev]);
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Diagnoses</CardTitle>
                    <CardDescription>A record of all medical diagnoses for the patient.</CardDescription>
                </div>
                {canAddDiagnosis && <AddDiagnosisDialog onDiagnosisAdded={handleDiagnosisAdded} />}
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Diagnosis (ICD-10)</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Diagnosing Doctor</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {diagnoses.length > 0 ? (
                                diagnoses.map((diagnosis) => (
                                    <TableRow key={diagnosis.diagnosisId}>
                                        <TableCell>{format(new Date(diagnosis.diagnosedAt), 'PPP')}</TableCell>
                                        <TableCell>
                                            <div className="font-medium">{diagnosis.diagnosisText}</div>
                                            <div className="text-sm text-muted-foreground">{diagnosis.icd10Code}</div>
                                        </TableCell>
                                        <TableCell>
                                            {diagnosis.isPrimary && <Badge>Primary</Badge>}
                                        </TableCell>
                                        <TableCell>Dr. Evelyn Mensah</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No diagnoses recorded.
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
