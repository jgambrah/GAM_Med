
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
import { Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { mockTrainingCourses } from '@/lib/data';
import { LogTrainingSchema } from '@/lib/schemas';

interface LogTrainingDialogProps {
  onTrainingLogged: (newRecord: any) => void;
}

export function LogTrainingDialog({ onTrainingLogged }: LogTrainingDialogProps) {
  const [open, setOpen] = React.useState(false);
  
  const form = useForm<z.infer<typeof LogTrainingSchema>>({
    resolver: zodResolver(LogTrainingSchema),
    defaultValues: {
      courseId: '',
      completionDate: new Date().toISOString().split('T')[0],
    },
  });

  const onSubmit = (values: z.infer<typeof LogTrainingSchema>) => {
    const course = mockTrainingCourses.find(c => c.courseId === values.courseId);
    if (!course) {
      toast.error('Selected course not found.');
      return;
    }
    
    const newRecord = {
      trainingId: course.courseId,
      courseName: course.courseName,
      completionDate: values.completionDate,
      provider: course.provider,
    };

    onTrainingLogged(newRecord);
    toast.success('Training has been logged to the staff profile.');
    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="mr-2 h-4 w-4" /> Log Training
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Completed Training</DialogTitle>
          <DialogDescription>
            Add a completed training course or certification to this staff member's record.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="courseId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a course..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {mockTrainingCourses.map(course => (
                        <SelectItem key={course.courseId} value={course.courseId}>
                          {course.courseName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="completionDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Completion Date</FormLabel>
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
                {form.formState.isSubmitting ? 'Logging...' : 'Log Training'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
