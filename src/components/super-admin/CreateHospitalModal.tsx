'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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

export default function CreateHospitalModal({ initialData, onSuccess }: CreateHospitalModalProps) {
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<z.infer<typeof CreateHospitalSchema>>({
    resolver: zodResolver(CreateHospitalSchema),
    defaultValues: {
      hospitalName: '',
      directorName: '',
      directorEmail: '',
      subscriptionTier: 'clinic-starter',
    },
  });

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        hospitalName: initialData.hospitalName || '',
        directorName: initialData.name || '',
        directorEmail: initialData.email || '',
        subscriptionTier: 'clinic-starter',
      });
      setOpen(true);
    }
  }, [initialData, form]);

  const onSubmit = async (values: z.infer<typeof CreateHospitalSchema>) => {
    setIsSubmitting(true);
    
    // ENSURE THESE NAMES: name, email, directorName (Synchronized with Backend API)
    const payload = {
        name: values.hospitalName,         // The Hospital Name
        email: values.directorEmail,       // The Director's Email
        directorName: values.directorName  // The Director's Full Name
    };

    try {
      const response = await fetch('/api/admin/provision-hospital', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
          throw new Error(result.error || "Failed to provision facility");
      }

      toast.success("Hospital Provisioned Successfully!", {
        description: `${values.hospitalName} is now active.`
      });
      
      setOpen(false);
      form.reset();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Provisioning failed:", error);
      toast.error("Provisioning Error", { description: error.message });
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