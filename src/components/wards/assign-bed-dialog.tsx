'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserCheck, Loader2 } from 'lucide-react';

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
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, writeBatch } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';
import { Patient, User as UserType } from '@/lib/types';

const AssignBedSchema = z.object({
    hospitalId: z.string().min(1),
    patientId: z.string().min(1, "Please select a patient"),
    attendingDoctorId: z.string().min(1, "Please select a doctor"),
    reasonForAdmission: z.string().min(5, "Admission reason is required"),
});

interface AssignBedDialogProps {
    bedId: string;
    bedNumber: string;
    wardName: string;
}

/**
 * == Specialized Admission Tool: Assign Specific Bed ==
 * 
 * Focused admission tool for the Ward Map.
 * Performs an atomic triple-write to process the admission.
 */
export function AssignBedDialog({ bedId, bedNumber, wardName }: AssignBedDialogProps) {
  const { user } = useAuth();
  const firestore = useFirestore();
  const [open, setOpen] = React.useState(false);

  // 1. DATA SOURCES: Fetch unadmitted patients and doctors for this tenant
  const patientsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.hospitalId) return null;
    return query(
        collection(firestore, 'patients'), 
        where('hospitalId', '==', user.hospitalId), 
        where('is_admitted', '==', false)
    );
  }, [firestore, user?.hospitalId]);
  const { data: patients } = useCollection<Patient>(patientsQuery);

  const doctorsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.hospitalId) return null;
    return query(
        collection(firestore, 'users'), 
        where('hospitalId', '==', user.hospitalId), 
        where('role', '==', 'doctor')
    );
  }, [firestore, user?.hospitalId]);
  const { data: doctors } = useCollection<UserType>(doctorsQuery);

  const form = useForm<z.infer<typeof AssignBedSchema>>({
    resolver: zodResolver(AssignBedSchema),
    defaultValues: {
      hospitalId: user?.hospitalId || '',
      patientId: '',
      attendingDoctorId: '',
      reasonForAdmission: '',
    },
  });

  React.useEffect(() => {
    if (open && user) {
        form.setValue('hospitalId', user.hospitalId);
    }
  }, [open, user, form]);

  const onSubmit = async (values: z.infer<typeof AssignBedSchema>) => {
    if (!firestore || !user) return;

    try {
        const batch = writeBatch(firestore);
        const now = new Date().toISOString();
        
        const selectedPatient = patients?.find(p => p.id === values.patientId);
        const selectedDoctor = doctors?.find(d => d.uid === values.attendingDoctorId);

        // A) CREATE ADMISSION RECORD
        const admissionRef = doc(collection(firestore, 'admissions'));
        batch.set(admissionRef, {
            id: admissionRef.id,
            admission_id: `ADM-${Date.now()}`,
            hospitalId: user.hospitalId,
            patient_id: values.patientId,
            type: 'Inpatient',
            admission_date: now,
            reasonForVisit: values.reasonForAdmission,
            ward: wardName,
            bed_id: bedNumber,
            attending_doctor_id: values.attendingDoctorId,
            attending_doctor_name: selectedDoctor?.name || 'Medical Staff',
            status: 'Admitted',
            createdAt: now,
            updatedAt: now
        });

        // B) UPDATE PATIENT EHR
        const patientRef = doc(firestore, 'patients', values.patientId);
        batch.update(patientRef, {
            is_admitted: true,
            current_admission_id: admissionRef.id,
            updated_at: now
        });

        // C) UPDATE BED STATUS (Denormalized for Map performance)
        const bedRef = doc(firestore, 'beds', bedId);
        batch.update(bedRef, {
            status: 'Occupied',
            currentPatientId: values.patientId,
            currentPatientName: selectedPatient?.full_name || 'Inpatient',
            occupiedSince: now,
            updatedAt: now
        });

        await batch.commit();
        toast.success("Admission Finalized", { description: `${selectedPatient?.full_name} assigned to ${bedNumber}.` });
        setOpen(false);
        form.reset();
    } catch (error: any) {
        console.error("Admission failed:", error);
        toast.error("Process Failed", { description: "You don't have permission to record admissions." });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-[9px] h-7 font-black uppercase bg-white/50 hover:bg-white shadow-sm">
            Admit Patient
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2 text-primary">
            <UserCheck className="h-5 w-5" />
            <DialogTitle>Bed Assignment</DialogTitle>
          </div>
          <DialogDescription>
            Allocate <strong>{bedNumber}</strong> in <strong>{wardName}</strong>.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField
                control={form.control}
                name="patientId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="text-xs">Patient</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger className="bg-muted/30">
                            <SelectValue placeholder="Select unadmitted patient" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {patients?.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.full_name} (MRN: {p.mrn})</SelectItem>
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
                    <FormLabel className="text-xs">Attending Physician</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger className="bg-muted/30">
                            <SelectValue placeholder="Select doctor" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {doctors?.map(d => (
                            <SelectItem key={d.uid} value={d.uid}>{d.name}</SelectItem>
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
                        <FormLabel className="text-xs">Admission Notes</FormLabel>
                        <FormControl>
                            <Textarea 
                                placeholder="Indication for ward admission..."
                                className="bg-muted/30 h-24"
                                {...field}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Finalize Admission
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
