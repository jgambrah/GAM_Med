
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Referral, User } from "@/lib/types";
import { assignDoctorToReferralAction } from "@/lib/actions";
import { Loader2 } from "lucide-react";

interface AssignDoctorDialogProps {
  referral: Referral;
  doctors: User[];
  onAssignment: (updatedReferral: Referral) => void;
}

const assignDoctorSchema = z.object({
  doctorId: z.string().min(1, "You must select a doctor."),
});

type AssignDoctorFormValues = z.infer<typeof assignDoctorSchema>;

export function AssignDoctorDialog({ referral, doctors, onAssignment }: AssignDoctorDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<AssignDoctorFormValues>({
    resolver: zodResolver(assignDoctorSchema),
  });

  const onSubmit = async (data: AssignDoctorFormValues) => {
    setIsSubmitting(true);
    const result = await assignDoctorToReferralAction({
      referralId: referral.referralId,
      doctorId: data.doctorId,
    });

    if (result.success && result.referral) {
        toast({
            title: "Referral Assigned",
            description: `Referral for ${result.referral.patientDetails.fullName} has been assigned to Dr. ${result.referral.doctorName}.`
        })
        onAssignment(result.referral);
    } else {
        toast({
            variant: "destructive",
            title: "Assignment Failed",
            description: result.message
        });
    }
    setIsSubmitting(false);
  };

  return (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="doctorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign to Doctor</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a doctor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {doctors.map(doc => (
                        <SelectItem key={doc.id} value={doc.id}>{doc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign Referral
            </Button>
        </form>
    </Form>
  );
}
