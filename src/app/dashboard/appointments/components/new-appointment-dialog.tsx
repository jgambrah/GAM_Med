
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { NewAppointmentSchema } from '@/lib/schemas';
import { allPatients, allUsers } from '@/lib/data';
import { Plus } from 'lucide-react';
import { bookAppointment } from '@/lib/actions';
import { Combobox } from '@/components/ui/combobox';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

const mockDepartments = [
    { value: 'Cardiology', label: 'Cardiology' },
    { value: 'Orthopedics', label: 'Orthopedics' },
    { value: 'Pediatrics', label: 'Pediatrics' },
    { value: 'Neurology', label: 'Neurology' },
    { value: 'General Surgery', label: 'General Surgery' },
    { value: 'Dermatology', label: 'Dermatology' },
];

export function NewAppointmentDialog() {
  const [open, setOpen] = React.useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof NewAppointmentSchema>>({
    resolver: zodResolver(NewAppointmentSchema),
    defaultValues: {
      patientId: '',
      department: '',
      doctorId: 'any',
      appointmentDate: '',
      appointmentTime: '',
      type: 'consultation',
    },
  });

  React.useEffect(() => {
    // If the user is a patient, ensure their ID is set in the form.
    if (user?.role === 'patient' && user.patient_id) {
      form.setValue('patientId', user.patient_id);
    } else {
      // If not a patient, reset to default in case of role switch
      form.setValue('patientId', '');
    }
  }, [user, form]);
  
  const selectedDepartment = form.watch('department');

  const doctors = allUsers.filter((user) => user.role === 'doctor');
  const filteredDoctors = selectedDepartment 
    ? doctors.filter(doc => doc.department === selectedDepartment)
    : doctors;

  const patientOptions = allPatients.map(p => ({
      value: p.patient_id,
      label: `${p.full_name} (${p.patient_id})`
  }));

  const onSubmit = async (values: z.infer<typeof NewAppointmentSchema>) => {
    const result = await bookAppointment(values);
    if (result.success) {
      toast({
        title: 'Appointment Booked',
        description: 'The appointment has been successfully scheduled.',
      });
      setOpen(false);
      form.reset({
        patientId: user?.role === 'patient' ? user.patient_id : '',
        department: '',
        doctorId: 'any',
        appointmentDate: '',
        appointmentTime: '',
        type: 'consultation',
      });
    } else {
      toast({
        title: 'Booking Failed',
        description: result.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
            <Plus className="h-4 w-4 mr-2" />
            Book New Appointment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Book New Appointment</DialogTitle>
          <DialogDescription>
            Fill in the details below to schedule a new appointment.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            {user?.role === 'patient' ? (
                <FormItem>
                  <FormLabel>Patient</FormLabel>
                  <FormControl>
                    <Input value={user.name} disabled />
                  </FormControl>
                  <input type="hidden" {...form.register('patientId')} />
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
                      form.setValue('doctorId', 'any'); // Reset doctor when department changes
                  }} defaultValue={field.value}>
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

            <div className="grid grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="appointmentDate"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Date</FormLabel>
                            <FormControl>
                                <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="appointmentTime"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Time</FormLabel>
                            <FormControl>
                                <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
             <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Appointment Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Booking...' : 'Book Appointment'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
