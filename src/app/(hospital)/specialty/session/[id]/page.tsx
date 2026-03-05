'use client';
import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { HeartPulse, Clock, Droplets, Save, Thermometer, Zap, Wind, Plus } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const readingSchema = z.object({
  time: z.string(),
  bp: z.string().min(1, 'Required'),
  pulse: z.string().min(1, 'Required'),
  ufRate: z.string().optional(),
  bloodFlow: z.string().optional(),
  notes: z.string().optional(),
});

type ReadingFormValues = z.infer<typeof readingSchema>;

// Mock data for now
const mockSession = {
  patientName: 'Kwame Mensah',
  stationId: 'D-04',
  startTime: new Date(new Date().getTime() - (2 * 60 * 60 * 1000)), // 2 hours ago
};


export default function ProceduralFlowsheet() {
  const { id: sessionId } = useParams();
  const [readings, setReadings] = useState<ReadingFormValues[]>([]);
  
  const form = useForm<ReadingFormValues>({
    resolver: zodResolver(readingSchema),
    defaultValues: {
      time: format(new Date(), 'HH:mm'),
      bp: '',
      pulse: '',
    },
  });

  const onSubmit = (values: ReadingFormValues) => {
    setReadings(prev => [...prev, values].sort((a,b) => a.time.localeCompare(b.time)));
    form.reset({
        time: format(new Date(), 'HH:mm'),
        bp: '',
        pulse: '',
        ufRate: '',
        bloodFlow: '',
        notes: '',
    });
  };

  const chartData = useMemo(() => {
    return readings.map(r => ({
      time: r.time,
      Systolic: parseInt(r.bp.split('/')[0], 10) || null,
      Diastolic: parseInt(r.bp.split('/')[1], 10) || null,
      Pulse: parseInt(r.pulse, 10) || null,
    }));
  }, [readings]);


  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="bg-[#0f172a] p-8 rounded-[40px] text-white shadow-2xl flex justify-between items-center border-b-8 border-primary">
         <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter italic">Dialysis <span className="text-blue-400">Live Session</span></h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Station: {mockSession.stationId} • Patient: {mockSession.patientName}</p>
         </div>
         <div className="text-right">
            <p className="text-[10px] font-black text-blue-400 uppercase">Session Duration</p>
            <p className="text-2xl font-black italic">02:14:45</p>
         </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="bg-card p-6 rounded-[32px] border shadow-sm space-y-4">
            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">New Log Entry</h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 items-end">
                <FlowInput name="time" label="Time" control={form.control} type="time" />
                <FlowInput name="bp" label="BP (mmHg)" control={form.control} placeholder="e.g. 120/80" />
                <FlowInput name="pulse" label="Pulse (bpm)" control={form.control} />
                <FlowInput name="ufRate" label="UF Rate" control={form.control} />
                <FlowInput name="bloodFlow" label="Blood Flow" control={form.control} />
                <Button type="submit" className="w-full">Log Reading</Button>
            </div>
        </form>
      </Form>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-card p-8 rounded-[40px] border shadow-sm">
            <p className="text-[10px] font-black text-muted-foreground uppercase mb-4 tracking-widest">Intra-Dialytic Pressure Curve</p>
            <div className="h-64 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 italic text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="time" tick={{fontSize: 10}} />
                  <YAxis tick={{fontSize: 10}} />
                  <Tooltip />
                  <Legend wrapperStyle={{fontSize: "12px"}} />
                  <Line type="monotone" dataKey="Systolic" stroke="#ef4444" strokeWidth={2} />
                  <Line type="monotone" dataKey="Diastolic" stroke="#f97316" strokeWidth={2} />
                  <Line type="monotone" dataKey="Pulse" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
        </div>
        <div className="bg-card p-6 rounded-[32px] border shadow-sm">
            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest border-b pb-3 mb-3">Readings Log</h3>
            <div className="space-y-2 max-h-72 overflow-y-auto">
                {readings.map((r, i) => (
                    <div key={i} className="bg-muted/50 p-3 rounded-xl text-xs font-bold">
                        <span className="font-black text-primary mr-3">{r.time}</span>
                        <span>BP: {r.bp}</span>, <span>Pulse: {r.pulse}</span>
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
                        <Input type={type} placeholder={placeholder} className="w-full text-lg font-black bg-muted/50" {...field} />
                    </FormControl>
                </FormItem>
            )}
        />
    );
}
