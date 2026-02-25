'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Calendar } from '@/components/ui/calendar';
import { Loader2 } from 'lucide-react';
import { Combobox } from '@/components/ui/combobox';
import { Patient, User as UserType } from '@/lib/types';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

const BookingSchema = z.object({
  patientId: z.string().min(1, "Please select a patient"),
  doctorId: z.string().min(1, "Please select a doctor"),
  appointmentDate: z.date({
    required_error: "A date of appointment is required.",
  }),
  timeSlot: z.string().min(1, "Please select a time slot"),
  reason: z.string().min(3, "Reason is required"),
});

const timeSlots = [
  "08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM",
  "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM"
];

/**
 * == Reception Module: New Appointment Booking ==
 * 
 * Centralised interface for receptionists to schedule patient visits.
 * Enforces the SaaS Wall by performing multi-parameter conflict checks.
 */
export default function NewAppointmentPage() {
  const { user } = useAuth();
  const firestore = useFirestore();
  const router = useRouter();

  // 1. DATA SOURCES: Fetch unadmitted patients and doctors for this hospital
  const patientsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.hospitalId) return null;
    return query(collection(firestore, 'patients'), where('hospitalId', '==', user.hospitalId));
  }, [firestore, user?.hospitalId]);
  const { data: patients } = useCollection<Patient>(patientsQuery);

  const doctorsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.hospitalId) return null;
    return query(collection(firestore, 'users'), where('hospitalId', '==', user.hospitalId), where('role', '==', 'doctor'));
  }, [firestore, user?.hospitalId]);
  const { data: doctors } = useCollection<UserType>(doctorsQuery);

  const form = useForm<z.infer<typeof BookingSchema>>({
    resolver: zodResolver(BookingSchema),
    defaultValues: {
      patientId: '',
      doctorId: '',
      timeSlot: '',
      reason: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof BookingSchema>) => {
    if (!firestore || !user) return;

    const dateStr = format(values.appointmentDate, 'yyyy-MM-dd');

    try {
      // 2. CONFLICT CHECK: Search for double-booking within the same hospital tenant
      const q = query(
        collection(firestore, "appointments"),
        where("hospitalId", "==", user.hospitalId),
        where("doctorId", "==", values.doctorId),
        where("appointmentDate", "==", dateStr),
        where("timeSlot", "==", values.timeSlot),
        where("status", "!=", "Cancelled")
      );

      const conflictSnap = await getDocs(q);
      if (!conflictSnap.empty) {
        toast.error("Conflict Detected", {
          description: "This doctor already has an appointment confirmed at this time."
        });
        return;
      }

      // 3. ATOMIC WRITE: Create the appointment stamped with hospitalId
      const selectedPatient = patients?.find(p => p.id === values.patientId);
      const selectedDoctor = doctors?.find(d => d.uid === values.doctorId);

      await addDoc(collection(firestore, "appointments"), {
        hospitalId: user.hospitalId,
        patientId: values.patientId,
        patientName: selectedPatient?.full_name || "Unknown Patient",
        doctorId: values.doctorId,
        doctorName: selectedDoctor?.name || "Medical Staff",
        appointmentDate: dateStr,
        timeSlot: values.timeSlot,
        status: 'Scheduled',
        reason: values.reason,
        createdAt: serverTimestamp()
      });

      toast.success("Appointment Confirmed", {
        description: `Successfully scheduled for ${selectedPatient?.full_name}.`
      });

      router.push('/dashboard/appointments');
    } catch (error: any) {
      console.error("Booking failed:", error);
      toast.error("Process Failed", { description: "You don't have permission to record schedules." });
    }
  };

  const patientOptions = patients?.map(p => ({ label: `${p.full_name} (MRN: ${p.mrn})`, value: p.id })) || [];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Appointment Desk</h1>
            <p className="text-muted-foreground font-medium italic">Assigning resources for <strong>{user?.hospitalId}</strong></p>
        </div>
      </div>

      <Card className="border-t-4 border-t-primary shadow-xl overflow-hidden">
        <CardHeader className="bg-muted/20 border-b">
          <CardTitle className="text-lg">Schedule New Visit</CardTitle>
          <CardDescription>Select patient and clinical availability.</CardDescription>
        </CardHeader>
        <CardContent className="pt-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                
                {/* Logistics Pane */}
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="patientId"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Search Patient Registry</FormLabel>
                        <Combobox
                          options={patientOptions}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select patient by MRN or Name..."
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="doctorId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Practitioner</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger className="bg-background h-11">
                                <SelectValue placeholder="Select doctor" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {doctors?.map(doc => (
                                <SelectItem key={doc.uid} value={doc.uid}>{doc.name} ({doc.specialty || 'General'})</SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="timeSlot"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Time Slot</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger className="bg-background h-11 font-mono">
                                <SelectValue placeholder="Choose time" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {timeSlots.map(slot => (
                                <SelectItem key={slot} value={slot} className="font-mono">{slot}</SelectItem>
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
                        <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Clinical Indication</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Routine Checkup, Follow-up" className="h-11" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Calendar Pane */}
                <div className="flex flex-col items-center gap-6 p-6 bg-muted/10 rounded-2xl border border-dashed">
                  <FormField
                    control={form.control}
                    name="appointmentDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col items-center">
                        <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Clinic Calendar</FormLabel>
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          className="bg-background border rounded-xl shadow-inner"
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="w-full">
                    <Button type="submit" className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 shadow-xl transition-all" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                      Confirm Reservation
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
