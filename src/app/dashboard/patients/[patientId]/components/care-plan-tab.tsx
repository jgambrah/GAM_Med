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
import { CarePlan, Patient } from '@/lib/types';
import { CarePlanSchema } from '@/lib/schemas';
import { Pencil, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { format, parseISO } from 'date-fns';
import { toast } from '@/hooks/use-toast';

function CreateOrUpdateCarePlanDialog({ carePlan, patient, onSave }: { carePlan?: CarePlan | null, patient: Patient, onSave: (plan: CarePlan) => void }) {
    const [open, setOpen] = React.useState(false);
    const { user } = useAuth();
    const isEditing = !!carePlan;
    
    const form = useForm<z.infer<typeof CarePlanSchema>>({
        resolver: zodResolver(CarePlanSchema),
        defaultValues: {
            hospitalId: user?.hospitalId || '',
            goals: carePlan?.goal || '',
            interventions: carePlan?.interventions.join('\n') || '',
            status: carePlan?.status || 'Active',
        }
    });
    
    React.useEffect(() => {
        if (open) {
            form.reset({
                hospitalId: user?.hospitalId || '',
                goals: carePlan?.goal || '',
                interventions: carePlan?.interventions.join('\n') || '',
                status: carePlan?.status || 'Active',
            })
        }
    }, [open, carePlan, form, user]);


    const onSubmit = async (values: z.infer<typeof CarePlanSchema>) => {
        if (!user) {
            toast.error("You must be logged in to save a care plan.");
            return;
        }

        const planData: CarePlan = {
            planId: carePlan?.planId || `plan-${Date.now()}`,
            hospitalId: values.hospitalId,
            patientId: patient.patient_id,
            title: carePlan?.title || `${values.status} Care Plan`,
            goal: values.goals,
            interventions: values.interventions.split('\n').filter(Boolean),
            status: values.status,
            createdBy: carePlan?.createdBy || user.uid,
            createdAt: carePlan?.createdAt || new Date().toISOString(),
            updatedBy: user.uid,
            updatedAt: new Date().toISOString()
        };

        onSave(planData);
        toast.success(`Care plan has been successfully ${isEditing ? 'updated' : 'created'}.`);
        setOpen(false);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {isEditing ? (
                     <Button variant="outline" size="sm">
                        <Pencil className="h-4 w-4 mr-2" />
                        Update Plan
                    </Button>
                ) : (
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Care Plan
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Update' : 'Create'} Care Plan</DialogTitle>
                    <DialogDescription>
                         {isEditing ? 'Modify the goals, interventions, or status of the care plan.' : 'Define the initial care plan for this patient.'}
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
                                        <Textarea placeholder="e.g., Maintain BP below 140/90, ensure medication adherence." rows={4} {...field} />
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
                                    <FormLabel>Interventions (one per line)</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="e.g., Daily BP monitoring." rows={4} {...field} />
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

export function CarePlanTab({ carePlan, onPlanSaved, patient }: { carePlan?: CarePlan | null, onPlanSaved: (plan: CarePlan) => void, patient: Patient }) {
    const { user } = useAuth();
    const canEdit = user?.role === 'nurse' || user?.role === 'doctor';

    if (!carePlan) {
        return (
            <Card>
                <CardContent className="h-48 flex flex-col items-center justify-center text-center">
                    <p className="text-muted-foreground mb-4">No active care plan found for this patient.</p>
                    {canEdit && <CreateOrUpdateCarePlanDialog patient={patient} onSave={onPlanSaved} />}
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
                {canEdit && <CreateOrUpdateCarePlanDialog carePlan={carePlan} patient={patient} onSave={onPlanSaved} />}
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <h4 className="font-semibold text-md">Goals</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{carePlan.goal}</p>
                </div>
                <div className="space-y-2">
                    <h4 className="font-semibold text-md">Interventions</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{carePlan.interventions.join('\n')}</p>
                </div>
                 <div className="space-y-2">
                    <h4 className="font-semibold text-md">Status</h4>
                    <p className="text-sm text-muted-foreground">{carePlan.status}</p>
                </div>
            </CardContent>
        </Card>
    );
}
