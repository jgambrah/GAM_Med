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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Hospital, Loader2 } from 'lucide-react';

const formSchema = z.object({
  hospitalName: z.string().min(3, { message: 'Hospital name is required.' }),
  location: z.string().min(3, { message: 'Location is required.' }),
  directorEmail: z.string().email({ message: 'A valid director email is required.' }),
});

type OnboardHospitalFormProps = {
  onSubmit: (data: z.infer<typeof formSchema>) => void;
  isLoading: boolean;
};

export function OnboardHospitalForm({ onSubmit, isLoading }: OnboardHospitalFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      hospitalName: '',
      location: '',
      directorEmail: '',
    },
  });

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Onboard New Hospital</CardTitle>
        <CardDescription>
          Create a new hospital tenant and specify the initial director.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="hospitalName"
              render={({ field }) => (
                <FormItem>
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
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Accra" {...field} />
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
            <Button type="submit" className="w-full" disabled={isLoading}>
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
      </CardContent>
    </Card>
  );
}
