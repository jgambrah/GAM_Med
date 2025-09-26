
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';

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
import { Textarea } from '@/components/ui/textarea';
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
import { BedAllocationSchema } from '@/lib/schemas';
import { allPatients as initialPatients, allBeds as initialBeds, allUsers, allAdmissions as initialAdmissions } from '@/lib/data';
import { allocateBed } from '@/lib/actions';
import { Input } from '@/components/ui/input';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Admission, Bed, Patient } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

interface AllocateBedDialogProps {
    patientId?: string;
    disabled?: boolean;
}

/**
 * == Conceptual Code: Inpatient Admission UI ==
 *
 * This component serves as the front-end form for admitting a patient.
 * It collects all necessary information and passes it to the backend for processing.
 */
export function AllocateBedDialog({ patientId, disabled }: AllocateBedDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [allPatients, setAllPatients] = useLocalStorage<Patient[]>('patients', initialPatients);
  const [beds, setBeds] = useLocalStorage<Bed[]>('beds', initialBeds);
  const [admissions, setAdmissions] = useLocalStorage<Admission[]>('admissions', initialAdmissions);


  const form = useForm<z.infer<typeof BedAllocationSchema>>({
    resolver: zodResolver(BedAllocationSchema),
    defaultValues: {
      patientId: patientId || '',
      bedId: '',
      attendingDoctorId: '',
      reasonForAdmission: '',
    },
  });

  React.useEffect(() => {
    if (patientId) {
        form.setValue('patientId', patientId);
    }
  }, [patientId, form]);

  const selectedPatient = allPatients.find(p => p.patient_id === form.watch('patientId'));
  const unadmittedPatients = allPatients.filter(p => !p.is_admitted);
  const vacantBeds = beds.filter(b => b.status === 'vacant');
  const doctors = allUsers.filter(u => u.role === 'doctor');

  const onSubmit = async (values: z.infer<typeof BedAllocationSchema>) => {
    const result = await allocateBed(values);
    if (result.success) {
      toast.success('Patient has been admitted successfully.');

      const newAdmissionId = `A-${Date.now()}`;
      const now = new Date().toISOString();
      
      // Update patient status
      setAllPatients(prev => prev.map(p => 
        p.patient_id === values.patientId 
          ? { ...p, is_admitted: true, current_admission_id: newAdmissionId } 
          : p
      ));

      // Update bed status
      setBeds(prev => prev.map(b => 
        b.bed_id === values.bedId 
          ? { ...b, status: 'occupied', current_patient_id: values.patientId, occupied_since: now, cleaningNeeded: false }
          : b
      ));
      
      // Create new admission record
      const newAdmission: Admission = {
        admission_id: newAdmissionId,
        patient_id: values.patientId,
        admission_date: now,
        status: 'Admitted',
        bed_id: values.bedId,
        attending_doctor_id: values.attendingDoctorId,
        ward: beds.find(b => b.bed_id === values.bedId)?.wardName || 'Unknown',
        attending_doctor_name: doctors.find(d => d.uid === values.attendingDoctorId)?.name || 'Unknown',
        reasonForVisit: values.reasonForAdmission,
        type: 'Inpatient',
        created_at: now,
        updated_at: now,
      };
      setAdmissions(prev => [newAdmission, ...prev]);

      setOpen(false);
      form.reset();
    } else {
      toast.error(`Error: ${result.message || 'Failed to allocate bed.'}`);
    }
  };

  const triggerText = patientId ? "Admit Patient" : "Allocate Bed";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={patientId ? 'outline' : 'default'} size={patientId ? 'sm' : 'default'} disabled={disabled}>
            <Plus className="h-4 w-4 mr-2" />
            {triggerText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Allocate Bed to Patient</DialogTitle>
          <DialogDescription>
            Assign a patient to an available bed to admit them.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {patientId && selectedPatient ? (
                 <div>
                    <FormLabel>Patient</FormLabel>
                    <Input value={`${selectedPatient.full_name} (${selectedPatient.patient_id})`} readOnly disabled />
                </div>
            ) : (
                <FormField
                control={form.control}
                name="patientId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Patient</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select an unadmitted patient" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {unadmittedPatients.map(p => (
                            <SelectItem key={p.patient_id} value={p.patient_id}>
                            {p.full_name} ({p.patient_id})
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            )}
            <FormField
              control={form.control}
              name="bedId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vacant Bed</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a vacant bed" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vacantBeds.map(b => (
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
             <FormField
              control={form.control}
              name="attendingDoctorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Attending Doctor</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a doctor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {doctors.map(d => (
                        <SelectItem key={d.uid} value={d.uid}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="reasonForAdmission"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Reason for Admission</FormLabel>
                        <FormControl>
                            <Textarea 
                                placeholder="Enter reason for admission..."
                                {...field}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Allocating...' : 'Allocate and Admit'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
