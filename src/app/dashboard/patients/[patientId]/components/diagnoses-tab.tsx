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
import { Plus, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';
import { Diagnosis } from '@/lib/types';
import { NewDiagnosisSchema } from '@/lib/schemas';
import { useParams } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';

function AddDiagnosisDialog({ patientId, onDiagnosisAdded }: { patientId: string, onDiagnosisAdded: () => void }) {
    const { user } = useAuth();
    const firestore = useFirestore();
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
        if (!user || !firestore) return;

        const newDiagnosisData = {
            ...values,
            hospitalId: user.hospitalId,
            patientId: patientId,
            diagnosedByDoctorId: user.uid,
            diagnosedAt: new Date().toISOString(),
        };

        addDocumentNonBlocking(collection(firestore, 'diagnoses'), newDiagnosisData);
        toast.success('Diagnosis added.');
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
                    <DialogTitle>Record Diagnosis</DialogTitle>
                    <DialogDescription>Add a medical diagnosis to this patient's chart.</DialogDescription>
                </DialogHeader>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="diagnosisText"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Diagnosis</FormLabel>
                                    <FormControl><Input placeholder="e.g., Essential hypertension" {...field} /></FormControl>
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
                                    <FormControl><Input placeholder="e.g., I10" {...field} /></FormControl>
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
                                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                    <div className="space-y-1 leading-none"><FormLabel>Primary Diagnosis</FormLabel></div>
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>Save</Button>
                        </DialogFooter>
                    </form>
                 </Form>
            </DialogContent>
        </Dialog>
    )
}

export function DiagnosesTab() {
    const params = useParams();
    const patientId = params.patientId as string;
    const { user } = useAuth();
    const firestore = useFirestore();

    // LIVE QUERY: Real-time diagnoses list
    const diagQuery = useMemoFirebase(() => {
        if (!firestore || !patientId || !user?.hospitalId) return null;
        return query(
            collection(firestore, 'diagnoses'),
            where('hospitalId', '==', user.hospitalId),
            where('patientId', '==', patientId),
            orderBy('diagnosedAt', 'desc')
        );
    }, [firestore, patientId, user?.hospitalId]);

    const { data: diagnoses, isLoading } = useCollection<Diagnosis>(diagQuery);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Diagnoses</CardTitle>
                    <CardDescription>longitudinal list of patient medical diagnoses.</CardDescription>
                </div>
                <AddDiagnosisDialog patientId={patientId} onDiagnosisAdded={() => {}} />
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Diagnosis (ICD-10)</TableHead>
                                <TableHead>Type</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={3} className="text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></TableCell></TableRow>
                            ) : diagnoses && diagnoses.length > 0 ? (
                                diagnoses.map((diagnosis) => (
                                    <TableRow key={diagnosis.id}>
                                        <TableCell className="text-xs">{format(new Date(diagnosis.diagnosedAt), 'PPP')}</TableCell>
                                        <TableCell>
                                            <div className="font-medium text-sm">{diagnosis.diagnosisText}</div>
                                            <div className="text-xs text-muted-foreground">{diagnosis.icd10Code}</div>
                                        </TableCell>
                                        <TableCell>
                                            {diagnosis.isPrimary && <Badge variant="secondary" className="text-[10px]">Primary</Badge>}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={3} className="h-24 text-center text-muted-foreground">None.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
