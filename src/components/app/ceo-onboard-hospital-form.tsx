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
import { useEffect } from 'react';

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
  monthlyRateNumeric: z.coerce.number(),
  monthlyRateWords: z.string().min(10, { message: 'Please write the full amount in words for verification.' }),
});

type FormValues = z.infer<typeof formSchema>;

type OnboardHospitalFormProps = {
  onSubmit: (data: FormValues) => void;
  isLoading: boolean;
  pricingPlans: { id: string; name: string, monthlyPrice: number }[];
  initialValues?: Partial<FormValues>;
};

export function CeoOnboardHospitalForm({ onSubmit, isLoading, pricingPlans, initialValues }: OnboardHospitalFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues || {
      hospitalName: '',
      directorName: '',
      directorEmail: '',
      mrnPrefix: '',
      subscriptionPlan: 'PRO',
      monthlyRateNumeric: 5000,
      monthlyRateWords: '',
    },
  });

  const selectedPlanId = form.watch('subscriptionPlan');

  useEffect(() => {
    const selectedPlan = pricingPlans.find(p => p.id === selectedPlanId);
    if (selectedPlan) {
        form.setValue('monthlyRateNumeric', selectedPlan.monthlyPrice);
    }
  }, [selectedPlanId, pricingPlans, form]);

  useEffect(() => {
    if (initialValues) {
      form.reset(initialValues);
      const initialPlan = pricingPlans.find(p => p.id === initialValues.subscriptionPlan);
      if (initialPlan) {
        form.setValue('monthlyRateNumeric', initialPlan.monthlyPrice);
      }
    }
  }, [initialValues, form, pricingPlans]);


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        <SelectItem key={plan.id} value={plan.id}>{plan.name} (GHS {plan.monthlyPrice}/mo)</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <div className="mt-8 p-8 bg-slate-900 rounded-[40px] border-4 border-blue-600 shadow-2xl space-y-6">
            <h3 className="text-xl font-black uppercase italic text-blue-400 border-b border-slate-800 pb-4">
                Financial Authorization
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                    control={form.control}
                    name="monthlyRateNumeric"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black text-slate-500 uppercase">Numerical Rate (₵)</FormLabel>
                            <FormControl>
                                <Input 
                                    type="number" 
                                    className="w-full p-4 bg-slate-800 border-none rounded-2xl text-white font-black text-2xl"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="monthlyRateWords"
                    render={({ field }) => (
                        <FormItem className="md:col-span-2">
                            <FormLabel className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                                Subscription Amount in Words (Legal Verification)
                            </FormLabel>
                            <FormControl>
                                <Input 
                                    required
                                    placeholder="e.g. FIVE THOUSAND GHANA CEDIS ONLY"
                                    className="w-full p-4 bg-slate-800 border-2 border-blue-900 focus:border-blue-500 rounded-2xl text-white font-bold uppercase italic outline-none transition-all mt-1"
                                    {...field}
                                    onChange={e => field.onChange(e.target.value.toUpperCase())}
                                />
                            </FormControl>
                             <FormMessage />
                             <p className="text-[8px] text-slate-500 mt-2 italic font-medium">
                                * As the CEO, typing the amount in words serves as your formal authorization of this contract value.
                             </p>
                        </FormItem>
                    )}
                />
            </div>
        </div>

        <Button type="submit" className="w-full h-14 text-base" disabled={isLoading}>
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
