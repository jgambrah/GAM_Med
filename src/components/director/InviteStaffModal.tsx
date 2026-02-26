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
import { doc, setDoc, getDoc, writeBatch } from 'firebase/firestore';
import { UserPlus, Plus } from 'lucide-react';
import { sendStaffInvitationEmail } from '@/lib/actions';

const InviteStaffSchema = z.object({
  name: z.string().min(3, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'doctor', 'nurse', 'pharmacist', 'receptionist', 'lab_technician', 'billing_clerk']),
});

/**
 * == Director Module: Staff Provisioning ==
 * 
 * Provisions the profile and creates the mandatory UID role marker
 * required for Firestore security rules.
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
      const userDocId = `${currentUser.hospitalId}_${normalizedEmail}`;
      const existingDoc = await getDoc(doc(db, 'users', userDocId));
      
      if (existingDoc.exists()) {
          toast.error("Duplicate Entry", { description: "User already registered at your facility." });
          setIsSubmitting(false);
          return;
      }

      const tempUid = `INVITED_${Date.now()}`;
      const batch = writeBatch(db);

      // 1. User Profile
      batch.set(doc(db, 'users', userDocId), {
        uid: tempUid,
        hospitalId: currentUser.hospitalId,
        email: normalizedEmail,
        name: values.name,
        role: values.role,
        is_active: true,
        created_at: new Date().toISOString(),
      });

      // 2. Role Marker (For DBAC Rules)
      const roleCollection = (values.role === 'admin') ? 'roles_admin' : 'roles_staff';
      batch.set(doc(db, roleCollection, tempUid), {
          uid: tempUid,
          hospitalId: currentUser.hospitalId,
          assignedAt: new Date().toISOString()
      });

      await batch.commit();

      const hospitalDoc = await getDoc(doc(db, 'hospitals', currentUser.hospitalId));
      const hospitalName = hospitalDoc.exists() ? hospitalDoc.data().name : 'your facility';

      await sendStaffInvitationEmail({
          email: normalizedEmail,
          name: values.name,
          hospitalName: hospitalName,
          role: values.role
      });

      toast.success('Staff Member Invited');
      setOpen(false);
      form.reset();
    } catch (error: any) {
      toast.error('Provisioning Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" /> Invite Staff Member</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <DialogTitle>Invite New Staff</DialogTitle>
          </div>
          <DialogDescription>Register a new employee for <strong>{currentUser?.hospitalId}</strong>.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Jane Doe" {...field} /></FormControl><FormMessage /></FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" placeholder="name@facility.com" {...field} /></FormControl><FormMessage /></FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>System Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
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
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Inviting...' : 'Invite Staff'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}