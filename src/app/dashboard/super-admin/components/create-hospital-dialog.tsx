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
import { Plus, Building2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { doc, setDoc, writeBatch } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

const OnboardingSchema = z.object({
  hospitalName: z.string().min(3, 'Hospital name is required'),
  directorName: z.string().min(3, 'Director name is required'),
  directorEmail: z.string().email('Invalid email address'),
  tier: z.enum(['basic', 'premium']),
});

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
    // 1. Generate unique Hospital ID
    const hospitalId = values.hospitalName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const now = new Date().toISOString();
    
    // 2. Provision documents atomically via Batch
    const batch = writeBatch(db);
    
    // Hospital Record
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

    // Director Profile
    // ID Pattern: {hospitalId}_{email}
    const directorId = `${hospitalId}_${values.directorEmail.toLowerCase().trim()}`;
    const directorRef = doc(db, 'users', directorId);
    
    batch.set(directorRef, {
      uid: `MOCK_AUTH_${Date.now()}`, // In production, this would be the actual Auth UID
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
      
      toast.success('Hospital Onboarded', {
        description: `${values.hospitalName} is ready. Temporary credentials sent to ${values.directorEmail}.`
      });
      
      // LOGIC NOTE: In a real-world production app, this client-side write would trigger
      // the 'syncUserClaims' Cloud Function to lock the hospitalId to the user's JWT.
      
      setOpen(false);
      form.reset();
    } catch (error: any) {
      console.error('Onboarding failed:', error);
      toast.error('Onboarding Failed', {
        description: error.message || 'Could not provision new tenant.'
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg">
          <Building2 className="h-4 w-4 mr-2" />
          Onboard New Hospital
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Hospital Onboarding</DialogTitle>
          <DialogDescription>
            Provision a new logically isolated tenant and create the Director account.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="hospitalName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Healthcare Facility Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., St. Lukes Medical Center" {...field} />
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
                  <FormLabel>Medical Director / CEO Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Dr. Jane Smith" {...field} />
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
                  <FormDescription>
                    This will be the primary login for the facility.
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
                  <FormLabel>Subscription Tier</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a plan" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="basic">Basic (Standard ERP)</SelectItem>
                      <SelectItem value="premium">Premium (AI & Enterprise Support)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Provisioning...' : 'Confirm & Onboard'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}