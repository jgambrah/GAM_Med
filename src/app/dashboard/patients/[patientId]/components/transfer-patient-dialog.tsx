
'use client';

import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRightLeft } from 'lucide-react';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { allBeds } from '@/lib/data';
import { transferPatient } from '@/lib/actions';
import { Patient } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

interface TransferPatientDialogProps {
  patient: Patient;
  currentBedId?: string;
  disabled?: boolean;
}

const TransferSchema = z.object({
  newBedId: z.string().min(1, { message: 'A new bed must be selected.' }),
});

export function TransferPatientDialog({ patient, currentBedId, disabled }: TransferPatientDialogProps) {
  const [open, setOpen] = React.useState(false);

  const form = useForm<z.infer<typeof TransferSchema>>({
    resolver: zodResolver(TransferSchema),
    defaultValues: { newBedId: '' },
  });

  const vacantBeds = allBeds.filter((b) => b.status === 'vacant');

  const onSubmit = async (values: z.infer<typeof TransferSchema>) => {
    if (!currentBedId) {
      toast.error('Error: No current bed found for this patient.');
      return;
    }
    
    const result = await transferPatient(patient.patient_id, currentBedId, values.newBedId);

    if (result.success) {
      toast.success('Patient Transferred', {
        description: `${patient.full_name} has been successfully transferred to bed ${values.newBedId}.`
      });
      setOpen(false);
      form.reset();
    } else {
      toast.error('Transfer Failed', {
        description: result.message || 'Failed to transfer patient.'
      });
    }
  };

  if (!currentBedId) {
      return (
        <Button variant="outline" size="sm" disabled>
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Transfer
        </Button>
      )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Transfer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer Patient</DialogTitle>
          <DialogDescription>
            Move {patient.full_name} to a new vacant bed.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
                <Label>Current Bed</Label>
                <Input value={currentBedId} readOnly disabled />
            </div>

            <FormField
              control={form.control}
              name="newBedId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Vacant Bed</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a new bed" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vacantBeds.map((b) => (
                        <SelectItem key={b.bed_id} value={b.bed_id}>
                          {b.bed_id} ({b.wardName})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Transferring...' : 'Confirm Transfer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
