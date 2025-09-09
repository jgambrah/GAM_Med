
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { OTSession } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';

const PostOpSchema = z.object({
  postOpNotes: z.string().min(20, 'Post-operative notes must be at least 20 characters.'),
});

interface PostOpCareTabProps {
  surgery?: OTSession;
}

export function PostOpCareTab({ surgery }: PostOpCareTabProps) {
  const { user } = useAuth();
  
  const form = useForm<z.infer<typeof PostOpSchema>>({
    resolver: zodResolver(PostOpSchema),
    defaultValues: {
      postOpNotes: '',
    },
  });

  if (!surgery) {
    return (
        <Card>
            <CardContent className="h-48 flex items-center justify-center">
                <p className="text-muted-foreground">This patient has no upcoming or recent surgery scheduled.</p>
            </CardContent>
        </Card>
    );
  }

  // Only allow post-op notes after the surgery is completed
  if (surgery.status !== 'Completed' && surgery.status !== 'Post-Op') {
     return (
        <Card>
            <CardHeader>
                <CardTitle>Post-Operative Care Plan</CardTitle>
                <CardDescription>
                  For upcoming procedure: <strong>{surgery.procedureName}</strong> scheduled on {' '}
                  <strong>{format(new Date(surgery.startTime), 'PPP p')}</strong>.
                </CardDescription>
            </CardHeader>
            <CardContent className="h-48 flex items-center justify-center">
                <p className="text-muted-foreground">The post-operative care plan can be created after the surgery is completed.</p>
            </CardContent>
        </Card>
    );
  }

  const onSubmit = async (values: z.infer<typeof PostOpSchema>) => {
    // In a real app, this would call the `generatePostOpPlan` Cloud Function
    console.log(`Submitting post-op plan for case ${surgery.sessionId}:`, values);
    toast.success('Post-operative plan has been created and sent to the nursing team.');
    // Optionally, disable the form after submission.
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Post-Operative Care Plan</CardTitle>
        <CardDescription>
          For procedure: <strong>{surgery.procedureName}</strong> completed on {' '}
          <strong>{format(new Date(surgery.startTime), 'PPP p')}</strong>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="postOpNotes"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Post-Operative Orders & Notes</FormLabel>
                            <FormControl>
                                <Textarea 
                                    rows={10} 
                                    placeholder="Enter all post-operative instructions for the nursing team, e.g., vital signs frequency, wound care, medication, mobility restrictions, etc." 
                                    {...field} 
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="flex justify-end">
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? 'Submitting...' : 'Finalize & Send Post-Op Plan'}
                    </Button>
                </div>
            </form>
        </Form>
      </CardContent>
    </Card>
  );
}
