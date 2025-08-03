
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Button } from "@/components/ui/button";
import type { Patient } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { finalizeDischargeSummaryAction } from "@/lib/actions";
import { useAuth } from "../auth-provider";
import { Loader2 } from "lucide-react";
import { allAdmissions } from "@/lib/data";
import { RichTextEditor } from "../ui/rich-text-editor";
import { Textarea } from "../ui/textarea";


interface DischargeSummaryFormProps {
  patient: Patient;
}

const dischargeFormSchema = z.object({
  diagnosisOnDischarge: z.string().min(3, "Diagnosis is required."),
  conditionAtDischarge: z.string().min(3, "Condition is required."),
  treatmentProvided: z.string().min(10, "Treatment summary is required."),
  medicationAtDischarge: z.string().min(3, "Medication is required."),
  followUpInstructions: z.string().min(10, "Follow-up instructions are required."),
});

type DischargeFormValues = z.infer<typeof dischargeFormSchema>;

export function DischargeSummaryForm({ patient }: DischargeSummaryFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<DischargeFormValues>({
    resolver: zodResolver(dischargeFormSchema),
    defaultValues: {
        diagnosisOnDischarge: "",
        conditionAtDischarge: "",
        treatmentProvided: "",
        medicationAtDischarge: "",
        followUpInstructions: "",
    },
  });

  const admission = allAdmissions.find(a => a.admissionId === patient.currentAdmissionId);

  // Decouple Rich Text Editors from React Hook Form's Controller
  const [treatmentProvided, setTreatmentProvided] = useState('');
  const [followUpInstructions, setFollowUpInstructions] = useState('');

  useEffect(() => {
    form.setValue('treatmentProvided', treatmentProvided, { shouldValidate: true, shouldDirty: true });
  }, [treatmentProvided, form]);

  useEffect(() => {
    form.setValue('followUpInstructions', followUpInstructions, { shouldValidate: true, shouldDirty: true });
  }, [followUpInstructions, form]);


  const handleFinalizeDischarge = async (data: DischargeFormValues) => {
    if (!patient.currentAdmissionId || !user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Required patient or user information is missing.",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const summaryData = {
        diagnosisOnDischarge: data.diagnosisOnDischarge,
        treatmentProvided: data.treatmentProvided,
        conditionAtDischarge: data.conditionAtDischarge,
        medicationAtDischarge: data.medicationAtDischarge
          .split(",")
          .map((name) => ({
            name: name.trim(),
            dosage: "As prescribed",
            instructions: "As instructed",
          })),
        followUpInstructions: data.followUpInstructions,
      };
      const result = await finalizeDischargeSummaryAction(
        patient.currentAdmissionId,
        summaryData,
        user.id
      );
      if (result.success) {
        toast({
          title: "Summary Finalized",
          description: result.message,
        });
        router.push("/admin/patients");
      } else {
        toast({
          variant: "destructive",
          title: "Finalization Failed",
          description: result.message,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFinalizeDischarge)}>
          <CardHeader>
            <CardTitle className="font-headline text-2xl">
              Discharge Summary: {patient.fullName}
            </CardTitle>
            <CardDescription>
              Complete the clinical summary below. Once finalized, it will be sent
              for financial clearance before the patient can be officially
              discharged. Patient admitted on {admission ? new Date(admission.admissionDate).toLocaleDateString() : 'N/A'} for "{admission?.reasonForVisit}".
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="diagnosisOnDischarge"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Diagnosis at Discharge</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Acute Myocardial Infarction" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="conditionAtDischarge"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Condition at Discharge</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Stable">Stable</SelectItem>
                      <SelectItem value="Improved">Improved</SelectItem>
                      <SelectItem value="Unchanged">Unchanged</SelectItem>
                      <SelectItem value="Referred">Referred</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
                <FormLabel>Summary of Treatment</FormLabel>
                <FormControl>
                    <RichTextEditor
                    placeholder="Patient responded well to thrombolytic therapy..."
                    value={treatmentProvided}
                    onChange={setTreatmentProvided}
                    />
                </FormControl>
                <FormMessage>{form.formState.errors.treatmentProvided?.message}</FormMessage>
            </FormItem>

            
            <FormField
              control={form.control}
              name="medicationAtDischarge"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Medications on Discharge (comma-separated)</FormLabel>
                  <FormControl>
                    <Textarea
                      id="medications"
                      placeholder="Aspirin 81mg, Lisinopril 10mg"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             
            <FormItem>
                <FormLabel>Follow-up Instructions</FormLabel>
                <FormControl>
                    <RichTextEditor
                    placeholder="Follow up with specialist in 2 weeks. Monitor blood pressure daily."
                    value={followUpInstructions}
                    onChange={setFollowUpInstructions}
                    />
                </FormControl>
                <FormMessage>{form.formState.errors.followUpInstructions?.message}</FormMessage>
            </FormItem>

          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Finalize Summary & Request Financial Clearance
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
