
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
import type { Patient, Referral, User } from "@/lib/types";
import { useAuth } from "../auth-provider";

const referralFormSchema = z.object({
  reason: z.string().min(10, "Reason for referral is required."),
  referredToDepartment: z.string().min(3, "Department is required."),
  referredToFacility: z.string().optional(),
});

type ReferralFormValues = z.infer<typeof referralFormSchema>;

interface DoctorReferralFormProps {
  patient: Patient;
  onFormSubmit: (newReferral: Referral) => void;
}

export function DoctorReferralForm({ patient, onFormSubmit }: DoctorReferralFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<ReferralFormValues>({
    resolver: zodResolver(referralFormSchema),
    defaultValues: {
      reason: "",
      referredToDepartment: "Cardiology",
      referredToFacility: "MedFlow GH (Internal)",
    },
  });

  async function onSubmit(data: ReferralFormValues) {
    if (!user) {
        toast({ variant: "destructive", title: "Authentication Error", description: "Could not identify the referring doctor."});
        return;
    }
    setIsSubmitting(true);
    try {
      const referralData = {
          patientName: patient.fullName,
          patientPhone: patient.contact.primaryPhone,
          reason: data.reason,
          referringFacility: "MedFlow GH",
          referringDoctor: user.name,
          department: data.referredToDepartment
      };

      const result = await processIncomingReferralAction(referralData);
      if (result.success && result.referral) {
        toast({
          title: "Referral Created",
          description: `Referral for ${patient.fullName} has been sent to the admin team for processing.`,
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
        
        <div>
            <h3 className="font-medium">Referring Patient: {patient.fullName}</h3>
            <p className="text-sm text-muted-foreground">Patient ID: {patient.patientId}</p>
        </div>

        <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Reason for Referral</FormLabel>
                <FormControl><Textarea placeholder="Describe the patient's condition and why they need a referral..." {...field} /></FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
             <FormField
                control={form.control}
                name="referredToFacility"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Destination Facility</FormLabel>
                    <FormControl><Input placeholder="e.g., Korle Bu Hospital" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        
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
