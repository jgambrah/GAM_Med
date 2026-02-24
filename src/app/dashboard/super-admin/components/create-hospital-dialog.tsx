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
import { Plus, Building2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { doc, writeBatch } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useFirestore, useAuth } from '@/firebase';

const OnboardingSchema = z.object({
  hospitalName: z.string().min(3, 'Hospital name is required'),
  directorName: z.string().min(3, 'Director name is required'),
  directorEmail: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  tier: z.enum(['basic', 'premium']),
});

/**
 * == Super Admin: Tenant Provisioning Tool ==
 * 
 * This component allows the Platform Owner to create new hospital tenants.
 * It atomically provisions the Hospital master record and the Director's user profile.
 */
export function CreateHospitalDialog() {
  const [open, setOpen] = React.useState(false);
  const db = useFirestore();
  const auth = useAuth();

  const form = useForm<z.infer<typeof OnboardingSchema>>({
    resolver: zodResolver(OnboardingSchema),
    defaultValues: {
      hospitalName: '',
      directorName: '',
      directorEmail: '',
      password: '',
      tier: 'basic',
    },
  });

  const onSubmit = async (values: z.infer<typeof OnboardingSchema>) => {
    // 1. Generate unique Hospital ID (e.g., "st-marys-102")
    const newHospitalId = values.hospitalName.toLowerCase().replace(/\s+/g, '-') + '-' + Math.floor(Math.random() * 1000);
    const now = new Date().toISOString();
    
    try {
      // 2. Create the Director in Firebase Auth
      // Note: In a prototype, this will sign out the current admin. 
      // In production, this would be a Cloud Function.
      const cred = await createUserWithEmailAndPassword(auth, values.directorEmail, values.password);
      const uid = cred.user.uid;

      // 3. Provision documents atomically via Batch
      const batch = writeBatch(db);
      
      // Pattern: {hospitalId}_{email} - The SaaS isolation anchor
      const userDocId = `${newHospitalId}_${values.directorEmail.toLowerCase().trim()}`;
      const directorRef = doc(db, 'users', userDocId);
      
      // STAMP the Director with the Hospital ID
      batch.set(directorRef, {
        uid: uid,
        hospitalId: newHospitalId,
        email: values.directorEmail.toLowerCase().trim(),
        name: values.directorName,
        role: 'director',
        is_active: true,
        created_at: now,
        last_login: now
      });

      // 4. Create the Hospital Master Record
      const hospitalRef = doc(db, 'hospitals', newHospitalId);
      batch.set(hospitalRef, {
        hospitalId: newHospitalId,
        id: newHospitalId, // Legacy field support
        name: values.hospitalName,
        slug: newHospitalId,
        status: 'active',
        isActive: true, // Legacy field support
        subscriptionTier: values.tier,
        createdAt: now,
        ownerEmail: values.directorEmail
      });

      await batch.commit();
      
      toast.success('Hospital Onboarded Successfully', {
        description: `${values.hospitalName} has been provisioned. Redirecting to login...`
      });
      
      setOpen(false);
      form.reset();
    } catch (error: any) {
      console.error('Onboarding failed:', error);
      toast.error('Provisioning Error', {
        description: error.message || 'Could not provision new hospital tenant.'
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="shadow-md">
          <Plus className="h-4 w-4 mr-2" />
          Onboard New Hospital
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-5 w-5 text-primary" />
            <DialogTitle>Hospital Onboarding</DialogTitle>
          </div>
          <DialogDescription>
            Register a new healthcare facility and its primary administrator (Director).
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="hospitalName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hospital / Clinic Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Accra Specialist Center" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="directorName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Medical Director Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Dr. John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="directorEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Director's Work Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="director@facility.com" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Used for the primary Director account.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Director's Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Set a strong password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subscription Plan</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a plan" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="basic">Basic (Ghana Standard)</SelectItem>
                      <SelectItem value="premium">Premium (AI & Multi-site)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Provisioning...' : 'Confirm & Provision'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
