'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, UserCheck, Loader2 } from 'lucide-react';

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
import { collection, query, where, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';
import { Bed, Patient, User as UserType } from '@/lib/types';
import { Input } from '@/components/ui/input';

const BedAllocationSchema = z.object({
    hospitalId: z.string().min(1),
    patientId: z.string().min(1, "Please select a patient"),
    bedId: z.string().min(1, "Please select an available bed"),
    attendingDoctorId: z.string().min(1, "Please select a doctor"),
    reasonForAdmission: z.string().min(5, "Admission reason is required"),
});

/**
 * == Clinical Operations: Atomic Inpatient Admission ==
 * 
 * This tool performs a high-fidelity admission. It atomically:
 * 1. Creates an 'admission' document.
 * 2. Updates 'patient' record to 'is_admitted'.
 * 3. Updates 'bed' record to 'Occupied' with denormalized patient data.
 */
export function AllocateBedDialog({ patientId, disabled }: { patientId?: string, disabled?: boolean }) {
  const { user } = useAuth();
  const firestore = useFirestore();
  const [open, setOpen] = React.useState(false);

  // 1. DATA SOURCES: Fetch unadmitted patients, vacant beds, and doctors
  const patientsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.hospitalId) return null;
    return query(collection(firestore, 'patients'), where('hospitalId', '==', user.hospitalId), where('is_admitted', '==', false));
  }, [firestore, user?.hospitalId]);
  const { data: patients } = useCollection<Patient>(patientsQuery);

  const bedsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.hospitalId) return null;
    return query(collection(firestore, 'beds'), where('hospitalId', '==', user.hospitalId), where('status', '==', 'Available'));
  }, [firestore, user?.hospitalId]);
  const { data: availableBeds } = useCollection<Bed>(bedsQuery);

  const doctorsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.hospitalId) return null;
    return query(collection(firestore, 'users'), where('hospitalId', '==', user.hospitalId), where('role', '==', 'doctor'));
  }, [firestore, user?.hospitalId]);
  const { data: doctors } = useCollection<UserType>(doctorsQuery);

  const form = useForm<z.infer<typeof BedAllocationSchema>>({
    resolver: zodResolver(BedAllocationSchema),
    defaultValues: {
      hospitalId: user?.hospitalId || '',
      patientId: patientId || '',
      bedId: '',
      attendingDoctorId: '',
      reasonForAdmission: '',
    },
  });

  React.useEffect(() => {
    if (open && user) {
        form.setValue('hospitalId', user.hospitalId);
        if (patientId) form.setValue('patientId', patientId);
    }
  }, [open, user, patientId, form]);

  const onSubmit = async (values: z.infer<typeof BedAllocationSchema>) => {
    if (!firestore || !user) return;

    try {
        const batch = writeBatch(firestore);
        const now = new Date().toISOString();
        
        const selectedPatient = patients?.find(p => p.id === values.patientId);
        const selectedBed = availableBeds?.find(b => b.id === values.bedId);
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
            ward: selectedBed?.wardName || 'Unknown',
            bed_id: selectedBed?.bedNumber || 'N/A',
            attending_doctor_id: values.attendingDoctorId,
            attending_doctor_name: selectedDoctor?.name || 'Staff',
            status: 'Admitted',
            createdAt: now,
            updatedAt: now
        });

        // B) UPDATE PATIENT STATUS
        const patientRef = doc(firestore, 'patients', values.patientId);
        batch.update(patientRef, {
            is_admitted: true,
            current_admission_id: admissionRef.id,
            updated_at: now
        });

        // C) UPDATE BED STATUS (Denormalized Patient Name)
        const bedRef = doc(firestore, 'beds', values.bedId);
        batch.update(bedRef, {
            status: 'Occupied',
            currentPatientId: values.patientId,
            currentPatientName: selectedPatient?.full_name || 'Inpatient',
            occupiedSince: now,
            updatedAt: now
        });

        await batch.commit();
        
        toast.success("Inpatient Admitted", {
            description: `${selectedPatient?.full_name} has been assigned to ${selectedBed?.bedNumber}.`
        });
        
        setOpen(false);
        form.reset();
    } catch (error: any) {
        console.error("Admission failed:", error);
        toast.error("Admission Failed", { description: "Insufficient permissions to register inpatient data." });
    }
  };

  const triggerText = patientId ? "Admit to Ward" : "Allocate Bed";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={patientId ? 'outline' : 'default'} size={patientId ? 'sm' : 'default'} disabled={disabled} className="gap-2">
            <UserCheck className="h-4 w-4" />
            {triggerText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2 text-primary">
            <UserCheck className="h-5 w-5" />
            <DialogTitle>Triage & Admission</DialogTitle>
          </div>
          <DialogDescription>
            Assign a patient to an available unit. This will atomically update the census.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
                control={form.control}
                name="patientId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Patient</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!patientId}>
                        <FormControl>
                        <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Select unadmitted patient" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {patients?.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.full_name} ({p.mrn})</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="bedId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Available Bed</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger className="bg-background text-xs">
                            <SelectValue placeholder="Unit selection" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {availableBeds?.map(b => (
                            <SelectItem key={b.id} value={b.id}>
                            {b.bedNumber} ({b.wardName})
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
                    <FormLabel>Attending Physician</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger className="bg-background text-xs">
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
            </div>
            <FormField
                control={form.control}
                name="reasonForAdmission"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Clinical Indication</FormLabel>
                        <FormControl>
                            <Textarea 
                                placeholder="Reason for ward placement..."
                                className="bg-muted/30"
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
