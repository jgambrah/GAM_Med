
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { Patient, ClinicalNote } from "@/lib/types";
import { useAuth } from "../auth-provider";
import { addClinicalNoteAction } from "@/lib/actions";
import { Loader2 } from "lucide-react";

interface ClinicalNoteFormProps {
  patient: Patient;
  onNoteAdded: (newNote: ClinicalNote) => void;
}

const clinicalNoteSchema = z.object({
  noteType: z.enum(['Progress Note', 'Consultation Note', 'Discharge Summary']),
  noteText: z.string().min(10, "Note must be at least 10 characters long."),
});

type ClinicalNoteFormValues = z.infer<typeof clinicalNoteSchema>;

export function ClinicalNoteForm({ patient, onNoteAdded }: ClinicalNoteFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<ClinicalNoteFormValues>({
    resolver: zodResolver(clinicalNoteSchema),
    defaultValues: {
      noteType: "Progress Note",
      noteText: "",
    },
  });

  const onSubmit = async (data: ClinicalNoteFormValues) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "You must be logged in to add a note.",
      });
      return;
    }
    setIsSubmitting(true);
    const result = await addClinicalNoteAction({
        ...data,
        patientId: patient.patientId,
        recordedByUserId: user.id,
        recordedByUserName: user.name,
    });
    
    if (result.success && result.note) {
        toast({ title: "Note Added", description: "The clinical note has been saved." });
        onNoteAdded(result.note);
        form.reset();
    } else {
        toast({ variant: "destructive", title: "Failed to Add Note", description: result.message });
    }
    setIsSubmitting(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="noteType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a note type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Progress Note">Progress Note</SelectItem>
                  <SelectItem value="Consultation Note">Consultation Note</SelectItem>
                  <SelectItem value="Discharge Summary">Discharge Summary</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="noteText"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note Content</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter clinical observations, progress, and plans..."
                  className="min-h-[150px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Note
        </Button>
      </form>
    </Form>
  );
}
