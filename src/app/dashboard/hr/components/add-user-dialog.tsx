
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
import { Input } from '@/components/ui/input';
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
import { toast } from '@/hooks/use-toast';
import { User } from '@/lib/types';
import { Plus } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

const NewUserWithHospitalSchema = z.object({
  hospitalId: z.string().min(1),
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('A valid email is required'),
  role: z.enum(['admin', 'doctor', 'nurse', 'pharmacist', 'patient', 'billing_clerk', 'lab_technician', 'ot_coordinator', 'receptionist', 'radiologist', 'dietitian', 'housekeeping', 'space_manager', 'supplier']),
  department: z.string().optional(),
});


interface AddUserDialogProps {
    onUserCreated: (newUser: User) => void;
}

export function AddUserDialog({ onUserCreated }: AddUserDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = React.useState(false);

  const form = useForm<z.infer<typeof NewUserWithHospitalSchema>>({
    resolver: zodResolver(NewUserWithHospitalSchema),
    defaultValues: {
      hospitalId: user?.hospitalId || '',
      firstName: '',
      lastName: '',
      email: '',
      role: 'nurse',
      department: '',
    },
  });

  React.useEffect(() => {
    if (open && user) {
        form.setValue('hospitalId', user.hospitalId);
    }
  }, [open, user, form]);

  const onSubmit = (values: z.infer<typeof NewUserWithHospitalSchema>) => {
    // Implement hospitalId_emailAddress pattern for unique Document ID
    const normalizedEmail = values.email.toLowerCase().trim();
    const customUid = `${values.hospitalId}_${normalizedEmail}`;

    const newUser: User = {
        uid: customUid,
        hospitalId: values.hospitalId,
        email: normalizedEmail,
        name: `${values.firstName} ${values.lastName}`,
        role: values.role,
        department: values.department,
        is_active: true,
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
    };

    onUserCreated(newUser);
    toast.success('User Created', {
        description: `${values.firstName} ${values.lastName} has been added to the system with unique ID: ${customUid}`
    });
    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add New User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New User Profile</DialogTitle>
          <DialogDescription>
            Enter the details for the new staff member. The Document ID will be generated as hospitalId_email to ensure uniqueness within your facility.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
             <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
             </div>
             <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl><Input type="email" {...field} /></FormControl>
                        <FormDescription>This will be used to generate the unique Document ID.</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Role</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="doctor">Doctor</SelectItem>
                                    <SelectItem value="nurse">Nurse</SelectItem>
                                    <SelectItem value="pharmacist">Pharmacist</SelectItem>
                                    <SelectItem value="lab_technician">Lab Technician</SelectItem>
                                    <SelectItem value="receptionist">Receptionist</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Department</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select a department" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="Cardiology">Cardiology</SelectItem>
                                    <SelectItem value="Neurology">Neurology</SelectItem>
                                    <SelectItem value="Pharmacy">Pharmacy</SelectItem>
                                    <SelectItem value="Administration">Administration</SelectItem>
                                     <SelectItem value="Nursing">Nursing</SelectItem>
                                      <SelectItem value="Laboratory">Laboratory</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Creating...' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
