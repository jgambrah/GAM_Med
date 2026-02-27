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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Building2, Loader2, UserPlus, Tag } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CreateHospitalSchema = z.object({
  hospitalName: z.string().min(3, 'Hospital name must be at least 3 characters'),
  directorName: z.string().min(3, 'Director full name is required'),
  directorEmail: z.string().email('Invalid email address'),
  prefix: z.string().min(2, 'Prefix must be 2-4 characters').max(4, 'Prefix must be 2-4 characters').toUpperCase(),
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
      prefix: '',
      subscriptionTier: 'clinic-starter',
    },
  });

  React.useEffect(() => {
    if (initialData) {
      // Auto-generate a prefix based on the name if possible
      const words = initialData.hospitalName.split(' ');
      const autoPrefix = words.length > 1 
        ? (words[0][0] + words[1][0] + (words[2] ? words[2][0] : '')).toUpperCase()
        : initialData.hospitalName.slice(0, 3).toUpperCase();

      form.reset({
        hospitalName: initialData.hospitalName || '',
        directorName: initialData.name || '',
        directorEmail: initialData.email || '',
        prefix: autoPrefix,
        subscriptionTier: 'clinic-starter',
      });
      setOpen(true);
    }
  }, [initialData, form]);

  const onSubmit = async (values: z.infer<typeof CreateHospitalSchema>) => {
    setIsSubmitting(true);
    
    const payload = {
        name: values.hospitalName,         
        email: values.directorEmail,       
        directorName: values.directorName,
        prefix: values.prefix.toUpperCase() // THE "BRANDING" STAMP
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

      alert(`
        HOSPITAL CREATED SUCCESSFULLY!
        ------------------------------
        Director: ${values.directorName}
        Email: ${values.directorEmail}
        MRN Prefix: ${values.prefix}
        Temporary Password: ${result.tempPassword} 
        
        (Please copy this password and send it to the director in case the email is delayed).
      `);

      toast.success("Hospital Provisioned Successfully!", {
        description: `${values.hospitalName} is now active with prefix ${values.prefix}.`
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="prefix"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="flex items-center gap-2">
                            <Tag className="h-3 w-3" />
                            MRN Prefix
                        </FormLabel>
                        <FormControl><Input placeholder="e.g. AGH" {...field} /></FormControl>
                        <FormDescription className="text-[10px]">Used for sequential IDs (e.g. AGH-1001)</FormDescription>
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
            </div>
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
