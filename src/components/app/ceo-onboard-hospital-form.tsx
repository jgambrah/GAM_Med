
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Hospital, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const regions = [
    { value: 'AHA', label: 'Ahafo' },
    { value: 'ASH', label: 'Ashanti' },
    { value: 'BON', label: 'Bono' },
    { value: 'BEA', label: 'Bono East' },
    { value: 'CEN', label: 'Central' },
    { value: 'EAS', label: 'Eastern' },
    { value: 'GAR', label: 'Greater Accra' },
    { value: 'NEA', label: 'North East' },
    { value: 'NOR', label: 'Northern' },
    { value: 'OTI', label: 'Oti' },
    { value: 'SAV', label: 'Savannah' },
    { value: 'UEA', label: 'Upper East' },
    { value: 'UWE', label: 'Upper West' },
    { value: 'VOL', label: 'Volta' },
    { value: 'WES', label: 'Western' },
    { value: 'WNO', label: 'Western North' },
];

const formSchema = z.object({
  hospitalName: z.string().min(3, { message: 'Hospital name is required.' }),
  region: z.string({ required_error: 'Please select a region.' }),
  directorName: z.string().min(3, { message: "Director's name is required." }),
  directorEmail: z.string().email({ message: "A valid director email is required." }),
  mrnPrefix: z.string().min(2, "MRN Prefix is required.").max(5, "Prefix is too long."),
  subscriptionPlan: z.string({ required_error: "Please select a plan." }),
});

type OnboardHospitalFormProps = {
  onSubmit: (data: z.infer<typeof formSchema>) => void;
  isLoading: boolean;
  pricingPlans: { id: string; monthlyPrice: number }[];
};

export function CeoOnboardHospitalForm({ onSubmit, isLoading, pricingPlans }: OnboardHospitalFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      hospitalName: '',
      directorName: '',
      directorEmail: '',
      mrnPrefix: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
        <FormField
          control={form.control}
          name="hospitalName"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Hospital Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Korle Bu Teaching Hospital" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="region"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Region</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a region" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {regions.map((region) => (
                    <SelectItem key={region.value} value={region.value}>{region.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="mrnPrefix"
          render={({ field }) => (
            <FormItem>
              <FormLabel>MRN Prefix</FormLabel>
              <FormControl>
                <Input placeholder="e.g., KATH" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="directorName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Director's Full Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Dr. Jane Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="directorEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Director's Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="director@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="subscriptionPlan"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Subscription Plan</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {pricingPlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>{plan.id} (GHS {plan.monthlyPrice}/mo)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full md:col-span-2" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Onboarding...
            </>
          ) : (
             <>
              <Hospital className="mr-2 h-4 w-4" />
              Onboard Hospital
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}

    