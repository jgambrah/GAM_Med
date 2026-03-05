'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/firebase';
import { initiateEmailSignIn } from '@/firebase/non-blocking-login';
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
import { Stethoscope, Loader2 } from 'lucide-react';
import { RequestDemoDialog } from '@/components/auth/RequestDemoDialog';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type FormValues = z.infer<typeof formSchema>;

export function AuthForm() {
  const [isLoading, setIsLoading] = useState(false); // For form submission
  const auth = useAuth();
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    initiateEmailSignIn(auth, values.email, values.password);
    // Auth state change will be caught by the provider and trigger a page redirect.
    // We can set a timeout to reset loading state in case of login failure.
    setTimeout(() => setIsLoading(false), 5000); 
  };
  
  const handleForgotPassword = async () => {
    const email = form.getValues('email');
    if (!email) {
      form.setError("email", { type: "manual", message: "Please enter your email to reset password." });
      return;
    }
    try {
      if (!auth) throw new Error("Auth service not available.");
      await sendPasswordResetEmail(auth, email);
      toast({ title: "Reset Email Sent", description: "Check your inbox for the link." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <Stethoscope className="h-12 w-12 text-primary mx-auto" />
        <CardTitle className="font-headline text-3xl mt-4">Welcome to GAM_Med</CardTitle>
        <CardDescription>Sign in to your account</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="name@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                    <div className="flex justify-between items-center">
                        <FormLabel>Password</FormLabel>
                        <button
                            type="button"
                            onClick={handleForgotPassword}
                            className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline"
                        >
                            Forgot Password?
                        </button>
                    </div>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>
        </Form>
        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            or{' '}
            <RequestDemoDialog />
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
