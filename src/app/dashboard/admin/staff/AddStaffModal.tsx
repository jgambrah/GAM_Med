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
  FormDescription,
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
import { doc, getDoc, writeBatch } from 'firebase/firestore';
import { Plus, Loader2, UserPlus } from 'lucide-react';

const AddStaffSchema = z.object({
  name: z.string().min(3, 'Full name is required'),
  email: z.string().email('Invalid work email address'),
  role: z.enum(['admin', 'doctor', 'nurse', 'pharmacist', 'receptionist', 'lab_technician', 'billing_clerk']),
});

/**
 * == Multi-Tenant Staff Provisioning ==
 * 
 * This component handles the creation of new staff records.
 * It enforces atomic creation of the profile and security role marker.
 */
export default function AddStaffModal() {
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
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
    if (!user?.hospitalId) {
        toast.error("Auth Error", { description: "Your session is missing a valid Hospital ID." });
        return;
    }

    setIsSubmitting(true);
    const normalizedEmail = values.email.toLowerCase().trim();
    
    // 1. CONSTRUCT COMPOSITE ID
    const userDocId = `${user.hospitalId}_${normalizedEmail}`;

    try {
      // 2. CHECK FOR DUPLICATES
      const existingDoc = await getDoc(doc(db, 'users', userDocId));
      if (existingDoc.exists()) {
          toast.error("Duplicate Entry", {
              description: `A user with the email ${normalizedEmail} already exists at this facility.`
          });
          setIsSubmitting(false);
          return;
      }

      // 3. ATOMIC PROVISIONING
      const batch = writeBatch(db);
      const tempUid = `INVITED_${Date.now()}`;

      // a) User Profile Document
      batch.set(doc(db, 'users', userDocId), {
        uid: tempUid,
        hospitalId: user.hospitalId,
        email: normalizedEmail,
        name: values.name,
        role: values.role,
        is_active: true,
        created_at: new Date().toISOString(),
      });

      // b) Role Marker Document (Mandatory for DBAC rules fallback)
      const roleCollection = (values.role === 'admin') ? 'roles_admin' : 'roles_staff';
      batch.set(doc(db, roleCollection, tempUid), {
          uid: tempUid,
          hospitalId: user.hospitalId,
          assignedAt: new Date().toISOString()
      });

      await batch.commit();

      toast.success('Staff Member Registered', {
        description: `${values.name} has been added to your facility registry.`
      });
      
      setOpen(false);
      form.reset();
    } catch (error: any) {
      console.error("Provisioning failed:", error);
      toast.error('Provisioning Failed', { description: "You don't have permission to modify staff records." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
            <Plus className="h-4 w-4 mr-2" />
            Register New Staff
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <DialogTitle>Staff Provisioning</DialogTitle>
          </div>
          <DialogDescription>
            Register a new employee for <strong>{user?.hospitalId}</strong>.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl><Input placeholder="e.g., John Doe" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Work Email Address</FormLabel>
                  <FormControl><Input type="email" placeholder="name@facility.com" {...field} /></FormControl>
                  <FormDescription className="text-[10px]">This will be their login username.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>System Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="doctor">Medical Doctor</SelectItem>
                      <SelectItem value="nurse">Nurse / Ward Staff</SelectItem>
                      <SelectItem value="pharmacist">Pharmacist</SelectItem>
                      <SelectItem value="lab_technician">Lab Technician</SelectItem>
                      <SelectItem value="receptionist">Front Desk / Reception</SelectItem>
                      <SelectItem value="admin">Administrative Staff</SelectItem>
                      <SelectItem value="billing_clerk">Billing & Accounts</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirm & Register
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
