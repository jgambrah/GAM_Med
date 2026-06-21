'use client';
import { useState, useMemo, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { HeartPulse, Clock, Save, Thermometer, Zap, Activity, ShieldAlert, Loader2, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useUser, useFirestore, useDoc, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const readingSchema = z.object({
  time: z.string(),
  bp: z.string().min(1, 'Required'),
  pulse: z.string().min(1, 'Required'),
  ufRate: z.string().optional(),
  bloodFlow: z.string().optional(),
  notes: z.string().optional(),
});

type ReadingFormValues = z.infer<typeof readingSchema>;

const THEMES: Record<string, {
  title: string;
  headerBg: string;
  borderColor: string;
  textColor: string;
  badgeBg: string;
  btnBg: string;
  icon: any;
  ufLabel: string;
  bfLabel: string;
}> = {
  DIALYSIS: {
    title: 'Dialysis Live Session',
    headerBg: 'bg-[#0b1329]',
    borderColor: 'border-blue-600',
    textColor: 'text-blue-400',
    badgeBg: 'bg-blue-500/10 text-blue-400',
    btnBg: 'bg-blue-600 hover:bg-blue-700 text-white',
    icon: <Zap size={16} className="text-blue-400" />,
    ufLabel: 'UF Rate (ml/h)',
    bfLabel: 'Blood Flow (ml/min)',
  },
  ONCOLOGY: {
    title: 'Chemotherapy Live Session',
    headerBg: 'bg-[#1c0a10]',
    borderColor: 'border-rose-600',
    textColor: 'text-rose-400',
    badgeBg: 'bg-rose-500/10 text-rose-400',
    btnBg: 'bg-rose-600 hover:bg-rose-700 text-white',
    icon: <HeartPulse size={16} className="text-rose-400" />,
    ufLabel: 'Infusion Rate (ml/h)',
    bfLabel: 'Dose (mg)',
  },
  PHYSIO: {
    title: 'Physiotherapy Live Session',
    headerBg: 'bg-[#061811]',
    borderColor: 'border-emerald-600',
    textColor: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/10 text-emerald-400',
    btnBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    icon: <Activity size={16} className="text-emerald-400" />,
    ufLabel: 'Intensity Level',
    bfLabel: 'Duration (mins)',
  },
};

const defaultTheme = {
  title: 'Specialty Care Session',
  headerBg: 'bg-slate-900',
  borderColor: 'border-slate-600',
  textColor: 'text-slate-400',
  badgeBg: 'bg-slate-500/10 text-slate-400',
  btnBg: 'bg-slate-700 hover:bg-slate-800 text-white',
  icon: <Zap size={16} className="text-slate-400" />,
  ufLabel: 'Parameter A',
  bfLabel: 'Parameter B',
};

export default function ProceduralFlowsheet() {
  const { id: sessionId } = useParams();
  const searchParams = useSearchParams();
  const planId = searchParams.get('planId');
  
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [finishing, setFinishing] = useState(false);
  const [elapsed, setElapsed] = useState('00:00:00');

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const isAuthorized = ['DIRECTOR', 'DOCTOR', 'NURSE', 'ADMIN'].includes(userProfile?.role || '');

  // Load parent plan
  const planDocRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !planId) return null;
    return doc(firestore, `hospitals/${hospitalId}/treatment_plans/${planId}`);
  }, [firestore, hospitalId, planId]);
  const { data: plan, isLoading: isPlanLoading } = useDoc<any>(planDocRef);

  // Load session
  const sessionDocRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !planId || !sessionId) return null;
    return doc(firestore, `hospitals/${hospitalId}/treatment_plans/${planId}/sessions/${sessionId}`);
  }, [firestore, hospitalId, planId, sessionId]);
  const { data: session, isLoading: isSessionLoading } = useDoc<any>(sessionDocRef);

  const form = useForm<ReadingFormValues>({
    resolver: zodResolver(readingSchema),
    defaultValues: {
      time: format(new Date(), 'HH:mm'),
      bp: '',
      pulse: '',
      ufRate: '',
      bloodFlow: '',
      notes: '',
    },
  });

  // Dynamic theme mapping
  const theme = useMemo(() => {
    if (!plan?.serviceType) return defaultTheme;
    return THEMES[plan.serviceType] || defaultTheme;
  }, [plan?.serviceType]);

  // Dynamic session duration ticker
  useEffect(() => {
    if (!session?.startTime) return;
    
    const start = session.startTime.toDate 
      ? session.startTime.toDate() 
      : new Date(session.startTime);

    const updateTimer = () => {
      const diff = Math.max(0, new Date().getTime() - start.getTime());
      const hrs = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff / (1000 * 60)) % 60);
      const secs = Math.floor((diff / 1000) % 60);
      
      const pad = (num: number) => num.toString().padStart(2, '0');
      setElapsed(`${pad(hrs)}:${pad(mins)}:${pad(secs)}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [session?.startTime]);

  const readings = useMemo(() => {
    return session?.readings || [];
  }, [session?.readings]);

  const chartData = useMemo(() => {
    return readings.map((r: any) => ({
      time: r.time,
      Systolic: parseInt(r.bp?.split('/')[0], 10) || null,
      Diastolic: parseInt(r.bp?.split('/')[1], 10) || null,
      Pulse: parseInt(r.pulse, 10) || null,
    }));
  }, [readings]);

  const onSubmit = async (values: ReadingFormValues) => {
    if (!firestore || !hospitalId || !planId || !sessionId || !session) return;
    
    try {
      const updatedReadings = [...readings, values].sort((a: any, b: any) => a.time.localeCompare(b.time));
      const docRef = doc(firestore, `hospitals/${hospitalId}/treatment_plans/${planId}/sessions/${sessionId}`);
      
      updateDocumentNonBlocking(docRef, {
        readings: updatedReadings
      });

      toast({ title: 'Reading Saved', description: 'Session vital indicators updated.' });
      
      form.reset({
        time: format(new Date(), 'HH:mm'),
        bp: '',
        pulse: '',
        ufRate: '',
        bloodFlow: '',
        notes: '',
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error logging reading', description: err.message });
    }
  };

  const handleFinishSession = async () => {
    if (!firestore || !hospitalId || !planId || !sessionId || !session || !plan || !user) return;
    setFinishing(true);

    const batch = writeBatch(firestore);

    try {
      const sessionRef = doc(firestore, `hospitals/${hospitalId}/treatment_plans/${planId}/sessions/${sessionId}`);
      batch.update(sessionRef, {
        status: 'COMPLETED',
        endTime: serverTimestamp(),
      });

      const nextCompleted = (plan.sessionsCompleted || 0) + 1;
      const isPlanFinished = nextCompleted >= plan.sessionsAuthorized;

      const planRef = doc(firestore, `hospitals/${hospitalId}/treatment_plans/${planId}`);
      batch.update(planRef, {
        sessionsCompleted: nextCompleted,
        status: isPlanFinished ? 'COMPLETED' : 'ACTIVE',
      });

      if (plan.linkedKitSku && plan.linkedKitPrice > 0) {
        const billRef = doc(collection(firestore, `hospitals/${hospitalId}/billing_items`));
        batch.set(billRef, {
          hospitalId,
          patientId: plan.patientId,
          patientName: plan.patientName,
          encounterId: sessionId,
          description: `${plan.linkedKitName || 'Consumables Kit'} (Specialty care charge)`,
          category: 'PROCEDURE',
          sku: plan.linkedKitSku,
          unitPrice: plan.linkedKitPrice,
          qty: 1,
          total: plan.linkedKitPrice,
          status: 'UNPAID',
          billedBy: user.uid,
          createdAt: serverTimestamp(),
        });
      }

      await batch.commit();

      toast({
        title: 'Session Completed',
        description: `${plan.patientName}'s session log has been finalized. ${plan.linkedKitSku ? 'Consumables billed.' : ''}`,
      });
      router.push('/specialty/dashboard');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Finish failed', description: err.message });
      setFinishing(false);
    }
  };

  const pageLoading = isUserLoading || isProfileLoading || isPlanLoading || isSessionLoading;

  if (pageLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-4">
        <div className="text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You are not authorized to access this treatment session.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-4">
        <div className="text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Session Not Found</h1>
          <p className="text-muted-foreground">The requested treatment session does not exist or has expired.</p>
          <Button onClick={() => router.push('/specialty/dashboard')} className="mt-4">Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  const isSessionClosed = session.status === 'COMPLETED';

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto text-black font-bold">
      <div className={cn("p-8 rounded-[40px] text-white shadow-2xl flex justify-between items-center border-b-8", theme.headerBg, theme.borderColor)}>
         <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter italic">{theme.title}</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Station: {plan?.unitName} • Patient: {plan?.patientName}</p>
         </div>
         <div className="flex items-center gap-6">
            <div className="text-right">
               <p className={cn("text-[10px] font-black uppercase", theme.textColor)}>Session Duration</p>
               <p className="text-2xl font-black italic">{isSessionClosed ? 'FINISHED' : elapsed}</p>
            </div>
            {isSessionClosed ? (
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest">
                Completed
              </span>
            ) : (
              <Button 
                onClick={handleFinishSession} 
                disabled={finishing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs tracking-wider px-6 py-6 rounded-2xl flex items-center gap-2"
              >
                {finishing ? <Loader2 className="animate-spin" /> : <Save size={16} />}
                Finish Session
              </Button>
            )}
         </div>
      </div>

      {!isSessionClosed && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="bg-card p-6 rounded-[32px] border shadow-sm space-y-4">
              <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">New Log Entry</h3>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 items-end">
                  <FlowInput name="time" label="Time" control={form.control} type="time" />
                  <FlowInput name="bp" label="BP (mmHg)" control={form.control} placeholder="e.g. 120/80" />
                  <FlowInput name="pulse" label="Pulse (bpm)" control={form.control} placeholder="e.g. 72" />
                  <FlowInput name="ufRate" label={theme.ufLabel} control={form.control} placeholder="optional" />
                  <FlowInput name="bloodFlow" label={theme.bfLabel} control={form.control} placeholder="optional" />
                  <Button type="submit" className={cn("w-full font-black uppercase text-xs tracking-wider h-11 rounded-2xl", theme.btnBg)}>Log Reading</Button>
              </div>
          </form>
        </Form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-card p-8 rounded-[40px] border shadow-sm">
            <p className="text-[10px] font-black text-muted-foreground uppercase mb-4 tracking-widest">Intra-Procedural Pressure Curve</p>
            <div className="h-64 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 italic text-xs p-2">
              {readings.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 20, right: 30, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="time" tick={{fontSize: 10}} />
                    <YAxis tick={{fontSize: 10}} />
                    <Tooltip />
                    <Legend wrapperStyle={{fontSize: "12px"}} />
                    <Line type="monotone" dataKey="Systolic" stroke="#ef4444" strokeWidth={2} activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="Diastolic" stroke="#f97316" strokeWidth={2} />
                    <Line type="monotone" dataKey="Pulse" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <span className="text-slate-400">No chart data to render yet.</span>
              )}
            </div>
        </div>
        <div className="bg-card p-6 rounded-[32px] border shadow-sm">
            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest border-b pb-3 mb-3">Readings Log</h3>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {readings.map((r: any, i: number) => (
                    <div key={i} className="bg-muted/50 p-3 rounded-xl text-xs font-bold flex justify-between items-center">
                        <div>
                          <span className="font-black text-primary mr-3">{r.time}</span>
                          <span>BP: {r.bp}</span> | <span>Pulse: {r.pulse}</span>
                          {(r.ufRate || r.bloodFlow) && (
                            <span className="text-muted-foreground block text-[10px] mt-0.5">
                              {theme.ufLabel.split(' ')[0]}: {r.ufRate || '--'} | {theme.bfLabel.split(' ')[0]}: {r.bloodFlow || '--'}
                            </span>
                          )}
                        </div>
                        {theme.icon}
                    </div>
                ))}
                {readings.length === 0 && <p className="text-center text-muted-foreground italic text-xs py-10">No readings logged yet.</p>}
            </div>
        </div>
      </div>
    </div>
  );
}

function FlowInput({name, label, control, type="text", placeholder}: any) {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">{label}</FormLabel>
                    <FormControl>
                        <Input type={type} placeholder={placeholder} className="w-full text-sm font-bold bg-muted/30 border-2 rounded-xl text-black h-11" {...field} />
                    </FormControl>
                </FormItem>
            )}
        />
    );
}
