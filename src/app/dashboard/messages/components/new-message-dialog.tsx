

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
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { allUsers } from '@/lib/data';
import { User, Message } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { Combobox } from '@/components/ui/combobox';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

const NewMessageSchema = z.object({
  recipientId: z.string().min(1, 'A recipient is required.'),
  messageBody: z.string().min(1, 'Message cannot be empty.'),
  attachment: z.any().optional(),
});

interface NewMessageDialogProps {
  onMessageSent: (newMessage: Message) => void;
}

const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export function NewMessageDialog({ onMessageSent }: NewMessageDialogProps) {
  const [open, setOpen] = React.useState(false);
  const { user } = useAuth();

  const form = useForm<z.infer<typeof NewMessageSchema>>({
    resolver: zodResolver(NewMessageSchema),
    defaultValues: {
      recipientId: '',
      messageBody: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof NewMessageSchema>) => {
    if (!user) {
      toast.error('You must be logged in to send a message.');
      return;
    }

    let attachmentUrl: string | undefined;
    let attachmentName: string | undefined;
    const file = values.attachment?.[0];

    if (file) {
      try {
        attachmentUrl = await fileToDataUrl(file);
        attachmentName = file.name;
      } catch (error) {
        console.error("Error converting file to Data URL:", error);
        toast.error("Failed to process the attachment. Please try again.");
        return;
      }
    }


    const newMessage: Message = {
      messageId: `msg-${Date.now()}`,
      senderId: user.uid,
      senderName: user.name,
      receiverId: values.recipientId,
      messageBody: values.messageBody,
      timestamp: new Date().toISOString(),
      isRead: false,
      attachmentUrl,
      attachmentName,
    };
    
    onMessageSent(newMessage);
    toast.success('Message Sent!');
    setOpen(false);
    form.reset();
  };

  const userOptions = allUsers
    .filter(u => u.uid !== user?.uid) // Can't message yourself
    .map(u => ({ label: `${u.name} (${u.role})`, value: u.uid }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Message
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Compose New Message</DialogTitle>
          <DialogDescription>
            Select a recipient and type your message below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="recipientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To:</FormLabel>
                   <Combobox
                      options={userOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select a recipient..."
                      searchPlaceholder="Search users..."
                      notFoundText="No user found."
                   />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="messageBody"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Type your message here..."
                      rows={5}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="attachment"
              render={({ field: { value, onChange, ...fieldProps } }) => (
                <FormItem>
                    <FormLabel>Attach Document (Optional)</FormLabel>
                    <FormControl>
                        <Input
                            {...fieldProps}
                            type="file"
                            onChange={(event) => {
                                onChange(event.target.files);
                            }}
                        />
                    </FormControl>
                    <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Sending...' : 'Send Message'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
