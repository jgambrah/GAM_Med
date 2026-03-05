'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, serverTimestamp, doc, orderBy } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Pill, ClipboardCheck, Save, Clock, Loader2, User, BedDouble, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { DischargeDialog } from '@/components/clinical/DischargeDialog';

const roundSchema = z.object({
  nursingNotes: z.string().optional(),
  medicationsAdministered: z.string().optional(),
  vitals: z.object({
    temp: z.string().optional(),
    bp: z.string().optional(),
    pulse: z.string().optional(),
    respiration: z.string().optional(),
    spo2: z.string().optional(),
  }),
});

type RoundFormValues = z.infer<typeof roundSchema>;

export default function NursingTreatmentChart() {
  const { admissionId } = useParams();
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
    } else if (!isClaimsLoading && !user) {
      setIsClaimsLoading(false);
    }
  }, [user]);

  const hospitalId = claims?.hospitalId;

  // 1. Fetch the main admission record
  const admissionRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !admissionId) return null;
    return doc(firestore, `hospitals/${hospitalId}/admissions`, admissionId as string);
  }, [firestore, hospitalId, admissionId]);
  const { data: admission, isLoading: isAdmissionLoading } = useDoc(admissionRef);

  // 2. Fetch all previous rounds for this admission
  const roundsQuery = useMemoFirebase(() => {
    if (!admissionRef) return null;
    return query(collection(admissionRef, 'rounds'), orderBy('createdAt', 'desc'));
  }, [admissionRef]);
  const { data: rounds, isLoading: areRoundsLoading } = useCollection(roundsQuery);
  
  const form = useForm<RoundFormValues>({
    resolver: zodResolver(roundSchema),
    defaultValues: { vitals: {} },
  });

  const onSubmit = (values: RoundFormValues) => {
    if (!user || !admissionRef || !admission) return;
    
    addDocumentNonBlocking(collection(admissionRef, 'rounds'), {
        ...values,
        admissionId: admissionId,
        patientId: admission.patientId,
        patientName: admission.patientName,
        hospitalId: hospitalId,
        nurseId: user.uid,
        nurseName: user.displayName,
        createdAt: serverTimestamp()
    });

    toast({ title: 'Nursing Round Documented Successfully' });
    form.reset();
  };
  
  const isLoading = isClaimsLoading || isAdmissionLoading;
  const isDischarged = admission?.status === 'DISCHARGED';

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
        {isLoading ? <Skeleton className="h-24 w-full" /> : (
            <div className="flex justify-between items-center gap-4 border-b pb-6">
                <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-2xl text-primary shadow-lg">
                        <ClipboardCheck size={28} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-tighter text-foreground">Nursing <span className="text-primary">Round Chart</span></h1>
                        <div className="flex items-center divide-x-2 mt-1">
                            <span className="text-xs font-bold text-muted-foreground uppercase pr-3 flex items-center gap-1"><User size={12}/>{admission?.patientName}</span>
                            <span className="text-xs font-bold text-muted-foreground uppercase px-3 flex items-center gap-1"><BedDouble size={12}/>{admission?.bedId}</span>
                        </div>
                    </div>
                </div>
                {!isDischarged && admission && <DischargeDialog admission={admission} />}
            </div>
        )}

        {isDischarged && (
            <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-800 p-4 rounded-r-lg" role="alert">
                <div className="flex items-center gap-3">
                    <AlertTriangle />
                    <div>
                        <p className="font-bold">Patient Discharged</p>
                        <p className="text-sm">This admission record is closed and read-only. No further rounds can be added.</p>
                    </div>
                </div>
            </div>
        )}

        {/* Form to add a new round */}
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="bg-card p-8 rounded-[40px] border shadow-sm space-y-8">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                   <VitalInput name="vitals.temp" label="Temp (°C)" control={form.control} disabled={isDischarged} />
                   <VitalInput name="vitals.bp" label="BP (mmHg)" control={form.control} disabled={isDischarged} />
                   <VitalInput name="vitals.pulse" label="Pulse (bpm)" control={form.control} disabled={isDischarged} />
                   <VitalInput name="vitals.respiration" label="Resp." control={form.control} disabled={isDischarged} />
                   <VitalInput name="vitals.spo2" label="SPO2 (%)" control={form.control} disabled={isDischarged} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t">
                    <FormField control={form.control} name="medicationsAdministered" render={({ field }) => (
                        <FormItem><FormLabel className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"><Pill size={16} className="text-primary"/>Medication Administered</FormLabel>
                        <FormControl><Textarea placeholder="e.g. IV Ceftriaxone 1g given at 8:00 AM..." {...field} disabled={isDischarged} /></FormControl>
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="nursingNotes" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Nursing Notes</FormLabel>
                        <FormControl><Textarea placeholder="e.g. Patient is conscious and alert, complains of mild headache..." {...field} disabled={isDischarged} /></FormControl>
                        </FormItem>
                    )}/>
                </div>

                <Button type="submit" disabled={form.formState.isSubmitting || isDischarged} className="w-full">
                    {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : <><Save size={16}/> Authorize & Sign Round</>}
                </Button>
            </form>
        </Form>
        
        {/* Timeline of previous rounds */}
        <div className="space-y-4 pt-8">
            <h3 className="text-xs text-muted-foreground font-black uppercase tracking-widest">Previous Rounds</h3>
            {areRoundsLoading && <p className="text-muted-foreground italic">Loading history...</p>}
            {rounds?.map(round => (
                <div key={round.id} className="bg-card p-4 rounded-2xl border flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="bg-muted px-2 py-1 rounded-lg text-xs font-bold">{round.createdAt ? format(round.createdAt.toDate(), 'p') : ''}</div>
                            <p className="text-sm"><strong className="text-primary">{round.vitals?.bp || 'N/A'}</strong> mmHg</p>
                            <p className="text-sm"><strong className="text-primary">{round.vitals?.pulse || 'N/A'}</strong> bpm</p>
                            <p className="text-sm"><strong className="text-primary">{round.vitals?.temp || 'N/A'}</strong> °C</p>
                        </div>
                        {round.nursingNotes && <p className="text-xs text-muted-foreground mt-2 italic">"{round.nursingNotes}"</p>}
                        {round.medicationsAdministered && <p className="text-xs text-primary/80 mt-2 font-mono"><span className="font-bold">Meds:</span> {round.medicationsAdministered}</p>}
                    </div>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase text-right shrink-0">
                       By {round.nurseName}<br/>
                       {round.createdAt ? format(round.createdAt.toDate(), 'PP') : ''}
                    </div>
                </div>
            ))}
             {!areRoundsLoading && rounds?.length === 0 && <p className="text-center text-muted-foreground italic py-8">No rounds recorded for this admission yet.</p>}
        </div>
    </div>
  );
}

function VitalInput({ name, label, control, disabled }: any) {
    return (
        <FormField control={control} name={name} render={({ field }) => (
            <FormItem>
                <FormLabel className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">{label}</FormLabel>
                <FormControl>
                    <Input className="font-black text-center" {...field} disabled={disabled} />
                </FormControl>
            </FormItem>
        )} />
    );
}
