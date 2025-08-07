
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { processIncomingReferralAction } from "@/lib/actions";
import type { Referral } from "@/lib/types";

const referralFormSchema = z.object({
  patientFullName: z.string().min(2, "Patient name is required."),
  patientDob: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date." }),
  patientPhone: z.string().min(10, "Phone number is required."),
  referringFacility: z.string().min(3, "Referring facility is required."),
  reasonForReferral: z.string().min(10, "Reason for referral is required."),
  referredToDepartment: z.string().min(3, "Department is required."),
});

type ReferralFormValues = z.infer<typeof referralFormSchema>;

interface ReferralFormProps {
  onFormSubmit: (newReferral: Referral) => void;
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
      referringFacility: "",
      reasonForReferral: "",
      referredToDepartment: "Cardiology",
    },
  });

  async function onSubmit(data: ReferralFormValues) {
    setIsSubmitting(true);
    try {
      const result = await processIncomingReferralAction(data);
      if (result.success && result.referral) {
        toast({
          title: "Referral Created",
          description: `Referral for ${result.referral.patientDetails.fullName} has been added to the pending queue.`,
        });
        form.reset();
        onFormSubmit(result.referral);
      } else {
        toast({
          variant: "destructive",
          title: "Creation Failed",
          description: result.message,
        });
      }
    } catch (error) {
       toast({
          variant: "destructive",
          title: "An Error Occurred",
          description: "Something went wrong. Please try again.",
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-4">
        <fieldset className="border p-4 rounded-md">
            <legend className="text-sm font-medium px-1">Patient Details</legend>
            <div className="space-y-4 mt-2">
                <FormField
                    control={form.control}
                    name="patientFullName"
                    render={({ field }) => (
                        <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Ama Serwaa" {...field} /></FormControl><FormMessage /></FormItem>
                    )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="patientDob" render={({ field }) => (
                        <FormItem><FormLabel>Date of Birth</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="patientPhone" render={({ field }) => (
                        <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="0241234567" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
            </div>
        </fieldset>

        <fieldset className="border p-4 rounded-md">
            <legend className="text-sm font-medium px-1">Referral Information</legend>
            <div className="space-y-4 mt-2">
                <FormField
                    control={form.control}
                    name="referringFacility"
                    render={({ field }) => (
                        <FormItem><FormLabel>Referring Facility</FormLabel><FormControl><Input placeholder="e.g., Korle Bu Teaching Hospital" {...field} /></FormControl><FormMessage /></FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="reasonForReferral"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Reason for Referral</FormLabel>
                        <FormControl><Textarea placeholder="Describe the patient's condition and why they need a referral..." {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                control={form.control}
                name="referredToDepartment"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Refer To Department</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="Cardiology">Cardiology</SelectItem>
                            <SelectItem value="Neurology">Neurology</SelectItem>
                            <SelectItem value="Oncology">Oncology</SelectItem>
                            <SelectItem value="Orthopedics">Orthopedics</SelectItem>
                            <SelectItem value="General Surgery">General Surgery</SelectItem>
                            <SelectItem value="Other">Other (External)</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
        </fieldset>
        
        <div className="pt-4">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Referral
            </Button>
        </div>
      </form>
    </Form>
  );
}
