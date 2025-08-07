
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { Patient, MedicationHistory } from "@/lib/types";
import { useAuth } from "../auth-provider";
import { prescribeMedicationAction } from "@/lib/actions";
import { Loader2 } from "lucide-react";

interface MedicationFormProps {
  patient: Patient;
  onMedicationAdded: (newMed: MedicationHistory) => void;
}

const medicationSchema = z.object({
  medicationName: z.string().min(2, "Medication name is required."),
  dosage: z.string().min(1, "Dosage is required."),
  frequency: z.string().min(2, "Frequency is required."),
  instructions: z.string().optional(),
});

type MedicationFormValues = z.infer<typeof medicationSchema>;

export function MedicationForm({ patient, onMedicationAdded }: MedicationFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<MedicationFormValues>({
    resolver: zodResolver(medicationSchema),
    defaultValues: {
      medicationName: "",
      dosage: "",
      frequency: "",
      instructions: "",
    },
  });

  const onSubmit = async (data: MedicationFormValues) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "You must be logged in to prescribe medication.",
      });
      return;
    }
    setIsSubmitting(true);
    const result = await prescribeMedicationAction({
        ...data,
        patientId: patient.patientId,
        prescribedByDoctorId: user.id,
    });
    
    if (result.success && result.medication) {
        toast({ title: "Medication Prescribed", description: "The prescription has been added to the patient's record." });
        onMedicationAdded(result.medication);
        form.reset();
    } else {
        toast({ variant: "destructive", title: "Failed to Prescribe", description: result.message });
    }
    setIsSubmitting(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-1">
        <FormField
          control={form.control}
          name="medicationName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Medication Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Lisinopril" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="dosage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dosage</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 10mg" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequency</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Once daily" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
        <FormField
          control={form.control}
          name="instructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Instructions (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="e.g., Take with food in the morning."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Prescribe Medication
        </Button>
      </form>
    </Form>
  );
}

    
