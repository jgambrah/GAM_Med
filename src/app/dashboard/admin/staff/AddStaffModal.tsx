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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';

const AddStaffSchema = z.object({
  name: z.string().min(3, 'Name is required'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'doctor', 'nurse', 'pharmacist', 'receptionist']),
});

export default function AddStaffModal() {
  const [open, setOpen] = React.useState(false);
  const { user } = useAuth();
  const db = useFirestore();

  const form = useForm<z.infer<typeof AddStaffSchema>>({
    resolver: zodResolver(AddStaffSchema),
    defaultValues: {
      name: '',
      email: '',
      role: 'nurse',
    },
  });

  const onSubmit = async (values: z.infer<typeof AddStaffSchema>) => {
    if (!user?.hospitalId) return;

    const normalizedEmail = values.email.toLowerCase().trim();
    const userDocId = `${user.hospitalId}_${normalizedEmail}`;

    try {
      await setDoc(doc(db, 'users', userDocId), {
        uid: `AUTH_${Date.now()}`, // Simulated Auth ID for prototype
        hospitalId: user.hospitalId,
        email: normalizedEmail,
        name: values.name,
        role: values.role,
        is_active: true,
        created_at: new Date().toISOString(),
      });

      toast.success('Staff Added', {
        description: `${values.name} has been registered.`
      });
      setOpen(false);
      form.reset();
    } catch (error: any) {
      toast.error('Failed to add staff', { description: error.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>+ Add Staff Member</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Staff</DialogTitle>
          <DialogDescription> Register a new employee for this facility. </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl><Input type="email" placeholder="john@hospital.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="admin">Administrator</SelectItem>
                      <SelectItem value="doctor">Doctor</SelectItem>
                      <SelectItem value="nurse">Nurse</SelectItem>
                      <SelectItem value="pharmacist">Pharmacist</SelectItem>
                      <SelectItem value="receptionist">Receptionist</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Register Staff</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
