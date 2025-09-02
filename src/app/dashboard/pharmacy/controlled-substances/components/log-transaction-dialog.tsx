
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';
import { ControlledSubstance } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/combobox';
import { allPatients, allUsers } from '@/lib/data';
import { ControlledSubstanceTransactionSchema } from '@/lib/schemas';

interface LogTransactionDialogProps {
  substance: ControlledSubstance;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function LogTransactionDialog({ substance, isOpen, onOpenChange }: LogTransactionDialogProps) {
  const form = useForm<z.infer<typeof ControlledSubstanceTransactionSchema>>({
    resolver: zodResolver(ControlledSubstanceTransactionSchema),
    defaultValues: {
      transactionType: 'Dispense',
      quantity: 1,
      reason: '',
      patientId: '',
      witnessId: '',
    },
  });

  const transactionType = form.watch('transactionType');

  const onSubmit = (values: z.infer<typeof ControlledSubstanceTransactionSchema>) => {
    // In a real app, this would call the `logControlledSubstanceTransaction` Cloud Function.
    console.log('Logging transaction:', { substanceId: substance.substanceId, ...values });
    toast.success('Transaction Logged', {
        description: `The transaction for ${substance.name} has been securely logged.`
    });
    onOpenChange(false);
    form.reset();
  };
  
  const patientOptions = allPatients.map(p => ({ label: p.full_name, value: p.patient_id }));
  const witnessOptions = allUsers.filter(u => u.role === 'pharmacist' || u.role === 'doctor').map(u => ({ label: u.name, value: u.uid }));

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Transaction: {substance.name}</DialogTitle>
          <DialogDescription>
            Securely log a transaction for this controlled substance. Current stock: {substance.totalQuantity} {substance.unit}(s).
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
               <FormField
                    control={form.control}
                    name="transactionType"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Transaction Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Dispense">Dispense</SelectItem>
                                    <SelectItem value="Restock">Restock</SelectItem>
                                    <SelectItem value="Waste">Waste</SelectItem>
                                    <SelectItem value="Adjustment">Audit Adjustment</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Quantity</FormLabel>
                            <FormControl>
                                <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            {transactionType === 'Dispense' && (
                <FormField
                    control={form.control}
                    name="patientId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Patient</FormLabel>
                            <Combobox 
                                options={patientOptions}
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Select patient..."
                                searchPlaceholder="Search for patient..."
                                notFoundText="No patient found."
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}
            
            {transactionType === 'Waste' && (
                 <FormField
                    control={form.control}
                    name="witnessId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Witness</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger><SelectValue placeholder="Select a witness..."/></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {witnessOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}
            
            <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Reason for Transaction</FormLabel>
                        <FormControl>
                            <Textarea placeholder="e.g., Prescription #12345, Received from PO-001, Incorrect count correction" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Logging...' : 'Log Transaction'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
