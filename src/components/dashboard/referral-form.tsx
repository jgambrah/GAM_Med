

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
import { Loader2, Upload } from "lucide-react";

const referralFormSchema = z.object({
    patientFullName: z.string().min(2, "Full name is too short."),
    patientDob: z.string().refine(val => !isNaN(Date.parse(val)) && val.length > 0, { message: "Please enter a valid date." }),
    patientPhone: z.string().min(10, "Phone number is too short."),
    referringProviderName: z.string().min(2, "Provider name is required."),
    referredToDepartment: z.string().min(3, "Department is required."),
    reasonForReferral: z.string().min(10, "Reason for referral is required."),
    notes: z.string().optional(),
    scannedDocument: z.any().optional(),
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
            patientFullName: "",
            patientDob: "",
            patientPhone: "",
            referringProviderName: "",
            referredToDepartment: "",
            reasonForReferral: "",
            notes: "",
        },
    });

    async function onSubmit(data: ReferralFormValues) {
        setIsSubmitting(true);
        try {
            // In a real app, you would handle the file upload here.
            // For now, we'll just log the file name if it exists.
            if (data.scannedDocument && data.scannedDocument.length > 0) {
                console.log("Simulating upload for:", data.scannedDocument[0].name);
            }
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
                        <FormField control={form.control} name="patientFullName" render={({ field }) => (
                            <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Ama Serwaa" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
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
                        <FormField control={form.control} name="referringProviderName" render={({ field }) => (
                            <FormItem><FormLabel>Referring Facility Name</FormLabel><FormControl><Input placeholder="Peace and Love Hospital" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="referredToDepartment" render={({ field }) => (
                            <FormItem><FormLabel>Department</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a department" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="Cardiology">Cardiology</SelectItem>
                                        <SelectItem value="Neurology">Neurology</SelectItem>
                                        <SelectItem value="Oncology">Oncology</SelectItem>
                                        <SelectItem value="Orthopedics">Orthopedics</SelectItem>
                                        <SelectItem value="General Surgery">General Surgery</SelectItem>
                                    </SelectContent>
                                </Select><FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="reasonForReferral" render={({ field }) => (
                            <FormItem><FormLabel>Reason for Referral</FormLabel><FormControl><Textarea placeholder="Detailed clinical reason for the referral..." {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                         <FormField control={form.control} name="notes" render={({ field }) => (
                            <FormItem><FormLabel>Additional Notes (Optional)</FormLabel><FormControl><Textarea placeholder="Any other relevant information..." {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                          <FormField control={form.control} name="scannedDocument" render={({ field }) => (
                            <FormItem><FormLabel>Scanned Referral Letter (PDF, JPG)</FormLabel>
                            <FormControl>
                                <div className="relative">
                                    <Upload className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input type="file" className="pl-10" onChange={(e) => field.onChange(e.target.files)} />
                                </div>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
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

    