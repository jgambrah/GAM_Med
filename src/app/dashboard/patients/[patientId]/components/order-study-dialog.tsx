
'use client';

import * as React from 'react';
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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Scan } from 'lucide-react';
import { NewRadOrderSchema } from '@/lib/schemas';
import { orderImagingStudy } from '@/lib/actions';
import { mockRadiologyStudies } from '@/lib/data';
import { Checkbox } from '@/components/ui/checkbox';

export function OrderStudyDialog({ patientId, disabled }: { patientId: string; disabled?: boolean }) {
  const [open, setOpen] = React.useState(false);

  const form = useForm<z.infer<typeof NewRadOrderSchema>>({
    resolver: zodResolver(NewRadOrderSchema),
    defaultValues: {
      studyIds: [],
      notes: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof NewRadOrderSchema>) => {
    const result = await orderImagingStudy(patientId, values);
    if (result.success) {
      alert('Imaging study ordered successfully (simulated).');
      setOpen(false);
      form.reset();
    } else {
      alert(`Error: ${result.message}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Scan className="h-4 w-4 mr-2" /> Order Imaging Study
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Order New Imaging Study</DialogTitle>
          <DialogDescription>
            Submit a new request to the radiology department.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="studyIds"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Available Studies</FormLabel>
                    <FormMessage />
                  </div>
                  <div className="space-y-2">
                    {mockRadiologyStudies.map((study) => (
                      <FormField
                        key={study.studyId}
                        control={form.control}
                        name="studyIds"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={study.studyId}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(study.studyId)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...(field.value || []), study.studyId])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== study.studyId
                                          )
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {study.name}
                              </FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Clinical Information / Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Patient has a pacemaker, check for metal implants." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Submitting...' : 'Submit Order'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
