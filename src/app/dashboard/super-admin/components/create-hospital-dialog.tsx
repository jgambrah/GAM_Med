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
import { useFirestore } from '@/firebase';

const OnboardingSchema = z.object({
  hospitalName: z.string().min(3, 'Hospital name is required'),
  directorName: z.string().min(3, 'Director name is required'),
  directorEmail: z.string().email('Invalid email address'),
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

  const form = useForm<z.infer<typeof OnboardingSchema>>({
    resolver: zodResolver(OnboardingSchema),
    defaultValues: {
      hospitalName: '',
      directorName: '',
      directorEmail: '',
      tier: 'basic',
    },
  });

  const onSubmit = async (values: z.infer<typeof OnboardingSchema>) => {
    // 1. Generate unique Hospital ID (Slug)
    const hospitalId = values.hospitalName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const now = new Date().toISOString();
    
    // 2. Provision documents atomically via Batch
    // This ensures data integrity: both records exist or neither does.
    const batch = writeBatch(db);
    
    // a) Create the Hospital Master Record
    const hospitalRef = doc(db, 'hospitals', hospitalId);
    batch.set(hospitalRef, {
      hospitalId,
      name: values.hospitalName,
      slug: hospitalId,
      status: 'active',
      subscriptionTier: values.tier,
      createdAt: now,
      ownerEmail: values.directorEmail
    });

    // b) Create the Director's User Profile
    // ID Pattern: {hospitalId}_{email} - The "SaaS Wall" anchor
    const directorId = `${hospitalId}_${values.directorEmail.toLowerCase().trim()}`;
    const directorRef = doc(db, 'users', directorId);
    
    batch.set(directorRef, {
      uid: `PROVISIONED_${Date.now()}`, // Temporary UID; actual Auth UID assigned on first login
      hospitalId,
      email: values.directorEmail.toLowerCase().trim(),
      name: values.directorName,
      role: 'director',
      is_active: true,
      created_at: now,
      last_login: now
    });

    try {
      await batch.commit();
      
      toast.success('Hospital Onboarded Successfully', {
        description: `${values.hospitalName} has been provisioned. Welcome email sent to ${values.directorEmail} (simulated).`
      });
      
      // Close and reset
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
                    This email will be the primary login for the hospital tenant.
                  </FormDescription>
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
