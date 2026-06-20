'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp, collection, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Camera, FileText, Save, ArrowLeft, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ClinicalImageViewer } from '@/components/clinical/ClinicalImageViewer';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const reportSchema = z.object({
  findings: z.string().min(10, "Findings are required."),
  impression: z.string().min(3, "A final impression is required."),
  isCritical: z.boolean().default(false),
});

const TEMPLATES = [
  {
    label: "Normal Chest X-Ray",
    findings: "The lungs are clear and fully expanded. No focal consolidation, pleural effusion, or pneumothorax is seen. The cardiomediastinal contour is normal in size and configuration. The bony thorax and visualised soft tissues are unremarkable.",
    impression: "NORMAL CHEST X-RAY. NO ACTIVE CARDIOPULMONARY DISEASE."
  },
  {
    label: "Normal Abdominal USS",
    findings: "The liver is normal in size, shape, and echotexture with no focal lesions. The gallbladder is well-distended, thin-walled, and stone-free. Biliary tree is not dilated. The kidneys are normal in size with normal cortical thickness and no hydronephrosis. Spleen and pancreas are normal. No free fluid in the peritoneum.",
    impression: "NORMAL ABDOMINAL ULTRASOUND."
  },
  {
    label: "Normal Brain CT",
    findings: "No acute intracranial hemorrhage, mass effect, or midline shift is identified. The ventricles and sulci are normal in size and appearance for age. Brain parenchyma shows normal attenuation with good grey-white matter differentiation. Bony calvarium is intact.",
    impression: "NORMAL CT SCAN OF THE BRAIN."
  },
  {
    label: "Normal Pelvic USS",
    findings: "The uterus is anteverted, normal in size, and shows a homogeneous myometrium. Endometrial stripe is thin and regular. Both ovaries are normal in volume with normal follicular development. No adnexal masses or free fluid in the pouch of Douglas.",
    impression: "NORMAL PELVIC ULTRASOUND."
  }
];

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

  const patientRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !order?.patientId) return null;
    return doc(firestore, `hospitals/${hospitalId}/patients`, order.patientId);
  }, [firestore, hospitalId, order?.patientId]);
  const { data: patientData } = useDoc(patientRef);

  const providerQuery = useMemoFirebase(() => {
    if (!firestore || !order?.providerUid) return null;
    return query(collection(firestore, 'users'), where('uid', '==', order?.providerUid));
  }, [firestore, order?.providerUid]);
  const { data: providersList } = useCollection(providerQuery);
  const providerData = providersList?.[0];

  const resolvedPatientName = order?.patientName || 
    (patientData ? `${patientData.firstName} ${patientData.lastName}` : '') || 
    'Unknown Patient';

  const resolvedProviderName = order?.providerName || 
    providerData?.fullName || 
    'Unknown Clinician';

  const resolvedUnitName = order?.unitName || 
    providerData?.department || 
    'OPD';

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: { findings: '', impression: '', isCritical: false },
  });

  const onSubmit = (values: ReportFormValues) => {
    if (!orderRef || !user || !hospitalId) return;
    
    updateDocumentNonBlocking(orderRef, {
      ...values,
      status: 'COMPLETED',
      radiologistId: user.uid,
      radiologistName: user.displayName,
      completedAt: serverTimestamp(),
    });

    if (values.isCritical && order) {
      addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/clinical_alerts`), {
        hospitalId: hospitalId,
        patientId: order.patientId,
        patientName: resolvedPatientName,
        encounterId: order.encounterId || '',
        alertType: 'CRITICAL_IMAGING_ALERT',
        message: `CRITICAL IMAGING ALERT for ${order.scanName || order.name || 'Scan'}: ${values.impression}`,
        severity: 'Critical',
        status: 'UNREAD',
        createdAt: serverTimestamp(),
      });
    }

    toast({
      title: values.isCritical ? "⚠️ Critical Report Signed & Alerted" : "Radiology Report Signed",
      description: values.isCritical 
        ? "Report submitted. Ordering clinician has been alerted of critical findings." 
        : "Report has been validated and pushed to the patient's EHR.",
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
           <p className="text-muted-foreground font-bold uppercase text-[10px] mt-1 tracking-widest">{order?.scanName || order?.name} • Patient: {resolvedPatientName}</p>
           <div className="flex flex-wrap gap-4 mt-2 text-[10px] text-slate-500 font-black uppercase tracking-widest">
              <span>Doctor: {resolvedProviderName}</span>
              <span>Unit: {resolvedUnitName}</span>
           </div>
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
                        <div className="flex justify-between items-center mb-2">
                            <FormLabel className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                <FileText size={14} className="text-orange-600" /> Radiographic Findings
                            </FormLabel>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black text-slate-400 uppercase">Insert Macro:</span>
                              <Select onValueChange={(val) => {
                                 const t = TEMPLATES.find(x => x.label === val);
                                 if (t) {
                                   form.setValue('findings', t.findings);
                                   form.setValue('impression', t.impression);
                                   toast({ title: 'Macro Applied', description: `Loaded template: ${t.label}` });
                                 }
                              }}>
                                 <SelectTrigger className="h-7 px-2.5 rounded-lg text-[9px] font-black uppercase bg-slate-100 border-none text-slate-700 w-36 shadow-none">
                                    <SelectValue placeholder="SELECT TEMPLATE" />
                                 </SelectTrigger>
                                 <SelectContent className="rounded-xl border shadow-lg">
                                    {TEMPLATES.map((t) => (
                                       <SelectItem key={t.label} value={t.label} className="text-[9px] font-black uppercase">
                                          {t.label}
                                       </SelectItem>
                                    ))}
                                 </SelectContent>
                              </Select>
                            </div>
                        </div>
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

            {/* CRITICAL FINDINGS FLAG */}
            <FormField
                control={form.control}
                name="isCritical"
                render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-[28px] border-4 border-red-100 p-6 bg-red-50/50 hover:bg-red-50 transition-colors">
                    <FormControl>
                        <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="mt-0.5 border-red-300 text-red-600 focus-visible:ring-red-500 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                        />
                    </FormControl>
                    <div className="space-y-1">
                        <FormLabel className="text-xs font-black text-red-900 uppercase tracking-widest flex items-center gap-1.5 cursor-pointer">
                            <AlertCircle size={14} className="text-red-600 animate-pulse" /> Flag as Critical Finding
                        </FormLabel>
                        <p className="text-[10px] text-red-700 font-bold leading-normal">
                            Warning: Mark this only if the imaging shows acute, life-threatening pathologies. Selecting this will immediately trigger a critical EHR alert for the physician.
                        </p>
                    </div>
                </FormItem>
                )}
            />

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
