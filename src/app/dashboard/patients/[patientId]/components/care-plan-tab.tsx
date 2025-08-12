
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CarePlan } from '@/lib/types';
import { CarePlanSchema } from '@/lib/schemas';
import { updateCarePlan } from '@/lib/actions';
import { Pencil } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { format, parseISO } from 'date-fns';

function UpdateCarePlanDialog({ carePlan }: { carePlan: CarePlan }) {
    const [open, setOpen] = React.useState(false);
    
    const form = useForm<z.infer<typeof CarePlanSchema>>({
        resolver: zodResolver(CarePlanSchema),
        defaultValues: {
            goals: carePlan.goals,
            interventions: carePlan.interventions,
            status: carePlan.status,
        }
    });

    const onSubmit = async (values: z.infer<typeof CarePlanSchema>) => {
        const result = await updateCarePlan(carePlan.patientId, carePlan.planId, values);
        if (result.success) {
            alert('Care plan updated successfully (simulated).');
            setOpen(false);
        } else {
            alert(`Error: ${result.message}`);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Pencil className="h-4 w-4 mr-2" />
                    Update Plan
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Update Care Plan</DialogTitle>
                    <DialogDescription>
                        Modify the goals, interventions, or status of the care plan.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                        <FormField
                            control={form.control}
                            name="goals"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Goals</FormLabel>
                                    <FormControl>
                                        <Textarea rows={4} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="interventions"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Interventions</FormLabel>
                                    <FormControl>
                                        <Textarea rows={4} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Status</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a status" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Active">Active</SelectItem>
                                            <SelectItem value="On Hold">On Hold</SelectItem>
                                            <SelectItem value="Completed">Completed</SelectItem>
                                            <SelectItem value="Cancelled">Cancelled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

export function CarePlanTab({ carePlan }: { carePlan?: CarePlan | null }) {
    const { user } = useAuth();
    const canEdit = user?.role === 'nurse' || user?.role === 'doctor';

    if (!carePlan) {
        return (
            <Card>
                <CardContent className="h-48 flex items-center justify-center">
                    <p className="text-muted-foreground">No active care plan found for this patient.</p>
                </CardContent>
            </Card>
        );
    }
    
    return (
        <Card>
            <CardHeader className="flex flex-row justify-between items-start">
                <div>
                    <CardTitle>{carePlan.title}</CardTitle>
                    <CardDescription>
                        Last updated on {format(parseISO(carePlan.updatedAt), 'PPP p')}
                    </CardDescription>
                </div>
                {canEdit && <UpdateCarePlanDialog carePlan={carePlan} />}
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <h4 className="font-semibold text-md">Goals</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{carePlan.goals}</p>
                </div>
                <div className="space-y-2">
                    <h4 className="font-semibold text-md">Interventions</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{carePlan.interventions}</p>
                </div>
                 <div className="space-y-2">
                    <h4 className="font-semibold text-md">Status</h4>
                    <p className="text-sm text-muted-foreground">{carePlan.status}</p>
                </div>
            </CardContent>
        </Card>
    );
}
