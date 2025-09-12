
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { mockResources } from '@/lib/data';
import { Plus } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

const MaintenanceRequestSchema = z.object({
  assetId: z.string().optional(),
  description: z.string().min(10, 'Description must be at least 10 characters.'),
  priority: z.enum(['High', 'Medium', 'Low']),
});

export function AddMaintenanceRequestDialog() {
  const [open, setOpen] = React.useState(false);
  
  const form = useForm<z.infer<typeof MaintenanceRequestSchema>>({
    resolver: zodResolver(MaintenanceRequestSchema),
    defaultValues: {
      assetId: '',
      description: '',
      priority: 'Medium',
    },
  });

  const onSubmit = (values: z.infer<typeof MaintenanceRequestSchema>) => {
    // In a real app, this would call a server action to create a new work order.
    console.log('Submitting new work order:', values);
    toast.success('Work Order Submitted', {
      description: 'Your request has been sent to the facilities management team.',
    });
    setOpen(false);
    form.reset();
  };

  const equipmentOptions = mockResources.map(r => ({ label: `${r.name} (${r.department})`, value: r.assetId }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" /> Report Issue
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit Work Order</DialogTitle>
          <DialogDescription>
            Report an issue with a piece of equipment or a facility area.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
             <FormField
                control={form.control}
                name="assetId"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Equipment / Asset (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an asset if applicable" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {equipmentOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Description of Issue</FormLabel>
                        <FormControl>
                            <Textarea placeholder="e.g., The MRI machine is making a loud grinding noise." {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a priority level" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="Low">Low (e.g., cosmetic issue)</SelectItem>
                                <SelectItem value="Medium">Medium (e.g., routine repair)</SelectItem>
                                <SelectItem value="High">High (e.g., impacts patient care)</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
