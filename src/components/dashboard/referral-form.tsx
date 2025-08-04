
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { createReferralAction } from "@/lib/actions";
import { Loader2 } from "lucide-react";

const referralFormSchema = z.object({
    patientFirstName: z.string().min(2, "First name is too short."),
    patientLastName: z.string().min(2, "Last name is too short."),
    patientDob: z.string().refine(val => !isNaN(Date.parse(val)) && val.length > 0, { message: "Please enter a valid date." }),
    patientPhone: z.string().min(10, "Phone number is too short."),
    referringProviderName: z.string().min(2, "Provider name is required."),
    referringProviderFacility: z.string().min(3, "Provider facility is required."),
    reasonForReferral: z.string().min(10, "Reason for referral is required."),
    urgency: z.enum(["Routine", "Urgent", "Emergency"]),
    notes: z.string().optional(),
});

type ReferralFormValues = z.infer<typeof referralFormSchema>;

interface ReferralFormProps {
    onFormSubmit: (message: string) => void;
}

export function ReferralForm({ onFormSubmit }: ReferralFormProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const form = useForm<ReferralFormValues>({
        resolver: zodResolver(referralFormSchema),
        defaultValues: {
            patientFirstName: "",
            patientLastName: "",
            patientDob: "",
            patientPhone: "",
            referringProviderName: "",
            referringProviderFacility: "",
            reasonForReferral: "",
            urgency: "Routine",
            notes: "",
        },
    });

    async function onSubmit(data: ReferralFormValues) {
        setIsSubmitting(true);
        try {
            const result = await createReferralAction(data);
            if (result.success) {
                form.reset();
                onFormSubmit(result.message);
            } else {
                toast({ variant: "destructive", title: "Submission Failed", description: result.message });
            }
        } catch (error) {
            toast({ variant: "destructive", title: "An Error Occurred", description: "Something went wrong. Please try again." });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
                <fieldset className="border p-4 rounded-md">
                    <legend className="text-sm font-medium px-1">Patient Details</legend>
                    <div className="space-y-4 mt-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="patientFirstName" render={({ field }) => (
                                <FormItem><FormLabel>First Name</FormLabel><FormControl><Input placeholder="Ama" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="patientLastName" render={({ field }) => (
                                <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input placeholder="Serwaa" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="patientDob" render={({ field }) => (
                                <FormItem><FormLabel>Date of Birth</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="patientPhone" render={({ field }) => (
                                <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="+233201234567" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                    </div>
                </fieldset>

                <fieldset className="border p-4 rounded-md">
                    <legend className="text-sm font-medium px-1">Referral Information</legend>
                    <div className="space-y-4 mt-2">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="referringProviderName" render={({ field }) => (
                                <FormItem><FormLabel>Referring Provider Name</FormLabel><FormControl><Input placeholder="Dr. Evelyn Amenya" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="referringProviderFacility" render={({ field }) => (
                                <FormItem><FormLabel>Referring Facility</FormLabel><FormControl><Input placeholder="Peace and Love Hospital" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                        <FormField control={form.control} name="reasonForReferral" render={({ field }) => (
                            <FormItem><FormLabel>Reason for Referral</FormLabel><FormControl><Textarea placeholder="Detailed clinical reason for the referral..." {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="urgency" render={({ field }) => (
                            <FormItem><FormLabel>Urgency</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select urgency level" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="Routine">Routine</SelectItem>
                                        <SelectItem value="Urgent">Urgent</SelectItem>
                                        <SelectItem value="Emergency">Emergency</SelectItem>
                                    </SelectContent>
                                </Select><FormMessage />
                            </FormItem>
                        )} />
                         <FormField control={form.control} name="notes" render={({ field }) => (
                            <FormItem><FormLabel>Additional Notes (Optional)</FormLabel><FormControl><Textarea placeholder="Any other relevant information..." {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                </fieldset>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Referral
                </Button>
            </form>
        </Form>
    );
}
