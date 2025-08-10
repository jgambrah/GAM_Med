
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
import { LabResult } from '@/lib/types';
import { NewLabOrderSchema } from '@/lib/schemas';
import { orderLabTest } from '@/lib/actions';
import { useParams } from 'next/navigation';
import { Textarea } from '@/components/ui/textarea';
import { mockLabResults as allMockLabResults } from '@/lib/data';


const getStatusVariant = (status: LabResult['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'Completed': return 'secondary';
        case 'Ordered': return 'default';
        case 'In Progress': return 'outline';
        default: return 'outline';
    }
}

function OrderTestDialog() {
    const params = useParams();
    const patientId = params.patientId as string;
    const [open, setOpen] = React.useState(false);

    const form = useForm<z.infer<typeof NewLabOrderSchema>>({
        resolver: zodResolver(NewLabOrderSchema),
        defaultValues: {
            testName: '',
            notes: '',
        }
    });

    const onSubmit = async (values: z.infer<typeof NewLabOrderSchema>) => {
        const result = await orderLabTest(patientId, values);
        if(result.success) {
            alert('Lab test ordered successfully (simulated).');
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
                    Order New Test
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Order New Lab Test</DialogTitle>
                    <DialogDescription>
                        Submit a new request to the laboratory.
                    </DialogDescription>
                </DialogHeader>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="testName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Test Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Full Blood Count" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notes for Lab (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="e.g., STAT, fasting required" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? 'Submitting...' : 'Submit Order'}
                            </Button>
                        </DialogFooter>
                    </form>
                 </Form>
            </DialogContent>
        </Dialog>
    )
}


export function LabResultsTab() {
    const { user } = useAuth();
    const params = useParams();
    const patientId = params.patientId as string;
    const canOrderTest = user?.role === 'doctor';

    // In a real application, this data would come from a real-time listener
    // on the /patients/{patientId}/lab_results sub-collection.
    const mockLabResults = allMockLabResults.filter(lr => lr.patientId === patientId);
    
    return (
         <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Lab Results</CardTitle>
                    <CardDescription>A record of all laboratory tests and their results.</CardDescription>
                </div>
                {canOrderTest && <OrderTestDialog />}
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Test Name</TableHead>
                                <TableHead>Ordered</TableHead>
                                <TableHead>Completed</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mockLabResults.length > 0 ? (
                                mockLabResults.map((result) => (
                                    <TableRow key={result.testId}>
                                        <TableCell className="font-medium">{result.testName}</TableCell>
                                        <TableCell>{format(new Date(result.orderedAt), 'PPP p')}</TableCell>
                                        <TableCell>{result.completedAt ? format(new Date(result.completedAt), 'PPP p') : 'N/A'}</TableCell>
                                        <TableCell><Badge variant={getStatusVariant(result.status)}>{result.status}</Badge></TableCell>
                                        <TableCell>
                                            <Button variant="outline" size="sm" disabled={result.status !== 'Completed'}>
                                                View Result
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                 <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No lab results found.
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
