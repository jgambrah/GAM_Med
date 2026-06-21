'use client';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, serverTimestamp, doc, runTransaction, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skull, UserCheck, ShieldAlert, Save, Loader2 } from 'lucide-react';

const intakeSchema = z.object({
  bodyName: z.string().min(3, "Full name of deceased is required."),
  gender: z.string().min(1, "Gender is required."),
  arrivalType: z.string().min(1, "Arrival type is required."),
  relativeName: z.string().min(3, "Relative's name is required."),
  relativePhone: z.string().min(10, "A valid phone number is required."),
  chamberId: z.string().min(1, "Please assign a chamber."),
  requiresAutopsy: z.boolean().default(false),
  policeClearanceAttached: z.boolean().default(false),
});

type IntakeFormValues = z.infer<typeof intakeSchema>;

export default function MortuaryIntake() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;

  const chambersQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/mortuary_chambers`), where('status', '==', 'AVAILABLE'));
  }, [firestore, hospitalId]);
  const { data: availableChambers, isLoading: areChambersLoading } = useCollection(chambersQuery);
  
  const form = useForm<IntakeFormValues>({
    resolver: zodResolver(intakeSchema),
    defaultValues: { 
        bodyName: '',
        gender: 'Male', 
        arrivalType: 'IN_FACILITY', 
        relativeName: '',
        relativePhone: '',
        chamberId: '',
        requiresAutopsy: false, 
        policeClearanceAttached: false 
    },
  });

  const arrivalType = form.watch('arrivalType');

  const onSubmit = async (values: IntakeFormValues) => {
    if (!user || !hospitalId || !firestore) {
      toast({ variant: "destructive", title: "Authentication or system error." });
      return;
    }
    
    if (values.arrivalType === 'BID' && !values.policeClearanceAttached) {
      const confirmNoClearance = confirm("WARNING: You have indicated this is a 'Brought In Dead' case without police clearance. Are you sure you want to proceed?");
      if (!confirmNoClearance) return;
    }

    try {
      await runTransaction(firestore, async (transaction) => {
        const bodyId = `MOR-${Date.now().toString().slice(-6)}`;
        const recordRef = doc(collection(firestore, `hospitals/${hospitalId}/mortuary_records`));
        const chamberRef = doc(firestore, `hospitals/${hospitalId}/mortuary_chambers`, values.chamberId);

        const chamberDoc = await transaction.get(chamberRef);
        if (!chamberDoc.exists() || chamberDoc.data().status !== 'AVAILABLE') {
          throw new Error(`Chamber is no longer available.`);
        }
        const selectedChamber = chamberDoc.data();

        transaction.set(recordRef, {
          ...values,
          chamberNumber: selectedChamber.chamberNumber,
          bodyId, hospitalId,
          status: 'IN_STORAGE',
          admittedAt: serverTimestamp(),
          admittedBy: user.uid,
          policeClearanceRequired: values.arrivalType === 'BID',
        });

        transaction.update(chamberRef, {
          status: 'OCCUPIED',
          bodyId: recordRef.id,
          bodyName: values.bodyName,
          admittedAt: serverTimestamp(),
        });
        
        const intakeFee = 200; // Placeholder
        const billRef = doc(collection(firestore, `hospitals/${hospitalId}/billing_items`));
        transaction.set(billRef, {
            description: `Mortuary Intake & Processing: ${values.bodyName}`,
            total: intakeFee,
            category: 'MORTUARY',
            status: 'UNPAID',
            patientId: recordRef.id,
            patientName: `Body of ${values.bodyName}`,
            hospitalId,
            createdAt: serverTimestamp(),
        });
      });

      toast({ title: "Body Intake Successful. Chamber Occupied." });
      form.reset();
    } catch (e: any) {
      toast({ variant: "destructive", title: e.message });
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 text-black font-bold">
      <div className="flex items-center gap-4">
         <div className="bg-slate-900 p-4 rounded-3xl text-white shadow-xl"><Skull size={32}/></div>
         <h1 className="text-4xl font-black uppercase tracking-tighter italic">Mortuary <span className="text-blue-600">Intake</span></h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="bg-white p-10 rounded-[50px] border-4 border-slate-900 shadow-2xl space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField name="bodyName" control={form.control} render={({ field }) => (
              <FormItem><FormLabel>Name of Deceased</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
            )}/>
             <FormField name="gender" control={form.control} render={({ field }) => (
              <FormItem><FormLabel>Gender</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>
                <SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Unknown">Unknown</SelectItem>
              </SelectContent></Select><FormMessage/></FormItem>
            )}/>
          </div>
          
          <div className="p-6 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <h3 className="text-xs font-black uppercase mb-4">Relative / Informant Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField name="relativeName" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
              )}/>
               <FormField name="relativePhone" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
              )}/>
            </div>
          </div>
          
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField name="arrivalType" control={form.control} render={({ field }) => (
              <FormItem><FormLabel>Arrival Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>
                <SelectItem value="IN_FACILITY">In-Facility (Ward)</SelectItem><SelectItem value="BID">Brought in Dead (BID)</SelectItem>
              </SelectContent></Select><FormMessage/></FormItem>
            )}/>
             <FormField name="chamberId" control={form.control} render={({ field }) => (
              <FormItem><FormLabel>Assign to Chamber</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Chamber..." /></SelectTrigger></FormControl><SelectContent>
                {areChambersLoading ? <Loader2 className="animate-spin" /> : availableChambers?.map(c => <SelectItem key={c.id} value={c.id}>{c.chamberNumber}</SelectItem>)}
              </SelectContent></Select><FormMessage/></FormItem>
            )}/>
          </div>

          {arrivalType === 'BID' && (
             <div className="bg-red-50 text-red-700 p-4 rounded-2xl border border-red-200 flex items-center gap-3">
                <ShieldAlert size={20}/>
                <FormField name="policeClearanceAttached" control={form.control} render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <FormLabel className="text-xs font-black uppercase">Police Clearance Form Attached</FormLabel>
                  </FormItem>
                )}/>
             </div>
          )}

          <Button type="submit" disabled={form.formState.isSubmitting} className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-black transition-all">
            {form.formState.isSubmitting ? <Loader2 className="animate-spin mx-auto"/> : 'Authorize Intake & Assign Chamber'}
          </Button>
        </form>
      </Form>
    </div>
  );
}