'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, writeBatch } from 'firebase/firestore';
import { useFirestore, useAuth } from '@/firebase';
import { toast } from '@/hooks/use-toast';
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
import { Button } from '@/components/ui/button';
import { Plus, Building2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { sendStaffInvitationEmail } from '@/lib/actions';

const CreateHospitalSchema = z.object({
  hospitalName: z.string().min(3, 'Hospital name must be at least 3 characters'),
  directorName: z.string().min(3, 'Director full name is required'),
  directorEmail: z.string().email('Invalid email address'),
  directorPassword: z.string().min(8, 'Password must be at least 8 characters'),
  subscriptionTier: z.enum(['clinic-starter', 'professional', 'enterprise']),
});

interface CreateHospitalModalProps {
    initialData?: {
        name: string;
        hospitalName: string;
        email: string;
    } | null;
    onSuccess?: () => void;
}

/**
 * == Super Admin: Tenant Provisioning Tool ==
 * 
 * This component handles the creation of new hospital tenants.
 * Includes AUTO-FILL logic for seamless provisioning from sales leads.
 */
export default function CreateHospitalModal({ initialData, onSuccess }: CreateHospitalModalProps) {
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const db = useFirestore();
  const auth = useAuth();

  const form = useForm<z.infer<typeof CreateHospitalSchema>>({
    resolver: zodResolver(CreateHospitalSchema),
    defaultValues: {
      hospitalName: '',
      directorName: '',
      directorEmail: '',
      directorPassword: '',
      subscriptionTier: 'clinic-starter',
    },
  });

  // AUTO-FILL LOGIC: If initialData is provided (from a lead), fill the form and open modal
  React.useEffect(() => {
    if (initialData) {
      form.reset({
        hospitalName: initialData.hospitalName || '',
        directorName: initialData.name || '',
        directorEmail: initialData.email || '',
        directorPassword: '', // Password must still be set manually for security
        subscriptionTier: 'clinic-starter',
      });
      setOpen(true);
    }
  }, [initialData, form]);

  const onSubmit = async (values: z.infer<typeof CreateHospitalSchema>) => {
    setIsSubmitting(true);
    try {
      const newHospitalId = values.hospitalName.toLowerCase().replace(/\s+/g, '-') + '-' + Math.floor(1000 + Math.random() * 9000);
      const now = new Date().toISOString();

      // Trial logic
      const trialDurationDays = 30;
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + trialDurationDays);

      const cred = await createUserWithEmailAndPassword(auth, values.directorEmail, values.directorPassword);
      const uid = cred.user.uid;

      const batch = writeBatch(db);

      const userDocId = `${newHospitalId}_${values.directorEmail.toLowerCase().trim()}`;
      const userRef = doc(db, 'users', userDocId);
      
      batch.set(userRef, {
        uid: uid,
        email: values.directorEmail.toLowerCase().trim(),
        hospitalId: newHospitalId,
        role: 'director',
        name: values.directorName,
        is_active: true,
        created_at: now,
        last_login: now,
      });

      const hospitalRef = doc(db, 'hospitals', newHospitalId);
      batch.set(hospitalRef, {
        hospitalId: newHospitalId,
        name: values.hospitalName,
        slug: newHospitalId,
        status: 'active',
        planId: 'trial', 
        subscriptionStatus: 'trialing',
        trialEndsAt: trialEndDate.toISOString(),
        subscriptionTier: values.subscriptionTier,
        isActive: true,
        createdAt: now,
        ownerEmail: values.directorEmail,
      });

      const roleRef = doc(db, 'roles_admin', uid);
      batch.set(roleRef, {
        uid: uid,
        hospitalId: newHospitalId,
        assignedAt: now,
      });

      await batch.commit();

      await sendStaffInvitationEmail({
          email: values.directorEmail,
          name: values.directorName,
          hospitalName: values.hospitalName,
          role: 'Medical Director'
      });

      toast.success("Facility Provisioned", {
        description: `${values.hospitalName} is now active with a 30-day trial.`
      });
      
      setOpen(false);
      form.reset();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Provisioning failed:", error);
      toast.error("Provisioning Failed", {
        description: error.message || "An error occurred."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {!initialData && (
            <Button className="bg-blue-600 hover:bg-blue-700 shadow-md">
                <Plus className="h-4 w-4 mr-2" />
                New Hospital
            </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-5 w-5 text-primary" />
            <DialogTitle>Register New Facility</DialogTitle>
          </div>
          <DialogDescription>
            Onboard a new hospital tenant. They will start on a 30-day trial.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="hospitalName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hospital Name</FormLabel>
                  <FormControl><Input placeholder="e.g., City General" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="directorEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Director Email</FormLabel>
                  <FormControl><Input type="email" placeholder="director@facility.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="directorName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Director Full Name</FormLabel>
                  <FormControl><Input placeholder="Dr. John Doe" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="directorPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Temporary Password</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subscriptionTier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan (Post-Trial)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="clinic-starter">Clinic Starter</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                {isSubmitting ? 'Provisioning...' : 'Confirm & Provision'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
