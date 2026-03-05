'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Camera, FileText, Save, ArrowLeft, ShieldCheck, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ClinicalImageViewer } from '@/components/clinical/ClinicalImageViewer';
import { Card } from '@/components/ui/card';

const reportSchema = z.object({
  findings: z.string().min(10, "Findings are required."),
  impression: z.string().min(3, "A final impression is required."),
});

type ReportFormValues = z.infer<typeof reportSchema>;

export default function RadiologyReportingPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [claims, setClaims] = useState<any>(null);
  const [isClaimsLoading, setIsClaimsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      user.getIdTokenResult(true).then((idTokenResult) => {
        setClaims(idTokenResult.claims);
        setIsClaimsLoading(false);
      });
    }
  }, [user]);

  const hospitalId = claims?.hospitalId;

  const orderRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !id) return null;
    return doc(firestore, `hospitals/${hospitalId}/radiology_orders`, id as string);
  }, [firestore, hospitalId, id]);

  const { data: order, isLoading: isOrderLoading } = useDoc(orderRef);

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: { findings: '', impression: '' },
  });

  const onSubmit = (values: ReportFormValues) => {
    if (!orderRef || !user) return;
    
    updateDocumentNonBlocking(orderRef, {
      ...values,
      status: 'COMPLETED',
      radiologistId: user.uid,
      radiologistName: user.displayName,
      completedAt: serverTimestamp(),
    });

    toast({
      title: "Radiology Report Signed",
      description: "Report has been validated and pushed to the patient's EHR.",
    });
    router.push('/radiology/queue');
  };
  
  const isLoading = isClaimsLoading || isOrderLoading;

  if (isLoading) {
    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-32 w-full" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Skeleton className="h-[500px] w-full" />
                <div className="space-y-8">
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 text-black">
      <Button variant="ghost" onClick={() => router.back()} className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-black text-[10px] uppercase tracking-widest">
        <ArrowLeft size={14}/> Back to Queue
      </Button>
      
      <div className="bg-card border-4 border-foreground p-8 rounded-[40px] shadow-sm flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-black uppercase tracking-tighter italic text-foreground">Imaging <span className="text-orange-600">Report</span></h1>
           <p className="text-muted-foreground font-bold uppercase text-[10px] mt-1 tracking-widest">{order?.scanName} • Patient: {order?.patientName}</p>
           <p className="text-[10px] font-black text-orange-600 mt-2 italic uppercase">Indication: {order?.indication}</p>
        </div>
        <Camera size={40} className="text-muted-foreground/20" />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <ClinicalImageViewer url={order?.imageUrl} />
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card className="p-8 rounded-[32px] shadow-sm">
                <FormField
                    control={form.control}
                    name="findings"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <FileText size={14} className="text-orange-600" /> Radiographic Findings
                        </FormLabel>
                        <FormControl>
                            <Textarea 
                                className="w-full p-6 mt-2 bg-muted/50 rounded-2xl border-none text-foreground font-medium text-sm h-64 outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                                placeholder="Describe the anatomical findings here..."
                                {...field}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </Card>

            <Card className="p-8 rounded-[32px] shadow-sm">
                <FormField
                    control={form.control}
                    name="impression"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 text-orange-600">
                            <ShieldCheck size={14} /> Clinical Impression (Conclusion)
                        </FormLabel>
                        <FormControl>
                            <Input 
                                className="w-full p-4 mt-2 bg-orange-100/50 rounded-2xl border-none text-foreground font-black text-sm uppercase outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                                placeholder="Final radiological conclusion..."
                                {...field}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </Card>

            <Button type="submit" disabled={form.formState.isSubmitting} className="w-full bg-foreground hover:bg-orange-600 text-background py-6 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all flex items-center justify-center gap-2">
                {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : <Save size={18}/>}
                Sign & Authenticate Report
            </Button>
            </form>
        </Form>
      </div>

    </div>
  );
}
