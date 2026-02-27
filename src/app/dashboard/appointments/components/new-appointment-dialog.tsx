'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';

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
  FormDescription,
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
import { Input } from '@/components/ui/input';
import { NewAppointmentSchema } from '@/lib/schemas';
import { Plus, Loader2, Calendar } from 'lucide-react';
import { Combobox } from '@/components/ui/combobox';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';
import { Appointment, Patient, User as UserType } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, serverTimestamp } from 'firebase/firestore';

const mockAvailableSlots = [
  '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', 
  '11:00 AM', '11:30 AM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', 
  '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'
];

interface NewAppointmentDialogProps {
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  appointmentToReschedule?: Appointment | null;
  patientId?: string;
  doctorId?: string;
  onAppointmentBooked?: (newAppointment: Appointment) => void;
}

/**
 * == SaaS Appointment Scheduler ==
 * 
 * Securely hooks into the facility's live Patient and Staff registries.
 * Enforces logical isolation via hospitalId filtering.
 */
export function NewAppointmentDialog({ 
  isOpen, 
  onOpenChange, 
  appointmentToReschedule,
  patientId,
  doctorId,
  onAppointmentBooked,
}: NewAppointmentDialogProps) {
  const [internalOpen, setOpen] = React.useState(false);
  const { user } = useAuth();
  const firestore = useFirestore();
  
  // 1. DATA SOURCES: Fetch patients and doctors for THIS hospital from Firestore
  const patientsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.hospitalId) return null;
    return query(collection(firestore, 'patients'), where('hospitalId', '==', user.hospitalId));
  }, [firestore, user?.hospitalId]);
  const { data: patients, isLoading: isPatientsLoading } = useCollection<Patient>(patientsQuery);

  const doctorsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.hospitalId) return null;
    return query(
        collection(firestore, 'users'), 
        where('hospitalId', '==', user.hospitalId), 
        where('role', '==', 'doctor')
    );
  }, [firestore, user?.hospitalId]);
  const { data: doctors, isLoading: isDoctorsLoading } = useCollection<UserType>(doctorsQuery);

  const isEditing = !!appointmentToReschedule;
  const dialogOpen = isOpen !== undefined ? isOpen : internalOpen;
  const setDialogOpen = onOpenChange !== undefined ? onOpenChange : setOpen;
  
  const form = useForm<z.infer<typeof NewAppointmentSchema>>({
    resolver: zodResolver(NewAppointmentSchema),
    defaultValues: {
      hospitalId: user?.hospitalId || '',
      patientId: patientId || '',
      department: 'General',
      appointmentDate: '',
      appointmentTime: '',
      doctorId: doctorId || '',
      reason: '',
    },
  });

  React.useEffect(() => {
    if (dialogOpen && user) {
        form.setValue('hospitalId', user.hospitalId);
        if (patientId) form.setValue('patientId', patientId);
        if (doctorId) form.setValue('doctorId', doctorId);
    }
  }, [dialogOpen, user, patientId, doctorId, form]);

  const onSubmit = async (values: z.infer<typeof NewAppointmentSchema>) => {
    if (!firestore || !user) return;

    try {
        const selectedPatient = patients?.find(p => p.id === values.patientId || p.patient_id === values.patientId);
        const selectedDoctor = doctors?.find(d => d.uid === values.doctorId);

        const appointmentData = {
            hospitalId: user.hospitalId,
            patientId: values.patientId,
            patientName: selectedPatient?.full_name || 'Patient',
            doctorId: values.doctorId || 'staff',
            doctorName: selectedDoctor?.name || 'Staff Physician',
            appointmentDate: values.appointmentDate,
            timeSlot: values.appointmentTime,
            department: values.department || 'General',
            status: 'Scheduled',
            reason: values.reason || 'General Consultation',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        // SaaS Wall Enforced write
        addDocumentNonBlocking(collection(firestore, 'appointments'), appointmentData);

        toast.success(isEditing ? 'Appointment Rescheduled' : 'Appointment Confirmed', {
            description: `${selectedPatient?.full_name || 'Patient'} is booked for ${values.appointmentDate} at ${values.appointmentTime}.`
        });

        if (onAppointmentBooked) onAppointmentBooked(appointmentData as any);
        setDialogOpen(false);
        form.reset();
    } catch (error) {
        console.error("Booking Error:", error);
        toast.error("Process Failed", { description: "An error occurred while saving the appointment." });
    }
  };

  const patientOptions = patients?.map(p => ({
      value: p.id,
      label: `${p.full_name} (MRN: ${p.mrn})`
  })) || [];

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        {!isOpen && (
            <Button className="shadow-md">
                <Plus className="h-4 w-4 mr-2" />
                Schedule Appointment
            </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2 text-primary">
            <Calendar className="h-5 w-5" />
            <DialogTitle>{isEditing ? 'Reschedule' : 'New Appointment'}</DialogTitle>
          </div>
          <DialogDescription>
            Assign a practitioner and time slot for <strong>{user?.hospitalId}</strong>.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="patientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase">Search Patient Registry</FormLabel>
                  <Combobox
                    options={patientOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder={isPatientsLoading ? "Loading database..." : "Search MRN or Name..."}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="doctorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase">Practitioner</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-muted/30 h-11">
                        <SelectValue placeholder={isDoctorsLoading ? "Syncing..." : "Select doctor"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {doctors?.map((d) => (
                        <SelectItem key={d.uid} value={d.uid}>{d.name} ({d.specialty || 'General'})</SelectItem>
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
                    name="appointmentDate"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-bold uppercase">Visit Date</FormLabel>
                            <FormControl><Input type="date" {...field} className="bg-muted/30 h-11" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="appointmentTime"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-bold uppercase">Time Slot</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger className="bg-muted/30 h-11 font-mono">
                                        <SelectValue placeholder="Time" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {mockAvailableSlots.map(slot => (
                                        <SelectItem key={slot} value={slot}>{slot}</SelectItem>
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
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase">Clinical Indication</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Routine Checkup, Lab Review" {...field} className="bg-muted/30 h-11" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting} className="bg-blue-600 hover:bg-blue-700 min-w-[140px] font-bold shadow-lg">
                {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {isEditing ? 'Reschedule' : 'Confirm Visit'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
