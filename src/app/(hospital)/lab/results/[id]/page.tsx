'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase, updateDocumentNonBlocking, useFirebaseApp } from '@/firebase';
import { doc, serverTimestamp, collection, query, where, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Beaker, Save, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';

const resultSchema = z.object({
  resultValue: z.string().min(1, "Result value is required."),
  remarks: z.string().optional(),
  isAbnormal: z.boolean().default(false).optional(),
});

type ResultFormValues = z.infer<typeof resultSchema>;

export default function LabResultEntryPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const firebaseApp = useFirebaseApp();
  const { toast } = useToast();
  
  const [claims, setClaims] = useState<any>(null);
  const [isClaimsLoading, setIsClaimsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      user.getIdTokenResult(true).then((idTokenResult) => {
        setClaims(idTokenResult.claims);
        setIsClaimsLoading(false);
      });
    } else if (!isUserLoading) {
        setIsClaimsLoading(false);
    }
  }, [user, isUserLoading]);

  const hospitalId = claims?.hospitalId;

  const orderRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !id) return null;
    return doc(firestore, `hospitals/${hospitalId}/lab_orders`, id as string);
  }, [firestore, hospitalId, id]);

  const { data: order, isLoading: isOrderLoading } = useDoc(orderRef);
  
  const patientRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !order?.patientId) return null;
    return doc(firestore, `hospitals/${hospitalId}/patients`, order.patientId);
  }, [firestore, hospitalId, order]);
  const { data: patient, isLoading: isPatientLoading } = useDoc(patientRef);


  const form = useForm<ResultFormValues>({
    resolver: zodResolver(resultSchema),
    defaultValues: { resultValue: '', remarks: '', isAbnormal: false },
  });

  const onSubmit = async (values: ResultFormValues) => {
    if (!orderRef || !user || !firebaseApp) return;
    
    updateDocumentNonBlocking(orderRef, {
      ...values,
      status: 'COMPLETED',
      labTechUid: user.uid,
      labTechName: user.displayName,
      completedAt: serverTimestamp(),
    });

    toast({
      title: "Lab Result Validated",
      description: "Result has been pushed to the patient's EHR.",
    });

    // AUTO-SMS to Patient
    if (patient?.phoneNumber && hospitalId) {
      const smsMessage = `Hello ${order.patientName}, your diagnostic results for ${order.testName} are ready. Please log into your MyGamMed portal at gammed.com/patient/login to view them.`;
      
      try {
        const functions = getFunctions(firebaseApp);
        const sendSms = httpsCallable(functions, 'sendClinicalSms');
        await sendSms({ 
          phoneNumber: patient.phoneNumber, 
          message: smsMessage,
          hospitalId: hospitalId
        });
        toast({ title: "Patient Notified via SMS" });
      } catch (smsError) {
        console.error("SMS Notification Error:", smsError);
        toast({ variant: 'destructive', title: "SMS Failed", description: "Could not send SMS notification to patient." });
      }
    }


    router.push('/lab/queue');
  };
  
  const isLoading = isUserLoading || isClaimsLoading || isOrderLoading || isPatientLoading;

  if (isLoading) {
    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-24 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Button variant="ghost" onClick={() => router.back()} className="flex items-center gap-2 text-muted-foreground font-black text-[10px] uppercase tracking-widest hover:text-foreground">
        <ArrowLeft size={14}/> Back to Queue
      </Button>
      
      <div className="bg-foreground p-8 rounded-[40px] text-background shadow-xl flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-black uppercase tracking-tighter italic">Result <span className="text-primary">Validation</span></h1>
           <p className="text-primary/70 font-bold uppercase text-[10px] mt-1 tracking-widest">{order?.testName} • Patient: {order?.patientName}</p>
        </div>
        <Beaker size={40} className="text-primary opacity-50" />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div className="bg-card p-8 rounded-[32px] border shadow-sm space-y-6">
            <h3 className="font-black text-xs text-muted-foreground uppercase tracking-widest border-b pb-2 italic">Parameter Entry</h3>
            
            <FormField
              control={form.control}
              name="resultValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest">Measured Value</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. 12.5"
                      className="h-auto p-4 border-2 rounded-2xl font-black text-xl"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="mt-3 bg-primary/10 p-3 rounded-xl flex justify-between items-center">
               <span className="text-[10px] font-black text-primary uppercase">Reference Range:</span>
               <span className="text-xs font-bold text-primary/80">{order?.referenceRange || 'N/A'} {order?.unit}</span>
            </div>
          </div>

          <div className="bg-card p-8 rounded-[32px] border shadow-sm space-y-6">
            <h3 className="font-black text-xs text-muted-foreground uppercase tracking-widest border-b pb-2 italic">Lab Tech Remarks</h3>
             <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                    <FormControl>
                        <Textarea 
                            placeholder="Any abnormalities or clinical observations..."
                            className="h-32"
                            {...field}
                        />
                    </FormControl>
                     <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isAbnormal"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-amber-50 border-amber-200">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="font-bold text-amber-800">
                      Mark as Abnormal/Critical Result
                    </FormLabel>
                    <FormDescription className="text-amber-700">
                      This will trigger a high-priority alert for the ordering doctor.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            
            <Button type="submit" disabled={form.formState.isSubmitting} className="w-full bg-primary hover:bg-foreground py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">
              {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={18}/> Authorize & Release</>}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
