'use client';

import * as React from 'react';
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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Camera, Loader2 } from 'lucide-react';
import { NewRadOrderSchema } from '@/lib/schemas';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { Patient } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface OrderStudyDialogProps {
  patient: Patient;
  disabled?: boolean;
  onOrderCreated?: (newOrder: any) => void;
}

/**
 * == EHR Integration: Order Imaging Study ==
 * 
 * Tool for doctors to request X-rays, MRIs, or CT Scans.
 * Atomically pushes a request to the Radiology module's live queue with SaaS tags.
 */
export function OrderStudyDialog({ patient, disabled, onOrderCreated }: OrderStudyDialogProps) {
  const { user } = useAuth();
  const firestore = useFirestore();
  const [open, setOpen] = React.useState(false);
  
  const form = useForm<z.infer<typeof NewRadOrderSchema>>({
    resolver: zodResolver(NewRadOrderSchema),
    defaultValues: {
      hospitalId: user?.hospitalId || '',
      modality: 'X-Ray',
      indication: '',
      priority: 'Routine',
      notes: '',
    },
  });

  React.useEffect(() => {
    if (open && user) {
        form.setValue('hospitalId', user.hospitalId);
    }
  }, [open, user, form]);

  const onSubmit = async (values: z.infer<typeof NewRadOrderSchema>) => {
    if (!user || !firestore) return;

    // DATA PREPARATION: Create order for the Radiology Worklist
    const radiologyOrder = {
        patientId: patient.patient_id,
        patientName: patient.full_name,
        patientMrn: patient.mrn,
        hospitalId: user.hospitalId, // Mandatory SaaS Stamp
        test_name: values.modality, // Map modality to test_name for display
        modality: values.modality,
        indication: values.indication,
        priority: values.priority,
        doctorName: user.name,
        doctorId: user.uid,
        status: "Pending",
        dateOrdered: new Date().toISOString(),
        createdAt: serverTimestamp(),
        notes: values.notes || '',
    };

    addDocumentNonBlocking(collection(firestore, 'radiology_orders'), radiologyOrder);
    
    toast.success(`${values.modality} order sent to imaging department.`);
    
    if (onOrderCreated) onOrderCreated(radiologyOrder);
    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="gap-2">
          <Camera className="h-4 w-4" /> 
          Order Imaging
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Radiology Request</DialogTitle>
          <DialogDescription>
            Submit a new imaging request for {patient.full_name}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="modality"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Imaging Modality</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="X-Ray">X-Ray</SelectItem>
                                    <SelectItem value="MRI">MRI Scan</SelectItem>
                                    <SelectItem value="CT">CT Scan</SelectItem>
                                    <SelectItem value="Ultrasound">Ultrasound</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Priority</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Routine">Routine</SelectItem>
                                    <SelectItem value="Urgent">Urgent</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            
            <FormField
              control={form.control}
              name="indication"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Clinical Indication</FormLabel>
                  <FormControl>
                    <Textarea 
                        placeholder="Reason for imaging (e.g., Rule out fracture, follow-up on mass)..." 
                        {...field} 
                        className="bg-muted/30"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Submit Order
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}