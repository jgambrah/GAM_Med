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
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Building2, Loader2, UserPlus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
 * Handles the creation of new hospital tenants.
 * Supports auto-fill from Sales Leads for rapid onboarding.
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

  // AUTO-FILL LOGIC: If a lead is selected, populate and open the form.
  React.useEffect(() => {
    if (initialData) {
      form.reset({
        hospitalName: initialData.hospitalName || '',
        directorName: initialData.name || '',
        directorEmail: initialData.email || '',
        directorPassword: '',
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

      // Set 30-day trial window
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 30);

      // Create Director in Firebase Auth
      const cred = await createUserWithEmailAndPassword(auth, values.directorEmail, values.directorPassword);
      const uid = cred.user.uid;

      const batch = writeBatch(db);

      // 1. Create Director Profile (Logical isolation: {hospitalId}_{email})
      const userDocId = `${newHospitalId}_${values.directorEmail.toLowerCase().trim()}`;
      batch.set(doc(db, 'users', userDocId), {
        uid: uid,
        hospitalId: newHospitalId,
        email: values.directorEmail.toLowerCase().trim(),
        role: 'director',
        name: values.directorName,
        is_active: true,
        created_at: now,
        last_login: now,
      });

      // 2. Create Hospital Master Record
      batch.set(doc(db, 'hospitals', newHospitalId), {
        hospitalId: newHospitalId,
        name: values.hospitalName,
        slug: newHospitalId,
        status: 'active',
        subscriptionStatus: 'trialing',
        trialEndsAt: trialEndDate.toISOString(),
        subscriptionTier: values.subscriptionTier,
        isActive: true,
        createdAt: now,
        ownerEmail: values.directorEmail,
      });

      // 3. Set Role Marker for Security Rules
      batch.set(doc(db, 'roles_admin', uid), {
        uid: uid,
        hospitalId: newHospitalId,
        assignedAt: now,
      });

      await batch.commit();

      toast.success("Facility Provisioned", {
        description: `${values.hospitalName} dashboard is now active.`
      });
      
      setOpen(false);
      form.reset();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Provisioning failed:", error);
      toast.error("Provisioning Failed", { description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {initialData ? (
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 font-bold uppercase text-[10px] tracking-widest h-9 px-4 shadow-md">
                <UserPlus className="mr-2 h-3.5 w-3.5" />
                Provision Lead
            </Button>
        ) : (
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
            Provision a new tenant. Evaluation trial will last 30 days.
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
                  <FormControl><Input placeholder="e.g., Accra General" {...field} /></FormControl>
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
                  <FormControl><Input type="password" placeholder="Min 8 chars" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subscriptionTier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan Tier</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 h-11 px-8">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Finalize & Provision
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
