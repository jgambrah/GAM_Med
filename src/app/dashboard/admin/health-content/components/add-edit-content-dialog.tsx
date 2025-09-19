
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { HealthContent } from '@/lib/types';

const ContentSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters.'),
  body: z.string().min(20, 'Body must be at least 20 characters.'),
  keywords: z.string().min(3, 'At least one keyword is required.'),
  fileUrl: z.string().url().optional().or(z.literal('')),
});

interface AddEditContentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  content: HealthContent | null;
  onSave: (content: HealthContent) => void;
}

export function AddEditContentDialog({ isOpen, onOpenChange, content, onSave }: AddEditContentDialogProps) {
  const isEditing = !!content;

  const form = useForm<z.infer<typeof ContentSchema>>({
    resolver: zodResolver(ContentSchema),
    defaultValues: {
      title: content?.title || '',
      body: content?.body || '',
      keywords: content?.keywords.join(', ') || '',
      fileUrl: content?.fileUrl || '',
    },
  });

  const onSubmit = (values: z.infer<typeof ContentSchema>) => {
    // In a real app, this would call a server action.
    const newContent: HealthContent = {
      contentId: content?.contentId || `hc-${Date.now()}`,
      ...values,
      keywords: values.keywords.split(',').map(kw => kw.trim()).filter(Boolean),
    };
    
    onSave(newContent);
    toast.success(`Content has been successfully ${isEditing ? 'updated' : 'created'}.`);
    onOpenChange(false);
  };
  
  React.useEffect(() => {
    if(isOpen) {
      form.reset({
        title: content?.title || '',
        body: content?.body || '',
        keywords: content?.keywords.join(', ') || '',
        fileUrl: content?.fileUrl || '',
      });
    }
  }, [isOpen, content, form]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Health Article' : 'Add New Health Article'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the details for this article.' : 'Create a new article for the health library.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Managing Your Hypertension" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Body Content</FormLabel>
                  <FormControl>
                    <Textarea rows={10} placeholder="Enter the full article text..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="keywords"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Keywords</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., hypertension, blood pressure, diet" {...field} />
                  </FormControl>
                   <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="fileUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PDF/File URL (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/guide.pdf" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Save Article'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
