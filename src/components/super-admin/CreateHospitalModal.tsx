
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
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
import { Plus, Building2, ShieldAlert } from 'lucide-react';

const CreateHospitalSchema = z.object({
  hospitalName: z.string().min(3, 'Hospital name must be at least 3 characters'),
  directorName: z.string().min(3, 'Director full name is required'),
  directorEmail: z.string().email('Invalid email address'),
  directorPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * == Super Admin: Tenant Provisioning Tool ==
 * 
 * This component handles the creation of new hospital tenants using the client SDK.
 * It atomically provisions the Hospital record and the Director's profile, "stamping" 
 * them both with a unique shared hospitalId for logical isolation.
 */
export default function CreateHospitalModal() {
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
    },
  });

  const onSubmit = async (values: z.infer<typeof CreateHospitalSchema>) => {
    setIsSubmitting(true);
    try {
      // 1. Generate a unique ID (e.g., "st-marys-102")
      const newHospitalId = values.hospitalName.toLowerCase().replace(/\s+/g, '-') + '-' + Math.floor(1000 + Math.random() * 9000);
      const now = new Date().toISOString();

      // 2. Create the Director in Firebase Auth
      // NOTE: Creating a new user via the client SDK will automatically sign out the current user.
      const cred = await createUserWithEmailAndPassword(auth, values.directorEmail, values.directorPassword);
      const uid = cred.user.uid;

      // 3. Atomically provision documents via a Firestore Batch
      const batch = writeBatch(db);

      // Pattern: {hospitalId}_{email} - The SaaS isolation anchor for user profiles
      const userDocId = `${newHospitalId}_${values.directorEmail.toLowerCase().trim()}`;
      const userRef = doc(db, 'users', userDocId);
      
      // "STAMP" the Director with the Hospital ID
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

      // "STAMP" the Hospital Master Record
      const hospitalRef = doc(db, 'hospitals', newHospitalId);
      batch.set(hospitalRef, {
        hospitalId: newHospitalId,
        id: newHospitalId,
        name: values.hospitalName,
        slug: newHospitalId,
        status: 'active',
        isActive: true,
        createdAt: serverTimestamp(),
        ownerEmail: values.directorEmail,
        subscriptionTier: 'basic',
      });

      await batch.commit();

      toast.success("Facility Provisioned", {
        description: `${values.hospitalName} is now active. You have been signed out to complete the Director's onboarding.`
      });
      
      setOpen(false);
      form.reset();
    } catch (error: any) {
      console.error("Provisioning failed:", error);
      toast.error("Provisioning Failed", {
        description: error.message || "An error occurred during hospital registration."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 shadow-md">
          <Plus className="h-4 w-4 mr-2" />
          New Hospital
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-5 w-5 text-primary" />
            <DialogTitle>Register New Facility</DialogTitle>
          </div>
          <DialogDescription>
            Onboard a new hospital tenant and its primary Medical Director.
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
                  <FormControl><Input placeholder="e.g., City General Hospital" {...field} /></FormControl>
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
                  <FormControl><Input placeholder="Dr. James Smith" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="directorEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Director Email (Login)</FormLabel>
                  <FormControl><Input type="email" placeholder="director@facility.com" {...field} /></FormControl>
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
                  <FormControl><Input type="password" placeholder="Set a temporary password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="p-3 rounded-md bg-yellow-50 border border-yellow-200 flex gap-3">
                <ShieldAlert className="h-5 w-5 text-yellow-600 shrink-0" />
                <p className="text-xs text-yellow-700">
                    <strong>Notice:</strong> Provisioning a new hospital will sign you out. You must log back in as CEO to continue platform tasks.
                </p>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Provisioning...' : 'Confirm & Provision'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
