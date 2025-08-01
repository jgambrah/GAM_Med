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
import { admitPatientAction } from "@/lib/actions";
import { allBeds, allUsers } from "@/lib/data";
import type { Patient } from "@/lib/types";
import { Loader2 } from "lucide-react";

const admissionFormSchema = z.object({
  patientId: z.string(),
  reasonForAdmission: z.string().min(3, "Reason is too short."),
  ward: z.string().min(3, "Ward is required."),
  bedId: z.string().min(1, "Bed selection is required."),
  attendingDoctorId: z.string().min(1, "Doctor selection is required."),
});

type AdmissionFormValues = z.infer<typeof admissionFormSchema>;

interface PatientAdmissionFormProps {
  patient: Patient;
  onFormSubmit: () => void;
}

export function PatientAdmissionForm({ patient, onFormSubmit }: PatientAdmissionFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const availableBeds = allBeds.filter(b => b.status === "vacant");
  const doctors = allUsers.filter(u => u.role === "Doctor");
  const wards = [...new Set(availableBeds.map(b => b.wardName))];
  
  const form = useForm<AdmissionFormValues>({
    resolver: zodResolver(admissionFormSchema),
    defaultValues: {
      patientId: patient.patientId,
      reasonForAdmission: "",
      ward: "",
      bedId: "",
      attendingDoctorId: "",
    },
  });
  
  const selectedWard = form.watch("ward");

  async function onSubmit(data: AdmissionFormValues) {
    setIsSubmitting(true);
    try {
      const result = await admitPatientAction(data);

      if (result.success) {
        onFormSubmit(); // This will show the toast and close the dialog
      } else {
        toast({
          variant: "destructive",
          title: "Admission Failed",
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
         <FormField
            control={form.control}
            name="reasonForAdmission"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Reason for Admission</FormLabel>
                <FormControl>
                    <Textarea placeholder="e.g., Post-operative observation" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="ward"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ward</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a ward" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {wards.map(ward => (
                        <SelectItem key={ward} value={ward}>{ward}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bedId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bed</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedWard}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a bed" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableBeds
                        .filter(b => b.wardName === selectedWard)
                        .map(bed => (
                          <SelectItem key={bed.bedId} value={bed.bedId}>{bed.bedId} ({bed.roomNumber})</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
        <FormField
            control={form.control}
            name="attendingDoctorId"
            render={({ field }) => (
            <FormItem>
                <FormLabel>Attending Doctor</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                    <SelectTrigger>
                    <SelectValue placeholder="Assign a doctor" />
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
            Admit Patient
        </Button>
      </form>
    </Form>
  );
}
