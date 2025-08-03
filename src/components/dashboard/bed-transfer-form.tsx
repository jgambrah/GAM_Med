
"use client"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { transferPatientBedAction } from "@/lib/actions";
import { allBeds } from "@/lib/data";
import type { Bed, Patient } from "@/lib/types";
import { Loader2 } from "lucide-react";

const bedTransferSchema = z.object({
  admissionId: z.string(),
  newBedId: z.string().min(1, "New bed selection is required."),
  reason: z.string().optional(),
});

type BedTransferFormValues = z.infer<typeof bedTransferSchema>;

interface BedTransferFormProps {
  patient: Patient;
  admissionId: string;
  currentBed: Bed;
  onFormSubmit: () => void;
}

export function BedTransferForm({ patient, admissionId, currentBed, onFormSubmit }: BedTransferFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const availableBeds = allBeds.filter(b => b.status === "vacant");
  const wards = [...new Set(availableBeds.map(b => b.wardName))];
  
  const form = useForm<BedTransferFormValues>({
    resolver: zodResolver(bedTransferSchema),
    defaultValues: {
      admissionId: admissionId,
      newBedId: "",
      reason: "",
    },
  });
  
  const [selectedWard, setSelectedWard] = React.useState("");

  async function onSubmit(data: BedTransferFormValues) {
    setIsSubmitting(true);
    try {
      const result = await transferPatientBedAction(data);

      if (result.success) {
        onFormSubmit();
      } else {
        toast({
          variant: "destructive",
          title: "Transfer Failed",
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
        <div className="text-sm">
            <p><strong>Current Bed:</strong> {currentBed.bedId} ({currentBed.wardName})</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormItem>
                <FormLabel>Destination Ward</FormLabel>
                <Select onValueChange={setSelectedWard}>
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
            </FormItem>
            <FormField
              control={form.control}
              name="newBedId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destination Bed</FormLabel>
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
            name="reason"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Reason for Transfer (Optional)</FormLabel>
                <FormControl>
                    <Textarea placeholder="e.g., Patient requires specialized monitoring." {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
        
        <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Transfer
        </Button>
      </form>
    </Form>
  );
}
