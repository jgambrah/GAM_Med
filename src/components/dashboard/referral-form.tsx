
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Loader2, Upload } from "lucide-react";
import { processIncomingReferralAction } from "@/lib/actions";
import type { Referral } from "@/lib/types";

const referralFormSchema = z.object({
  patientName: z.string().min(2, "Patient name is required."),
  patientPhone: z.string().min(10, "A valid phone number is required."),
  reason: z.string().min(10, "Reason for referral is required."),
  referringFacility: z.string().min(3, "Referring facility is required."),
  referringDoctor: z.string().min(2, "Referring doctor is required."),
  department: z.string().min(3, "Department is required."),
  document: z.any().optional(),
});

type ReferralFormValues = z.infer<typeof referralFormSchema>;

interface ReferralFormProps {
  onFormSubmit: (newReferral: Referral) => void;
}

export function ReferralForm({ onFormSubmit }: ReferralFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);

  const form = useForm<ReferralFormValues>({
    resolver: zodResolver(referralFormSchema),
    defaultValues: {
      patientName: "",
      patientPhone: "",
      reason: "",
      referringFacility: "",
      referringDoctor: "",
      department: "Cardiology",
    },
  });

  async function onSubmit(data: ReferralFormValues) {
    setIsSubmitting(true);
    try {
      const result = await processIncomingReferralAction(data);
      if (result.success && result.referral) {
        toast({
          title: "Referral Created",
          description: result.message,
        });
        form.reset();
        setFileName(null);
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
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField
                        control={form.control}
                        name="patientName"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl><Input placeholder="Yaa Asantewaa" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="patientPhone"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl><Input placeholder="024-111-2233" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Reason for Referral</FormLabel>
                        <FormControl><Textarea placeholder="Describe the patient's condition and reason for referral..." {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </fieldset>

         <fieldset className="border p-4 rounded-md">
            <legend className="text-sm font-medium px-1">Referring Provider</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                 <FormField
                    control={form.control}
                    name="referringFacility"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Hospital / Clinic Name</FormLabel>
                        <FormControl><Input placeholder="Korle Bu Teaching Hospital" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="referringDoctor"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Doctor's Name</FormLabel>
                        <FormControl><Input placeholder="Dr. Smith" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </fieldset>

         <fieldset className="border p-4 rounded-md">
            <legend className="text-sm font-medium px-1">Referral Details</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="Cardiology">Cardiology</SelectItem>
                            <SelectItem value="Neurology">Neurology</SelectItem>
                            <SelectItem value="Oncology">Oncology</SelectItem>
                            <SelectItem value="Orthopedics">Orthopedics</SelectItem>
                            <SelectItem value="General Surgery">General Surgery</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                    control={form.control}
                    name="document"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Attach Document (Optional)</FormLabel>
                            <FormControl>
                                <>
                                    <Input 
                                        type="file" 
                                        className="hidden" 
                                        ref={fileInputRef}
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files.length > 0) {
                                                setFileName(e.target.files[0].name);
                                                field.onChange(e.target.files[0]);
                                            }
                                        }}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Upload className="mr-2 h-4 w-4" />
                                        Upload File
                                    </Button>
                                </>
                            </FormControl>
                            {fileName && <FormDescription>{fileName}</FormDescription>}
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </fieldset>
        
        <div className="pt-4">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Referral
            </Button>
        </div>
      </form>
    </Form>
  );
}
