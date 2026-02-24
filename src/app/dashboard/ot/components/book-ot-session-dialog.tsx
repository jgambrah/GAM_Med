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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Plus, Loader2 } from 'lucide-react';
import { Combobox } from '@/components/ui/combobox';
import { allPatients as initialPatients, allUsers } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Patient } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { scheduleOTSession } from '@/lib/actions';

const OtSessionSchema = z.object({
  hospitalId: z.string().min(1),
  patientId: z.string().min(1, 'A patient is required.'),
  otRoomId: z.string().min(1, 'An operating theatre is required.'),
  procedureName: z.string().min(5, 'Procedure name must be at least 5 characters.'),
  leadSurgeonId: z.string().min(1, 'A lead surgeon is required.'),
  startTime: z.string().refine(val => val, { message: "Start time is required" }),
  estimatedDuration: z.coerce.number().min(15, "Estimated duration is required"),
  priority: z.enum(['Emergency', 'Elective', 'Urgent']),
  notes: z.string().optional(),
});

const mockOperatingTheaters = [
    { value: 'OT-1', label: 'Operating Theatre 1 (General)' },
    { value: 'OT-2', label: 'Operating Theatre 2 (Cardiothoracic)' },
    { value: 'OT-3', label: 'Operating Theatre 3 (Orthopedic)' },
];

// Mock pre-op checklist for a selected patient. In a real app, this would be fetched.
const mockPreOpChecklist = {
    'P-123456': [ // Kwame Owusu
        { item: 'Consent Form Signed', status: 'Completed' },
        { item: 'NPO Status Confirmed', status: 'Completed' },
        { item: 'Pre-op Labs (FBC)', status: 'Completed' },
        { item: 'Anesthesia Review', status: 'Pending' }
    ],
    'P-654321': [] // No checklist for this patient
};

export function BookOtSessionDialog() {
  const { user } = useAuth();
  const firestore = useFirestore();
  const [open, setOpen] = React.useState(false);
  const [preOpWarnings, setPreOpWarnings] = React.useState<string[]>([]);
  const [allPatients] = useLocalStorage<Patient[]>('patients', initialPatients);
  
  const form = useForm<z.infer<typeof OtSessionSchema>>({
    resolver: zodResolver(OtSessionSchema),
    defaultValues: {
      hospitalId: user?.hospitalId || '',
      patientId: '',
      otRoomId: '',
      procedureName: '',
      leadSurgeonId: '',
      startTime: '',
      estimatedDuration: 90,
      priority: 'Elective',
      notes: '',
    },
  });

  const selectedPatientId = form.watch('patientId');
  
  React.useEffect(() => {
    if (open && user) {
        form.setValue('hospitalId', user.hospitalId);
    }
  }, [open, user, form]);

  React.useEffect(() => {
    if (selectedPatientId) {
        const checklist = mockPreOpChecklist[selectedPatientId as keyof typeof mockPreOpChecklist] || [];
        const warnings = checklist
            .filter(item => item.status === 'Pending')
            .map(item => `${item.item} is still pending.`);
        setPreOpWarnings(warnings);
    } else {
        setPreOpWarnings([]);
    }
  }, [selectedPatientId]);


  const onSubmit = async (values: z.infer<typeof OtSessionSchema>) => {
    if (!firestore || !user) return;

    try {
        // 1. CONFLICT CHECK: Scoped to tenant
        const q = query(
            collection(firestore, "ot_sessions"),
            where("hospitalId", "==", user.hospitalId),
            where("otRoomId", "==", values.otRoomId),
            where("startTime", "==", values.startTime)
        );

        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            toast.error("Double Booking Detected", {
                description: "This OT Room is already booked for the selected time."
            });
            return;
        }

        // 2. SAVE RECORD
        const patient = allPatients.find(p => p.patient_id === values.patientId);
        const surgeon = allUsers.find(u => u.uid === values.leadSurgeonId);

        const newSession = {
            ...values,
            patientName: patient?.full_name || 'Patient',
            patientMrn: patient?.mrn || 'N/A',
            surgeonName: surgeon?.name || 'Medical Staff',
            status: 'Scheduled',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        // Server action for side effects (revalidation)
        await scheduleOTSession(newSession);
        
        // Firestore write
        addDocumentNonBlocking(collection(firestore, 'ot_sessions'), newSession);
        
        toast.success('Theater Session Booked', {
            description: `Procedure scheduled for ${values.procedureName} in ${values.otRoomId}.`
        });
        
        setOpen(false);
        form.reset();
    } catch (error: any) {
        console.error("Booking failed:", error);
        toast.error("Booking Failed", { description: "An error occurred during theater reservation." });
    }
  };

  const patientOptions = allPatients.filter(p => p.is_admitted).map(p => ({ value: p.patient_id, label: `${p.full_name} (${p.patient_id})` }));
  const surgeonOptions = allUsers.filter(u => u.role === 'doctor').map(d => ({ value: d.uid, label: d.name }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-red-600 hover:bg-red-700">
          <Plus className="h-4 w-4 mr-2" />
          Book OT Session
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Theater Reservation</DialogTitle>
          <DialogDescription>
            Schedule a procedure for <strong>{user?.hospitalId}</strong>. The system will automatically check for room conflicts.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="patientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Inpatient</FormLabel>
                  <Combobox
                    options={patientOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Search admitted patients..."
                    searchPlaceholder="Search..."
                    notFoundText="No admitted patient found."
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="procedureName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Procedure Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Appendectomy" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="otRoomId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Operating Theatre</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select unit" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {mockOperatingTheaters.map((ot) => (
                                    <SelectItem key={ot.value} value={ot.value}>
                                    {ot.label}
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
                    name="leadSurgeonId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Lead Surgeon</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select provider" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {surgeonOptions.map((s) => (
                                    <SelectItem key={s.value} value={s.value}>
                                    {s.label}
                                    </SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date & Time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="estimatedDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Est. Duration (Mins)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

            {preOpWarnings.length > 0 && (
                <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-md">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <AlertTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-bold text-yellow-800 uppercase tracking-tighter">Clinical Pre-Op Warning</p>
                            <div className="mt-1 text-xs text-yellow-700 space-y-1">
                                {preOpWarnings.map((warning, index) => (
                                    <p key={index}>• {warning}</p>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Logistics Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Special equipment, blood products required, etc..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting} className="bg-red-600 hover:bg-red-700">
                {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Finalize Reservation
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
