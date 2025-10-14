

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
import { allPatients as initialPatients, allUsers } from '@/lib/data';
import { Plus, Clock } from 'lucide-react';
import { bookAppointment } from '@/lib/actions';
import { Combobox } from '@/components/ui/combobox';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Appointment, Patient, User } from '@/lib/types';
import { useLocalStorage } from '@/hooks/use-local-storage';

const mockDepartments = [
    { value: 'Cardiology', label: 'Cardiology' },
    { value: 'Orthopedics', label: 'Orthopedics' },
    { value: 'Pediatrics', label: 'Pediatrics' },
    { value: 'Neurology', label: 'Neurology' },
    { value: 'General Surgery', label: 'General Surgery' },
    { value: 'Dermatology', label: 'Dermatology' },
];

const mockAvailableSlots = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00', '15:30'
];

const mockProcedureRooms = [
    { value: 'proc-room-1', label: 'Procedure Room 1' },
    { value: 'proc-room-2', label: 'Procedure Room 2' },
];

interface NewAppointmentDialogProps {
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  appointmentToReschedule?: Appointment | null;
  patientId?: string; // Prop to pre-select a patient
  doctorId?: string; // Prop to pre-select a doctor
}

export function NewAppointmentDialog({ 
  isOpen, 
  onOpenChange, 
  appointmentToReschedule,
  patientId,
  doctorId,
}: NewAppointmentDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [availableSlots, setAvailableSlots] = React.useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = React.useState(false);
  const { user } = useAuth();
  const [allPatients] = useLocalStorage<Patient[]>('patients', initialPatients);
  
  const isEditing = !!appointmentToReschedule;
  const isPrefilled = !!patientId;
  const open = isOpen !== undefined ? isOpen : internalOpen;
  const setOpen = onOpenChange !== undefined ? onOpenChange : setInternalOpen;
  
  const form = useForm<z.infer<typeof NewAppointmentSchema>>({
    resolver: zodResolver(NewAppointmentSchema),
    defaultValues: {
      patientId: '',
      department: '',
      doctorId: 'any',
      appointmentDate: '',
      appointmentTime: '',
      type: 'consultation',
      resourceId: '',
      isVirtual: false,
    },
  });

  React.useEffect(() => {
     if (open) {
        let defaultValues: Partial<z.infer<typeof NewAppointmentSchema>> = {
            patientId: user?.role === 'patient' ? user.patient_id : '',
            department: '',
            doctorId: 'any',
            appointmentDate: '',
            appointmentTime: '',
            type: 'consultation',
            isVirtual: false,
        };

        if (isEditing && appointmentToReschedule) {
            defaultValues = {
                ...defaultValues,
                patientId: appointmentToReschedule.patient_id,
                department: appointmentToReschedule.department,
                doctorId: appointmentToReschedule.doctor_id,
                appointmentDate: format(new Date(appointmentToReschedule.appointment_date), 'yyyy-MM-dd'),
                appointmentTime: format(new Date(appointmentToReschedule.appointment_date), 'HH:mm'),
                type: appointmentToReschedule.type,
                isVirtual: appointmentToReschedule.isVirtual,
            };
        } else if (isPrefilled && patientId) {
             defaultValues.patientId = patientId;
        }

        if (doctorId) {
            const preselectedDoctor = allUsers.find(u => u.uid === doctorId);
            if (preselectedDoctor) {
                defaultValues.doctorId = preselectedDoctor.uid;
                if (preselectedDoctor.department) {
                    defaultValues.department = preselectedDoctor.department;
                }
            }
        }
        
        form.reset(defaultValues as z.infer<typeof NewAppointmentSchema>);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEditing, appointmentToReschedule, user, form.reset, isPrefilled, patientId, doctorId]);
  
  const selectedDepartment = form.watch('department');
  const selectedDate = form.watch('appointmentDate');
  const appointmentType = form.watch('type');

  React.useEffect(() => {
    // This simulates fetching available slots when a date is selected.
    if (selectedDate) {
        setIsLoadingSlots(true);
        // In a real app, you would call `getClinicAvailability` or `getDoctorAvailability` here.
        setTimeout(() => {
            // To demonstrate the "no slots" workflow, we'll sometimes return an empty array.
            const slots = Math.random() > 0.3 ? mockAvailableSlots : [];
            setAvailableSlots(slots);
            setIsLoadingSlots(false);
        }, 500); // Simulate network delay
    } else {
        setAvailableSlots([]);
    }
  }, [selectedDate]);


  const doctors = allUsers.filter((user) => user.role === 'doctor');
  const filteredDoctors = selectedDepartment 
    ? doctors.filter(doc => doc.department === selectedDepartment)
    : doctors;

  const patientOptions = allPatients.map(p => ({
      value: p.patient_id,
      label: `${p.full_name} (${p.patient_id})`
  }));
  
  const prefilledPatientName = allPatients.find(p => p.patient_id === patientId)?.full_name;


  const onSubmit = async (values: z.infer<typeof NewAppointmentSchema>) => {
    console.log("Booking appointment with values:", values);
    const result = await bookAppointment(values);
    if (result.success) {
      toast.success(isEditing ? 'The appointment has been successfully rescheduled.' : 'The appointment has been successfully scheduled.');
      setOpen(false);
      form.reset();
    } else {
      toast.error(result.message || 'An unexpected error occurred.');
    }
  };

  const handleAddToWaitlist = () => {
    // In a real app, this would open the AddToWaitlistDialog,
    // pre-filled with the patient and service details.
    setOpen(false);
    toast.info("This would open the 'Add to Waitlist' dialog.");
  }

  const dialogContent = (
    <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Reschedule Appointment' : 'Book New Appointment'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Modify the details below to reschedule the appointment.' : 'Fill in the details below to schedule a new appointment.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            {user?.role === 'patient' ? (
                <FormItem>
                  <FormLabel>Patient</FormLabel>
                  <FormControl>
                    <Input value={user.name} readOnly disabled />
                  </FormControl>
                </FormItem>
            ) : isPrefilled ? (
                <FormItem>
                  <FormLabel>Patient</FormLabel>
                  <FormControl>
                    <Input value={prefilledPatientName || patientId} readOnly disabled />
                  </FormControl>
                </FormItem>
            ) : (
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
                        placeholder="Search for a patient..."
                        searchPlaceholder='Search patients...'
                        notFoundText='No patient found.'
                    />
                    <FormMessage />
                    </FormItem>
                )}
                />
            )}
            
            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <Select onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue('doctorId', 'any');
                  }} defaultValue={field.value} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a department" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {mockDepartments.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
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
              name="doctorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Doctor (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!selectedDepartment}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={selectedDepartment ? "Any available doctor" : "Select a department first"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="any">Any available doctor</SelectItem>
                      {filteredDoctors.map((d) => (
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
                name="appointmentDate"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                            <Input type="date" {...field} min={new Date().toISOString().split('T')[0]} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            {selectedDate && (
                <FormField
                    control={form.control}
                    name="appointmentTime"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Available Time Slots</FormLabel>
                             <FormControl>
                                <div className="grid grid-cols-4 gap-2">
                                     {isLoadingSlots ? (
                                        <p className="text-sm text-muted-foreground col-span-4">Loading slots...</p>
                                    ) : availableSlots.length > 0 ? (
                                        availableSlots.map(slot => (
                                            <Button
                                                key={slot}
                                                type="button"
                                                variant={field.value === slot ? 'default' : 'outline'}
                                                onClick={() => field.onChange(slot)}
                                                className="w-full"
                                            >
                                                {slot}
                                            </Button>
                                        ))
                                    ) : (
                                        <div className="col-span-4 text-center p-4 border-2 border-dashed rounded-lg">
                                            <p className="text-sm text-muted-foreground">No available slots on this date.</p>
                                            <Button 
                                                type="button" 
                                                variant="secondary" 
                                                className="mt-2"
                                                onClick={handleAddToWaitlist}
                                                disabled={!form.getValues('patientId')}
                                            >
                                                <Clock className="h-4 w-4 mr-2" />
                                                Add to Waiting List
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}
             <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Appointment Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="consultation">Consultation</SelectItem>
                      <SelectItem value="follow-up">Follow-up</SelectItem>
                      <SelectItem value="procedure">Procedure</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {appointmentType === 'procedure' && (
                <FormField
                    control={form.control}
                    name="resourceId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Book Procedure Room</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a procedure room" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {mockProcedureRooms.map((room) => (
                                <SelectItem key={room.value} value={room.value}>
                                {room.label}
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
              name="isVirtual"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Virtual Consultation</FormLabel>
                    <FormDescription>
                        This appointment will be a video call.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />


            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (isEditing ? 'Rescheduling...' : 'Booking...') : (isEditing ? 'Confirm Reschedule' : 'Book Appointment')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
  );

  if (isEditing) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {dialogContent}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
            <Plus className="h-4 w-4 mr-2" />
            Book New Appointment
        </Button>
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}
