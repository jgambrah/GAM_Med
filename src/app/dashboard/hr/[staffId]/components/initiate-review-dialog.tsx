
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { allUsers } from '@/lib/data';
import { Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { PerformanceReview } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';

const InitiateReviewSchema = z.object({
  reviewerId: z.string().min(1, 'A reviewer must be selected.'),
  ratingPeriodStart: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "A valid start date is required." }),
  ratingPeriodEnd: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "A valid end date is required." }),
  nextReviewDate: z.string().optional(),
}).refine(data => new Date(data.ratingPeriodEnd) > new Date(data.ratingPeriodStart), {
    message: "End date must be after start date.",
    path: ["ratingPeriodEnd"],
});

interface InitiateReviewDialogProps {
  staffId: string;
  onReviewInitiated: (newReview: PerformanceReview) => void;
}

export function InitiateReviewDialog({ staffId, onReviewInitiated }: InitiateReviewDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = React.useState(false);
  
  const form = useForm<z.infer<typeof InitiateReviewSchema>>({
    resolver: zodResolver(InitiateReviewSchema),
    defaultValues: {
      reviewerId: '',
      ratingPeriodStart: '',
      ratingPeriodEnd: '',
      nextReviewDate: '',
    },
  });

  const reviewerOptions = allUsers
    .filter(u => u.role === 'admin' || u.role === 'doctor') // Example: only admins and doctors can be reviewers
    .map(u => ({ label: u.name, value: u.uid }));

  const onSubmit = (values: z.infer<typeof InitiateReviewSchema>) => {
    // In a real app, this would call a server action.
    const newReview: PerformanceReview = {
      reviewId: `rev-${Date.now()}`,
      hospitalId: user?.hospitalId || '',
      employeeId: staffId || '',
      reviewerId: values.reviewerId,
      dateOfReview: new Date().toISOString(),
      ratingPeriodStart: new Date(values.ratingPeriodStart).toISOString(),
      ratingPeriodEnd: new Date(values.ratingPeriodEnd).toISOString(),
      overallRating: 'Pending',
      strengths: '',
      areasForDevelopment: '',
      goalsAchieved: [],
      trainingRecommendations: '',
      nextReviewDate: values.nextReviewDate || '',
    };
    onReviewInitiated(newReview);
    toast.success('Performance review has been initiated.');
    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="mr-2 h-4 w-4" /> Initiate Review
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Initiate New Performance Review</DialogTitle>
          <DialogDescription>
            Select a reviewer and the rating period for this appraisal.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="reviewerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reviewer</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a reviewer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {reviewerOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ratingPeriodStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rating Period Start</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ratingPeriodEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rating Period End</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="nextReviewDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scheduled Next Review (Optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Initiating...' : 'Initiate Review'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
