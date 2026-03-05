'use client';

import * as React from 'react';
import { useState } from 'react';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Zap } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const formSchema = z.object({
  hospitalName: z.string().min(3, { message: 'Hospital name is required.' }),
  contactName: z.string().min(3, { message: 'Your name is required.' }),
  email: z.string().email({ message: 'A valid email is required.' }),
  phone: z.string().optional(),
  mrnPrefix: z.string().min(2, {message: 'Prefix must be 2-4 characters.'}).max(4, {message: 'Prefix cannot be more than 4 characters.'}).transform(val => val.toUpperCase()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function RequestDemoDialog() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      hospitalName: '',
      contactName: '',
      email: '',
      phone: '',
      mrnPrefix: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!firestore) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Database connection not available. Please try again later.",
        });
        return;
    }
    setIsLoading(true);
    
    const leadsRef = collection(firestore, 'leads');
    const newLead = {
        ...values,
        status: 'new',
        createdAt: serverTimestamp(),
    };

    try {
        await addDocumentNonBlocking(leadsRef, newLead);
        toast({
            title: "Request Sent!",
            description: "Dr. Gambrah's team will contact you shortly for a demo.",
        });
        setOpen(false);
        form.reset();
    } catch (error) {
         toast({
            variant: "destructive",
            title: "Submission Failed",
            description: "Could not submit your request. Please try again.",
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-primary hover:underline">
          Request a Demo
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black tracking-tighter uppercase">Request a Demo</DialogTitle>
          <DialogDescription>
            Join the GamMed network. Tell us about your facility.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField
                    control={form.control}
                    name="hospitalName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Hospital Name</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g. Accra Central Hospital" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="contactName"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Your Name</FormLabel>
                            <FormControl>
                                <Input placeholder="Dr. Kwame" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="mrnPrefix"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>ID Prefix</FormLabel>
                            <FormControl>
                                <Input placeholder="GMC" maxLength={4} {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Work Email</FormLabel>
                        <FormControl>
                            <Input type="email" placeholder="kwame@facility.com" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Phone (Optional)</FormLabel>
                        <FormControl>
                            <Input type="tel" placeholder="+233..." {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <DialogFooter>
                    <Button type="submit" className="w-full bg-blue-600 font-bold h-12" disabled={isLoading}>
                        {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Zap className="mr-2 h-4 w-4" />}
                        Send Demo Request
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
