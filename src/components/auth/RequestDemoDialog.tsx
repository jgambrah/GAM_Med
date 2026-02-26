
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
    Form, 
    FormControl, 
    FormField, 
    FormItem, 
    FormLabel, 
    FormMessage 
} from '@/components/ui/form';
import { toast } from "@/hooks/use-toast";
import { Loader2, Send } from 'lucide-react';

const DemoRequestSchema = z.object({
    name: z.string().min(3, "Please enter your full name"),
    hospital: z.string().min(3, "Please enter the facility name"),
    email: z.string().email("Invalid work email address"),
    phone: z.string().min(10, "Please enter a valid phone number"),
});

/**
 * == SaaS Lead Generation: Demo Request Dialog ==
 * 
 * This component collects potential client details and submits them to the
 * secure public API route for processing.
 */
export function RequestDemoDialog() {
    const [open, setOpen] = React.useState(false);

    const form = useForm<z.infer<typeof DemoRequestSchema>>({
        resolver: zodResolver(DemoRequestSchema),
        defaultValues: {
            name: '',
            hospital: '',
            email: '',
            phone: '',
        },
    });

    const onSubmit = async (values: z.infer<typeof DemoRequestSchema>) => {
        try {
            const res = await fetch('/api/public/request-demo', {
                method: 'POST',
                body: JSON.stringify(values),
                headers: { 'Content-Type': 'application/json' }
            });

            if (res.ok) {
                toast.success("Request Sent!", {
                    description: "Dr. Gambrah will contact you shortly to schedule your demo."
                });
                setOpen(false);
                form.reset();
            } else {
                throw new Error("Failed to send request");
            }
        } catch (err) {
            toast.error("Process Failed", {
                description: "Something went wrong. Please try again or contact us directly."
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50 font-bold shadow-sm">
                    Request for Demo
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-2 text-blue-600">
                        <Send className="h-5 w-5" />
                        <DialogTitle>Schedule a GamMed Demo</DialogTitle>
                    </div>
                    <DialogDescription>
                        Enter your professional details and our team will reach out to showcase the platform for your facility.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold uppercase">Full Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Dr. John Doe" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="hospital"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold uppercase">Hospital / Clinic Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="City Medical Center" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold uppercase">Work Email</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="name@hospital.com" {...field} />
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
                                    <FormLabel className="text-xs font-bold uppercase">Phone Number</FormLabel>
                                    <FormControl>
                                        <Input type="tel" placeholder="+233..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button 
                            type="submit" 
                            className="w-full bg-blue-600 hover:bg-blue-700 font-bold h-11" 
                            disabled={form.formState.isSubmitting}
                        >
                            {form.formState.isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Sending...
                                </>
                            ) : "Submit Request"}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
