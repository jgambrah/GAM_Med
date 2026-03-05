'use client';
import { useState }from 'react';
import { useAuth, useUser, useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { updatePassword } from "firebase/auth";
import { doc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Lock, Loader2 } from 'lucide-react';

const passwordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters."),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function ForcePasswordChangePage() {
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: PasswordFormValues) => {
    setLoading(true);
    const currentUser = auth?.currentUser;

    if (!currentUser || !firestore) {
      toast({ variant: "destructive", title: "Error", description: "Not authenticated or system not ready." });
      setLoading(false);
      return;
    }

    try {
      // 1. Update the password in Firebase Auth
      await updatePassword(currentUser, values.newPassword);

      // 2. Clear the flag in Firestore (non-blocking)
      const userDocRef = doc(firestore, "users", currentUser.uid);
      updateDocumentNonBlocking(userDocRef, {
        mustChangePassword: false,
        onboardingComplete: true, // Let's also mark onboarding as complete
        updatedAt: serverTimestamp()
      });

      toast({ title: "Security Updated", description: "Your private password is now active." });
      
      // Release them into the app with role-based routing
      const claims = (await currentUser.getIdTokenResult()).claims;
      const userRole = claims.role;
      const portalRoutes: { [key: string]: string } = {
          'SUPER_ADMIN': '/app-ceo/dashboard',
          'DIRECTOR': '/dashboard',
          'ADMIN': '/dashboard',
          'HR_MANAGER': '/hr',
          'DOCTOR': '/doctor',
          'NURSE': '/nurse',
          'PHARMACIST': '/pharmacy',
          'RECEPTIONIST': '/patients',
          'LAB_TECH': '/lab/queue',
          'RADIOLOGIST': '/radiology/queue',
          'ACCOUNTANT': '/accountant',
          'CASHIER': '/finance/billing',
          'STORE_MANAGER': '/supply-chain',
      };
      const destination = userRole ? portalRoutes[userRole] : '/dashboard';
      router.replace(destination || '/dashboard');


    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message
      });
      // If re-authentication is needed, Firebase error will be specific.
      if (error.code === 'auth/requires-recent-login') {
         toast({
            variant: "destructive",
            title: "Re-authentication Required",
            description: "Please log out and log back in to change your password.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-[40px] p-10 shadow-2xl space-y-6 text-card-foreground">
        <div className="text-center space-y-2">
          <div className="bg-primary/10 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto text-primary">
             <ShieldCheck size={32} />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tighter italic">Identity <span className="text-primary">Verification</span></h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">You must set a secure password before proceeding.</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black text-muted-foreground uppercase">New Private Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black text-muted-foreground uppercase">Confirm Password</FormLabel>
                  <FormControl>
                     <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground py-6 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all hover:bg-foreground">
               {loading ? <Loader2 className="animate-spin" /> : <><Lock size={18} /> Update Credentials</>}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
