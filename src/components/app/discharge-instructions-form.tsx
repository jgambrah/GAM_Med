'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

const formSchema = z.object({
  patientName: z.string().min(2, { message: 'Patient name is required.' }),
  diagnosis: z.string().min(3, { message: 'Diagnosis is required.' }),
  treatmentPlanSummary: z.string().min(10, { message: 'Treatment summary is required.' }),
  medications: z.string().min(1, { message: 'At least one medication is required.' }),
  followUpCare: z.string().min(10, { message: 'Follow-up care instructions are required.' }),
  activityRestrictions: z.string().min(10, { message: 'Activity restrictions are required.' }),
  dietaryRestrictions: z.string().optional(),
  additionalInstructions: z.string().optional(),
});

type DischargeFormProps = {
  onSubmit: (data: z.infer<typeof formSchema>) => void;
  isLoading: boolean;
};

export function DischargeInstructionsForm({ onSubmit, isLoading }: DischargeFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patientName: '',
      diagnosis: '',
      treatmentPlanSummary: '',
      medications: '',
      followUpCare: '',
      activityRestrictions: '',
      dietaryRestrictions: '',
      additionalInstructions: '',
    },
  });

  function onFormSubmit(values: z.infer<typeof formSchema>) {
    onSubmit(values);
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Patient Details</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="patientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Patient Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Ama Serwaa" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="diagnosis"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Diagnosis</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Acute Malaria" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="treatmentPlanSummary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Treatment Summary</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Summarize the treatment received..." {...field} rows={4} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="medications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Medications</FormLabel>
                  <FormControl>
                    <Textarea placeholder="List medications, one per line. e.g., Paracetamol 500mg, 2 tablets every 6 hours" {...field} rows={4} />
                  </FormControl>
                  <FormDescription>
                    Enter each medication on a new line.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="followUpCare"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Follow-up Care</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Appointment with Dr. Adjei on July 30th at 10 AM, O.P.D." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="activityRestrictions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Activity Restrictions</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Avoid heavy lifting for 2 weeks." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dietaryRestrictions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dietary Restrictions (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Low salt diet. Drink plenty of fluids." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="additionalInstructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Instructions (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any other specific instructions..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90" disabled={isLoading} size="lg">
              {isLoading ? (
                <>
                  <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                 <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Instructions
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
