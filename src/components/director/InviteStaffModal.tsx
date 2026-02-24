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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore } from '@/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Plus, UserPlus } from 'lucide-react';

const InviteStaffSchema = z.object({
  name: z.string().min(3, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'doctor', 'nurse', 'pharmacist', 'receptionist', 'lab_technician', 'billing_clerk']),
});

/**
 * == Director Module: Staff Provisioning ==
 * 
 * Allows a Hospital Director to register new staff members.
 * Enforces logical isolation by locking the hospitalId to the Director's own ID.
 */
export default function InviteStaffModal() {
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { user: currentUser } = useAuth();
  const db = useFirestore();

  const form = useForm<z.infer<typeof InviteStaffSchema>>({
    resolver: zodResolver(InviteStaffSchema),
    defaultValues: {
      name: '',
      email: '',
      role: 'nurse',
    },
  });

  const onSubmit = async (values: z.infer<typeof InviteStaffSchema>) => {
    if (!currentUser?.hospitalId) {
        toast.error("Auth Error", { description: "Hospital context not found." });
        return;
    }

    setIsSubmitting(true);
    const normalizedEmail = values.email.toLowerCase().trim();
    
    try {
      // In a production app, this would call a Cloud Function to handle Firebase Auth creation.
      // For this prototype, we simulate the provisioning of the Firestore profile.
      
      // Pattern: {hospitalId}_{email} - Ensuring uniqueness within the tenant
      const userDocId = `${currentUser.hospitalId}_${normalizedEmail}`;

      const existingDoc = await getDoc(doc(db, 'users', userDocId));
      if (existingDoc.exists()) {
          toast.error("Duplicate Entry", {
              description: "A user with this email already exists at your facility."
          });
          return;
      }

      await setDoc(doc(db, 'users', userDocId), {
        uid: `PENDING_${Date.now()}`, // Simulated Auth UID
        hospitalId: currentUser.hospitalId,
        email: normalizedEmail,
        name: values.name,
        role: values.role,
        is_active: true,
        created_at: new Date().toISOString(),
      });

      toast.success('Staff Member Registered', {
        description: `${values.name} has been added to the hospital directory.`
      });
      
      setOpen(false);
      form.reset();
    } catch (error: any) {
      console.error("Provisioning failed:", error);
      toast.error('Provisioning Failed', { description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
            <Plus className="h-4 w-4 mr-2" />
            Register Staff
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2 text-primary">
            <UserPlus className="h-5 w-5" />
            <DialogTitle>Invite New Staff</DialogTitle>
          </div>
          <DialogDescription>
            Register a new employee for your facility. They will be automatically linked to <strong>{currentUser?.hospitalId}</strong>.
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
                  <FormControl><Input placeholder="e.g., Jane Doe" {...field} /></FormControl>
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
                  <FormControl><Input type="email" placeholder="name@facility.com" {...field} /></FormControl>
                  <FormDescription className="text-xs">This will be their login username.</FormDescription>
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
                      <SelectItem value="admin">Admin Staff</SelectItem>
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
                {isSubmitting ? 'Registering...' : 'Register Staff Member'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}