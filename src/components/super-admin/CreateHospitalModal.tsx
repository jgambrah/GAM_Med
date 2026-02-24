'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
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
  directorEmail: z.string().email('Invalid email address'),
  directorPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export default function CreateHospitalModal() {
  const [open, setOpen] = React.useState(false);
  const db = useFirestore();
  const auth = useAuth();

  const form = useForm<z.infer<typeof CreateHospitalSchema>>({
    resolver: zodResolver(CreateHospitalSchema),
    defaultValues: {
      hospitalName: '',
      directorEmail: '',
      directorPassword: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof CreateHospitalSchema>) => {
    try {
      // 1. Generate unique ID (e.g., "st-marys-102")
      const newHospitalId = values.hospitalName.toLowerCase().replace(/\s+/g, '-') + '-' + Math.floor(Math.random() * 1000);
      const now = new Date().toISOString();

      // 2. Create the Director in Firebase Auth
      // NOTE: In a prototype client-side app, this will sign the current user out.
      // In production, this would be a Cloud Function.
      const cred = await createUserWithEmailAndPassword(auth, values.directorEmail, values.directorPassword);
      const uid = cred.user.uid;

      // 3. Atomically provision documents
      const batch = writeBatch(db);

      // STAMP the Director
      const userDocId = `${newHospitalId}_${values.directorEmail.toLowerCase().trim()}`;
      const userRef = doc(db, 'users', userDocId);
      batch.set(userRef, {
        uid: uid,
        email: values.directorEmail.toLowerCase(),
        hospitalId: newHospitalId,
        role: 'director',
        name: `${values.hospitalName} Director`,
        is_active: true,
        created_at: now,
        last_login: now,
      });

      // STAMP the Hospital
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

      toast.success("Facility Created", {
        description: `${values.hospitalName} and Director account have been provisioned.`
      });
      setOpen(false);
      form.reset();
    } catch (error: any) {
      console.error(error);
      toast.error("Provisioning Failed", {
        description: error.message
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
            Register a new healthcare facility and provision its primary Director account.
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
                  <FormControl><Input placeholder="e.g., Korle Bu Heights" {...field} /></FormControl>
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
              name="directorPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Director Password</FormLabel>
                  <FormControl><Input type="password" placeholder="Set a strong password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="p-3 rounded-md bg-yellow-50 border border-yellow-200 flex gap-3">
                <ShieldAlert className="h-5 w-5 text-yellow-600 shrink-0" />
                <p className="text-xs text-yellow-700">
                    <strong>Note:</strong> In this prototype, creating a new Director will sign you out. You will need to log back in as CEO to continue platform management.
                </p>
            </div>

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
