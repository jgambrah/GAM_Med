
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
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
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useAuth } from '@/hooks/use-auth';

const SecurityIncidentSchema = z.object({
  hospitalId: z.string().min(1),
  type: z.enum(['Unauthorized Access', 'Theft', 'Dispute', 'Violence', 'Other']),
  location: z.string().min(3, 'Location is required.'),
  details: z.string().min(10, 'Details must be at least 10 characters.'),
});

export function AddSecurityIncidentDialog() {
  const { user } = useAuth();
  const [open, setOpen] = React.useState(false);

  const form = useForm<z.infer<typeof SecurityIncidentSchema>>({
    defaultValues: {
      hospitalId: user?.hospitalId || '',
      type: 'Dispute',
      location: '',
      details: '',
    },
  });

  React.useEffect(() => {
    if (open && user) {
        form.setValue('hospitalId', user.hospitalId);
    }
  }, [open, user, form]);

  const onSubmit = (values: z.infer<typeof SecurityIncidentSchema>) => {
    console.log('Submitting new security incident for hospital:', values.hospitalId, values);
    toast.success('Incident Reported', {
      description: 'The security incident has been logged.',
    });
    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" /> Report Incident
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report New Security Incident</DialogTitle>
          <DialogDescription>
            Log a new security event for your facility.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
             <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Incident Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an incident type" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="Unauthorized Access">Unauthorized Access</SelectItem>
                                <SelectItem value="Theft">Theft</SelectItem>
                                <SelectItem value="Dispute">Dispute</SelectItem>
                                <SelectItem value="Violence">Violence</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., Parking Lot B, Ward A" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="details"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Details of Incident</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Provide a detailed account of the incident..." {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Logging...' : 'Log Incident'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
