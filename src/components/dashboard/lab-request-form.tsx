
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
import type { Patient, LabResult } from "@/lib/types";
import { useAuth } from "../auth-provider";
import { orderLabTestAction } from "@/lib/actions";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


interface LabRequestFormProps {
  patient: Patient;
  onLabRequestAdded: (newLab: LabResult) => void;
}

const labRequestSchema = z.object({
  testName: z.string().min(3, "Test name is required."),
  reason: z.string().optional(),
});

type LabRequestFormValues = z.infer<typeof labRequestSchema>;

export function LabRequestForm({ patient, onLabRequestAdded }: LabRequestFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<LabRequestFormValues>({
    resolver: zodResolver(labRequestSchema),
  });

  const onSubmit = async (data: LabRequestFormValues) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "You must be logged in to order a lab test.",
      });
      return;
    }
    setIsSubmitting(true);
    const result = await orderLabTestAction({
        ...data,
        patientId: patient.patientId,
        orderedByDoctorId: user.id,
    });
    
    if (result.success && result.labResult) {
        toast({ title: "Lab Test Ordered", description: "The request has been sent to the lab." });
        onLabRequestAdded(result.labResult);
        form.reset();
    } else {
        toast({ variant: "destructive", title: "Failed to Order Test", description: result.message });
    }
    setIsSubmitting(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-1">
        <FormField
          control={form.control}
          name="testName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Test Name</FormLabel>
               <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a common lab test" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Complete Blood Count (CBC)">Complete Blood Count (CBC)</SelectItem>
                  <SelectItem value="Basic Metabolic Panel (BMP)">Basic Metabolic Panel (BMP)</SelectItem>
                  <SelectItem value="Lipid Panel">Lipid Panel</SelectItem>
                  <SelectItem value="Liver Function Tests (LFTs)">Liver Function Tests (LFTs)</SelectItem>
                  <SelectItem value="Urinalysis">Urinalysis</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason for Test (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="e.g., Routine check-up, rule out infection"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Order Test
        </Button>
      </form>
    </Form>
  );
}

    
