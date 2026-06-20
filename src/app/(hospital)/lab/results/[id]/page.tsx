'use client';
import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase, updateDocumentNonBlocking, useFirebaseApp } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Beaker, Save, ArrowLeft, CheckCircle2, Loader2, UploadCloud, FileCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { cn } from '@/lib/utils';

const resultSchema = z.object({
  resultValue: z.string().optional(),
  remarks: z.string().optional(),
  isAbnormal: z.boolean().default(false).optional(),
  parameters: z.array(z.object({
    name: z.string().min(1, "Name is required"),
    value: z.string().min(1, "Value is required"),
    referenceRange: z.string().optional(),
    unit: z.string().optional(),
    isAbnormal: z.boolean().default(false).optional(),
  })).optional(),
}).refine(data => {
  return (data.resultValue && data.resultValue.trim() !== '') || (data.parameters && data.parameters.length > 0);
}, {
  message: "Either Measured Value or sub-parameters must be provided.",
  path: ["resultValue"]
});

type ResultFormValues = z.infer<typeof resultSchema>;

export default function LabResultEntryPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const firebaseApp = useFirebaseApp();
  const storage = getStorage(firebaseApp);
  const { toast } = useToast();
  
  const [claims, setClaims] = useState<any>(null);
  const [isClaimsLoading, setIsClaimsLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
    defaultValues: { resultValue: '', remarks: '', isAbnormal: false, parameters: [] },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "parameters"
  });

  const handleFileUpload = async (reportUrl?: string) => {
    let finalReportUrl = reportUrl;

    if (file) {
      setUploading(true);
      try {
        const fileRef = ref(storage, `hospitals/${hospitalId}/patient_reports/${order.patientId}/${order.id}_${file.name}`);
        const snapshot = await uploadBytesResumable(fileRef, file);
        finalReportUrl = await getDownloadURL(snapshot.ref);
      } catch (uploadError: any) {
        toast({ variant: "destructive", title: "File Upload Failed", description: uploadError.message });
        setUploading(false);
        throw uploadError;
      }
    }
    return finalReportUrl;
  };

  const isValueAbnormal = (valueStr: string, rangeStr?: string): boolean => {
    if (!rangeStr) return false;
    const val = parseFloat(valueStr);
    if (isNaN(val)) return false;

    const trimmed = rangeStr.trim();
    const dashRegex = /^([\d.]+)\s*-\s*([\d.]+)$/;
    const dashMatch = trimmed.match(dashRegex);
    if (dashMatch) {
      const min = parseFloat(dashMatch[1]);
      const max = parseFloat(dashMatch[2]);
      return val < min || val > max;
    }

    if (trimmed.startsWith('<=')) {
      const maxVal = parseFloat(trimmed.replace('<=', '').trim());
      return !isNaN(maxVal) && val > maxVal;
    }
    if (trimmed.startsWith('<')) {
      const maxVal = parseFloat(trimmed.replace('<', '').trim());
      return !isNaN(maxVal) && val >= maxVal;
    }
    if (trimmed.startsWith('>=')) {
      const minVal = parseFloat(trimmed.replace('>=', '').trim());
      return !isNaN(minVal) && val < minVal;
    }
    if (trimmed.startsWith('>')) {
      const minVal = parseFloat(trimmed.replace('>', '').trim());
      return !isNaN(minVal) && val <= minVal;
    }

    return false;
  };

  const resultValue = form.watch('resultValue');
  const watchedParameters = form.watch('parameters');

  // Pre-populate panel templates based on testName
  useEffect(() => {
    if (order && order.testName && (!form.getValues('parameters') || form.getValues('parameters')?.length === 0)) {
      const nameLower = order.testName.toLowerCase();
      if (nameLower.includes('blood count') || nameLower.includes('fbc') || nameLower.includes('cbc')) {
        form.setValue('parameters', [
          { name: 'Hemoglobin (Hb)', value: '', referenceRange: '12.0 - 16.0', unit: 'g/dL', isAbnormal: false },
          { name: 'White Blood Cell Count (WBC)', value: '', referenceRange: '4.0 - 11.0', unit: 'x10^9/L', isAbnormal: false },
          { name: 'Platelets (PLT)', value: '', referenceRange: '150 - 450', unit: 'x10^9/L', isAbnormal: false },
          { name: 'Red Blood Cell Count (RBC)', value: '', referenceRange: '4.0 - 5.5', unit: 'x10^12/L', isAbnormal: false },
          { name: 'Hematocrit (PCV)', value: '', referenceRange: '36.0 - 50.0', unit: '%', isAbnormal: false },
        ]);
      } else if (nameLower.includes('urinalysis') || nameLower.includes('urine re') || nameLower.includes('urine analysis')) {
        form.setValue('parameters', [
          { name: 'Color', value: 'Straw', referenceRange: 'Straw/Yellow', unit: '', isAbnormal: false },
          { name: 'Appearance', value: 'Clear', referenceRange: 'Clear', unit: '', isAbnormal: false },
          { name: 'pH', value: '6.0', referenceRange: '5.0 - 8.0', unit: '', isAbnormal: false },
          { name: 'Specific Gravity', value: '1.015', referenceRange: '1.005 - 1.030', unit: '', isAbnormal: false },
          { name: 'Protein', value: 'Negative', referenceRange: 'Negative', unit: '', isAbnormal: false },
          { name: 'Glucose', value: 'Negative', referenceRange: 'Negative', unit: '', isAbnormal: false },
          { name: 'Ketones', value: 'Negative', referenceRange: 'Negative', unit: '', isAbnormal: false },
          { name: 'Bilirubin', value: 'Negative', referenceRange: 'Negative', unit: '', isAbnormal: false },
          { name: 'Blood (Urine)', value: 'Negative', referenceRange: 'Negative', unit: '', isAbnormal: false },
        ]);
      }
    }
  }, [order, form]);

  // Single-value auto-check isAbnormal
  useEffect(() => {
    if (resultValue && order?.referenceRange && (!watchedParameters || watchedParameters.length === 0)) {
      const abnormal = isValueAbnormal(resultValue, order.referenceRange);
      form.setValue('isAbnormal', abnormal);
    }
  }, [resultValue, order?.referenceRange, watchedParameters, form]);

  // Multi-parameter auto-check isAbnormal
  useEffect(() => {
    if (watchedParameters && watchedParameters.length > 0) {
      let anyAbnormal = false;
      let changed = false;

      const checkedParams = watchedParameters.map((p) => {
        const isAbn = isValueAbnormal(p.value, p.referenceRange);
        if (isAbn) anyAbnormal = true;
        if (p.isAbnormal !== isAbn) {
          changed = true;
        }
        return { ...p, isAbnormal: isAbn };
      });

      if (changed) {
        form.setValue('parameters', checkedParams);
      }
      
      // Only set isAbnormal globally if it actually needs to change, to prevent loops
      if (form.getValues('isAbnormal') !== anyAbnormal) {
        form.setValue('isAbnormal', anyAbnormal);
      }
    }
  }, [watchedParameters, form]);

  const onSubmit = async (values: ResultFormValues) => {
    if (!orderRef || !user || !firebaseApp) return;

    setIsSaving(true);

    try {
      const reportUrl = await handleFileUpload();

      updateDocumentNonBlocking(orderRef, {
        ...values,
        status: 'COMPLETED',
        labTechUid: user.uid,
        labTechName: user.displayName,
        completedAt: serverTimestamp(),
        reportUrl: reportUrl || null,
      });

      toast({
        title: "Lab Result Validated",
        description: "Result has been pushed to the patient's EHR.",
      });

      // AUTO-SMS to Patient
      if (patient?.phoneNumber && hospitalId) {
        const smsMessage = `Hello ${order.patientName}, your diagnostic results for ${order.testName} are ready. Please log into your MyGamMed portal to view them.`;
        
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
    } catch (error) {
      // Handled in handleFileUpload
    } finally {
        setIsSaving(false);
        setUploading(false);
    }
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
           {order?.specimenType && (
             <p className="text-blue-400 font-bold text-xs mt-2 uppercase tracking-wider">
               Specimen: {order.specimenType} (Barcode: {order.specimenContainerId})
             </p>
           )}
        </div>
        <Beaker size={40} className="text-primary opacity-50" />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div className="bg-card p-8 rounded-[32px] border shadow-sm space-y-6">
            <h3 className="font-black text-xs text-muted-foreground uppercase tracking-widest border-b pb-2 italic">Parameter Entry</h3>
            
            {(!watchedParameters || watchedParameters.length === 0) ? (
              <>
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
                
                <div className="pt-3 border-t mt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => append({ name: '', value: '', referenceRange: '', unit: '', isAbnormal: false })}
                    className="w-full text-xs font-bold uppercase py-2 border-dashed border-2 hover:bg-slate-50"
                  >
                    + Convert to Multi-Parameter Panel
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-800">Panel Parameters</FormLabel>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => form.setValue('parameters', [])}
                    className="text-[9px] font-black text-red-500 hover:text-red-700 uppercase h-6 px-2"
                  >
                    Reset to Single Value
                  </Button>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {fields.map((field, index) => {
                    const paramAbnormal = watchedParameters[index]?.isAbnormal;
                    return (
                      <div key={field.id} className="p-4 bg-slate-50 rounded-2xl border space-y-3 relative group">
                        <button 
                          type="button" 
                          onClick={() => remove(index)}
                          className="absolute right-3 top-3 text-[10px] text-red-500 hover:text-red-700 font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Delete
                        </button>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase">Parameter Name</label>
                            <input 
                              {...form.register(`parameters.${index}.name` as const)}
                              placeholder="e.g. Hemoglobin"
                              className="w-full mt-1 p-2 border rounded-lg text-xs font-bold bg-white shadow-sm"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase">Measured Value</label>
                            <input 
                              {...form.register(`parameters.${index}.value` as const)}
                              placeholder="e.g. 13.5"
                              className={cn(
                                "w-full mt-1 p-2 border rounded-lg text-xs font-black bg-white shadow-sm",
                                paramAbnormal ? "border-red-500 text-red-600 bg-red-50 font-black" : "border-slate-200"
                              )}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase">Ref Range</label>
                            <input 
                              {...form.register(`parameters.${index}.referenceRange` as const)}
                              placeholder="e.g. 12.0 - 16.0"
                              className="w-full mt-1 p-2 border rounded-lg text-[10px] font-semibold bg-white shadow-sm"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase">Unit</label>
                            <input 
                              {...form.register(`parameters.${index}.unit` as const)}
                              placeholder="e.g. g/dL"
                              className="w-full mt-1 p-2 border rounded-lg text-[10px] font-semibold bg-white shadow-sm"
                            />
                          </div>
                        </div>

                        {paramAbnormal && (
                          <div className="text-[9px] text-red-600 font-bold uppercase animate-pulse">
                            Out of Range (Abnormal)
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => append({ name: '', value: '', referenceRange: '', unit: '', isAbnormal: false })}
                  className="w-full text-xs font-bold uppercase py-2 border-dashed border-2 hover:bg-slate-50"
                >
                  + Add Parameter Row
                </Button>
              </div>
            )}

             <div className="bg-slate-50 p-6 rounded-[32px] border-2 border-dashed border-slate-200 text-center space-y-4">
                <input 
                    type="file" id="report-upload" className="hidden" 
                    accept=".pdf,.jpg,.png" 
                    onChange={(e) => setFile(e.target.files?.[0] || null)} 
                />
                
                {!file ? (
                    <label htmlFor="report-upload" className="cursor-pointer flex flex-col items-center gap-2">
                    <UploadCloud size={32} className="text-blue-600" />
                    <span className="text-[10px] font-black uppercase text-slate-400">Attach Scanned/Digital Report (Optional)</span>
                    </label>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                    <FileCheck size={32} className="text-green-600" />
                    <span className="text-xs font-bold text-black truncate w-48">{file.name}</span>
                    <button type="button" onClick={() => setFile(null)} className="text-[10px] text-red-500 uppercase underline">Change File</button>
                    </div>
                )}
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
            
            <Button type="submit" disabled={form.formState.isSubmitting || uploading || isSaving} className="w-full bg-primary hover:bg-foreground py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">
              {(form.formState.isSubmitting || uploading || isSaving) ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={18}/> Authorize & Release</>}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
