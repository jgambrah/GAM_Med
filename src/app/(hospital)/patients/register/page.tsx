'use client';
import * as React from 'react';
import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useFirebaseApp } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  UserPlus, Fingerprint, Phone, HeartPulse, 
  Save, Loader2, CreditCard 
} from 'lucide-react';

const formSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  otherNames: z.string().optional(),
  dateOfBirth: z.string().min(1, "Date of Birth is required"),
  gender: z.string().min(1, "Gender is required"),
  ghanaCardId: z.string().optional(),
  nhisNumber: z.string().optional(),
  phoneNumber: z.string().min(1, "Phone number is required"),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  residentialAddress: z.string().optional(),
});

type PatientFormValues = z.infer<typeof formSchema>;

export default function RegisterPatientPage() {
  const [loading, setLoading] = useState(false);
  const firebaseApp = useFirebaseApp();
  const { toast } = useToast();

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      gender: 'Female',
      firstName: '',
      lastName: '',
      otherNames: '',
      dateOfBirth: '',
      ghanaCardId: '',
      nhisNumber: '',
      phoneNumber: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      residentialAddress: '',
    },
  });

  const handleRegister = async (values: PatientFormValues) => {
    if (!firebaseApp) {
        toast({ variant: 'destructive', title: 'Error', description: 'System not ready. Please try again.'});
        return
    };
    setLoading(true);

    try {
      const functions = getFunctions(firebaseApp);
      const registerPatient = httpsCallable(functions, 'registerPatient');
      const result: any = await registerPatient(values);

      toast({
        title: "Patient Registered!",
        description: `EHR Number assigned: ${result.data.ehrNumber}`
      });
      form.reset();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: "Registration Failed",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black text-primary uppercase tracking-tighter italic">Patient <span className="text-foreground">Enrollment</span></h1>
          <p className="text-muted-foreground font-medium italic text-sm">Assigning a lifelong EHR identity within the GAM_Med network.</p>
        </div>
        <div className="bg-primary/10 text-primary px-4 py-2 rounded-2xl border border-primary/20 flex items-center gap-2">
           <Fingerprint size={18} />
           <span className="text-xs font-black uppercase">Biometric Ready</span>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleRegister)} className="space-y-8">
          {/* SECTION 1: PERSONAL BIODATA */}
          <div className="bg-card p-6 rounded-3xl border shadow-sm space-y-6">
             <div className="flex items-center gap-2 border-b pb-2">
                <HeartPulse className="text-destructive" size={18} />
                <h3 className="font-bold text-sm uppercase tracking-widest text-foreground">Primary Bio-Data</h3>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField control={form.control} name="firstName" render={({ field }) => (
                    <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="lastName" render={({ field }) => (
                    <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="otherNames" render={({ field }) => (
                    <FormItem><FormLabel>Other Names</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>

                <FormField control={form.control} name="gender" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Gender</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="Female">Female</SelectItem>
                                <SelectItem value="Male">Male</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                    <FormItem><FormLabel>Date of Birth</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                    <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
             </div>
          </div>

          {/* SECTION 2: GOVERNMENT ID & INSURANCE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="bg-card p-6 rounded-3xl border shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <CreditCard className="text-primary" size={18} />
                  <h3 className="font-bold text-sm uppercase tracking-widest text-foreground">Identification</h3>
                </div>
                <div className="space-y-4">
                   <FormField control={form.control} name="ghanaCardId" render={({ field }) => (
                        <FormItem><FormLabel>Ghana Card ID (GHA-XXXXXXXXX-X)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                   <FormField control={form.control} name="nhisNumber" render={({ field }) => (
                        <FormItem><FormLabel>NHIS Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
             </div>

             <div className="bg-card p-6 rounded-3xl border shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b pb-2 text-foreground">
                  <Phone className="text-green-600" size={18} />
                  <h3 className="font-bold text-sm uppercase tracking-widest text-foreground">Next of Kin / Emergency</h3>
                </div>
                <div className="space-y-4">
                   <FormField control={form.control} name="emergencyContactName" render={({ field }) => (
                        <FormItem><FormLabel>Full Name (Next of Kin)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                   <FormField control={form.control} name="emergencyContactPhone" render={({ field }) => (
                        <FormItem><FormLabel>Phone (Next of Kin)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
             </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground font-black py-5 rounded-2xl hover:bg-foreground transition-all shadow-xl flex items-center justify-center gap-3 uppercase tracking-widest text-sm disabled:opacity-50">
             {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
             Register Patient & Open EHR Folder
          </button>
        </form>
      </Form>
    </div>
  );
}
