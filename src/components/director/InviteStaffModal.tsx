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
import { UserPlus, Plus } from 'lucide-react';
import { sendStaffInvitationEmail } from '@/lib/actions';

const InviteStaffSchema = z.object({
  name: z.string().min(3, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'doctor', 'nurse', 'pharmacist', 'receptionist', 'lab_technician', 'billing_clerk']),
});

/**
 * == Director Module: Staff Provisioning & Email Automation ==
 * 
 * Allows a Hospital Director to register new staff members.
 * It atomically provisions the Firestore profile and triggers a stylized 
 * welcome email via a secure server action.
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
        toast.error("Auth Error", { description: "Hospital context not found. Please log in again." });
        return;
    }

    setIsSubmitting(true);
    const normalizedEmail = values.email.toLowerCase().trim();
    
    try {
      // 1. Generate the unique Document ID for this tenant: {hospitalId}_{email}
      const userDocId = `${currentUser.hospitalId}_${normalizedEmail}`;

      // 2. Uniqueness Check: Ensure this user isn't already registered at this facility
      const existingDoc = await getDoc(doc(db, 'users', userDocId));
      if (existingDoc.exists()) {
          toast.error("Duplicate Entry", {
              description: "A user with this email already exists at your facility."
          });
          setIsSubmitting(false);
          return;
      }

      // 3. Provision the Firestore Profile (The SaaS "Stamping" Logic)
      await setDoc(doc(db, 'users', userDocId), {
        uid: `INVITED_${Date.now()}`, // Temporary ID, will be synced on first login
        hospitalId: currentUser.hospitalId,
        email: normalizedEmail,
        name: values.name,
        role: values.role,
        is_active: true,
        created_at: new Date().toISOString(),
      });

      // 4. Fetch the real Hospital Name for the welcome email
      const hospitalDoc = await getDoc(doc(db, 'hospitals', currentUser.hospitalId));
      const hospitalName = hospitalDoc.exists() ? hospitalDoc.data().name : 'your local facility';

      // 5. Trigger stylized Welcome Email via Server Action
      const emailResult = await sendStaffInvitationEmail({
          email: normalizedEmail,
          name: values.name,
          hospitalName: hospitalName,
          role: values.role.charAt(0).toUpperCase() + values.role.slice(1).replace('_', ' ')
      });

      if (emailResult.success) {
          toast.success('Staff Member Invited', {
            description: `Invitation sent to ${normalizedEmail}. They can now log in.`
          });
      } else {
          toast.warning('Staff Registered, Email Failed', {
            description: `Profile created, but the welcome email could not be sent.`
          });
      }
      
      setOpen(false);
      form.reset();
    } catch (error: any) {
      console.error("Provisioning failed:", error);
      toast.error('Provisioning Failed', { description: "You don't have permission to invite staff." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="shadow-sm">
            <Plus className="h-4 w-4 mr-2" />
            Invite Staff Member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2 text-primary">
            <UserPlus className="h-5 w-5" />
            <DialogTitle>Invite New Staff</DialogTitle>
          </div>
          <DialogDescription>
            Register a new employee for your facility. They will be logically isolated to <strong>{currentUser?.hospitalId}</strong>.
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
                  <FormDescription className="text-xs">The staff member must use this email to sign up.</FormDescription>
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
                {isSubmitting ? 'Recording...' : 'Register & Send Invite'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}