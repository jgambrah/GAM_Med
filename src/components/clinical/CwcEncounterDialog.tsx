'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Baby, Loader2, Save, Syringe, Sparkles } from 'lucide-react';
import { useFirebaseApp } from '@/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '../ui/input';

const cwcEncounterSchema = z.object({
  diagnosis: z.string().optional(),
  vitals: z.object({
    temp: z.string().optional(),
    weight: z.string().optional(),
    height: z.string().optional(),
    headCircumference: z.string().optional(),
    muac: z.string().optional(),
    feedingMethod: z.string().optional(),
    pulse: z.string().optional(),
    respiration: z.string().optional(),
    spo2: z.string().optional(),
  }),
  cwcData: z.object({
    vaccinesAdministered: z.array(z.string()).default([]),
    milestonesObserved: z.array(z.string()).default([]),
    nextCwcDate: z.string().optional(),
  })
});

type CwcEncounterFormValues = z.infer<typeof cwcEncounterSchema>;

interface CwcEncounterDialogProps {
  patientId: string;
  hospitalId: string;
  patientName: string;
  onSuccess?: () => void;
}

const standardVaccines = [
  "BCG", "OPV 0", "OPV 1", "OPV 2", "OPV 3",
  "IPV 1", "IPV 2", "Rotavirus 1", "Rotavirus 2",
  "PCV 1", "PCV 2", "PCV 3", "Pentavalent 1", "Pentavalent 2", "Pentavalent 3",
  "MR 1", "MR 2", "Yellow Fever", "Vitamin A"
];

const standardMilestones = [
  "Social Smile", "Head Control", "Sitting", "Crawling", "Standing", "Walking", "Babbling", "Speaking words"
];

export function CwcEncounterDialog({ patientId, hospitalId, patientName, onSuccess }: CwcEncounterDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'VITALS' | 'VACCINES'>('VITALS');
  const firebaseApp = useFirebaseApp();
  const { toast } = useToast();

  const form = useForm<CwcEncounterFormValues>({
    resolver: zodResolver(cwcEncounterSchema),
    defaultValues: {
      diagnosis: '',
      vitals: {
        temp: '',
        weight: '',
        height: '',
        headCircumference: '',
        muac: '',
        feedingMethod: 'Exclusive Breastfeeding',
        pulse: '',
        respiration: '',
        spo2: '',
      },
      cwcData: {
        vaccinesAdministered: [],
        milestonesObserved: [],
        nextCwcDate: '',
      }
    },
  });

  const onSubmit = async (values: CwcEncounterFormValues) => {
    if (!firebaseApp) {
      toast({ variant: 'destructive', title: 'Error', description: 'System not ready.' });
      return;
    }
    setLoading(true);
    const functions = getFunctions(firebaseApp);
    const createEncounter = httpsCallable(functions, 'createEncounter');
    
    // Auto-calculate BMI if weight/height are entered
    const weightNum = parseFloat(values.vitals.weight || '0');
    const heightNum = parseFloat(values.vitals.height || '0') / 100;
    let bmiVal = '0.0';
    if (weightNum > 0 && heightNum > 0) {
      bmiVal = (weightNum / (heightNum * heightNum)).toFixed(1);
    }

    const payload = {
        ...values,
        patientId,
        hospitalId,
        patientName,
        encounterType: 'Child Welfare (CWC) Checkup', // Specialized encounter type
        chiefComplaint: 'Routine CWC / Growth Monitoring Checkup',
        diagnosis: values.diagnosis || 'Healthy Child Exam / Routine Growth Monitoring',
        vitals: {
          ...values.vitals,
          bp: '',
          bmi: bmiVal,
        }
    };

    try {
      await createEncounter(payload);
      toast({
        title: 'CWC Visit Logged',
        description: `Child Welfare Check-up recorded for ${patientName}.`,
      });
      form.reset();
      setSelectedVaccinesList([]);
      setSelectedMilestonesList([]);
      onSuccess?.();
      setOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const [selectedVaccinesList, setSelectedVaccinesList] = useState<string[]>([]);
  const [selectedMilestonesList, setSelectedMilestonesList] = useState<string[]>([]);

  const toggleVaccine = (vaccine: string) => {
    const next = selectedVaccinesList.includes(vaccine)
      ? selectedVaccinesList.filter(v => v !== vaccine)
      : [...selectedVaccinesList, vaccine];
    setSelectedVaccinesList(next);
    form.setValue('cwcData.vaccinesAdministered', next);
  };

  const toggleMilestone = (milestone: string) => {
    const next = selectedMilestonesList.includes(milestone)
      ? selectedMilestonesList.filter(m => m !== milestone)
      : [...selectedMilestonesList, milestone];
    setSelectedMilestonesList(next);
    form.setValue('cwcData.milestonesObserved', next);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-sky-600 hover:bg-sky-700 text-white font-bold uppercase tracking-widest text-[10px] flex items-center gap-1.5 shadow-sm rounded-xl">
          <Baby size={14} className="animate-bounce" /> CWC Log
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl rounded-[32px] overflow-hidden p-0 border-4 border-slate-900 bg-white">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader className="p-8 bg-sky-600 text-white border-b-4 border-slate-900">
              <DialogTitle className="flex items-center gap-3 font-black tracking-tighter uppercase text-2xl italic">
                <div className="bg-white p-2 rounded-2xl text-sky-600 shadow-md">
                  <Baby size={24} />
                </div>
                Child Welfare <span className="text-sky-200">Clinic Log (CWC)</span>
              </DialogTitle>
              <DialogDescription className="text-xs uppercase font-bold text-sky-100 tracking-wider mt-2 pl-1">
                Routine Growth, Vaccine &amp; Milestone Log • {patientName}
              </DialogDescription>
            </DialogHeader>

            <div className="flex border-b border-slate-200 font-bold bg-slate-50">
              <button
                type="button"
                onClick={() => setActiveSubTab('VITALS')}
                className={`flex-1 py-4 text-xs uppercase tracking-wider border-r border-slate-200 transition-all ${
                  activeSubTab === 'VITALS' ? 'bg-white text-sky-600 font-black border-b-4 border-b-sky-600' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                1. Growth &amp; Vitals
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('VACCINES')}
                className={`flex-1 py-4 text-xs uppercase tracking-wider transition-all ${
                  activeSubTab === 'VACCINES' ? 'bg-white text-sky-600 font-black border-b-4 border-b-sky-600' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                2. Immunizations &amp; Milestones
              </button>
            </div>

            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto text-black">
              {activeSubTab === 'VITALS' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
                  {/* Pediatric growth parameters */}
                  <div className="bg-sky-50/50 p-6 rounded-[32px] border-2 border-sky-100 space-y-6">
                    <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest border-l-4 border-sky-500 pl-3">Primary Pediatric Metrics</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <FormField
                        control={form.control}
                        name="vitals.weight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Weight (kg)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="e.g. 5.2" className="font-bold rounded-xl border-2" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="vitals.height"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Length / Height (cm)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.1" placeholder="e.g. 58.0" className="font-bold rounded-xl border-2" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="vitals.headCircumference"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Head Circumference (cm)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.1" placeholder="e.g. 38.5" className="font-bold rounded-xl border-2" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="vitals.muac"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[9px] font-black text-slate-500 uppercase tracking-widest">MUAC (cm)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.1" placeholder="e.g. 12.5" className="font-bold rounded-xl border-2" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Standard vitals */}
                  <div className="bg-slate-50 p-6 rounded-[32px] border space-y-6">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest border-l-4 border-slate-500 pl-3">Standard Clinical Vitals</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <FormField
                        control={form.control}
                        name="vitals.temp"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[9px] font-black text-slate-400 uppercase">Temp (°C)</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. 36.8" className="font-bold rounded-xl" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="vitals.pulse"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[9px] font-black text-slate-400 uppercase">Pulse (bpm)</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. 120" className="font-bold rounded-xl" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="vitals.respiration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[9px] font-black text-slate-400 uppercase">Respiration (bpm)</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. 30" className="font-bold rounded-xl" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="vitals.spo2"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[9px] font-black text-slate-400 uppercase">SpO2 (%)</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. 98" className="font-bold rounded-xl" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="vitals.feedingMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Feeding &amp; Nutrition</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="rounded-xl border-2 font-bold p-4 h-12 bg-white">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-white text-black font-semibold">
                              <SelectItem value="Exclusive Breastfeeding">Exclusive Breastfeeding (EBF)</SelectItem>
                              <SelectItem value="Mixed Feeding">Mixed Feeding</SelectItem>
                              <SelectItem value="Formula Feeding">Formula Feeding</SelectItem>
                              <SelectItem value="Complementary Feeding">Complementary Feeding</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cwcData.nextCwcDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Next Weight/CWC Visit</FormLabel>
                          <FormControl>
                            <Input type="date" className="rounded-xl border-2 font-bold h-12 bg-white" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {activeSubTab === 'VACCINES' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                  {/* Immunizations Section */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest border-l-4 border-sky-500 pl-3 flex items-center gap-1">
                      <Syringe size={12} /> Immunizations Administered Today
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 bg-slate-50 p-4 rounded-2xl border">
                      {standardVaccines.map((vaccine) => {
                        const isChecked = selectedVaccinesList.includes(vaccine);
                        return (
                          <button
                            key={vaccine}
                            type="button"
                            onClick={() => toggleVaccine(vaccine)}
                            className={`p-2.5 rounded-xl border text-[10px] font-black uppercase text-left transition-all flex items-center justify-between ${
                              isChecked
                                ? 'bg-sky-600 border-sky-600 text-white shadow-sm'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <span>{vaccine}</span>
                            {isChecked && <Sparkles size={10} className="text-sky-200" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Milestones observed */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest border-l-4 border-indigo-500 pl-3">
                      Developmental Milestones Observed
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 bg-slate-50 p-4 rounded-2xl border">
                      {standardMilestones.map((milestone) => {
                        const isChecked = selectedMilestonesList.includes(milestone);
                        return (
                          <button
                            key={milestone}
                            type="button"
                            onClick={() => toggleMilestone(milestone)}
                            className={`p-2.5 rounded-xl border text-[10px] font-black uppercase text-left transition-all flex items-center justify-between ${
                              isChecked
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <span>{milestone}</span>
                            {isChecked && <Sparkles size={10} className="text-indigo-200" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Notes / Assessment */}
                  <FormField
                    control={form.control}
                    name="diagnosis"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black text-slate-500 uppercase tracking-widest">General Developmental Notes / Remarks</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Describe baby's nutritional status, skin, muscle tone, general alertness, or counsel given..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            <DialogFooter className="p-6 bg-slate-50 border-t-2 border-slate-100 flex justify-between items-center gap-3">
              <Button type="button" variant="ghost" className="rounded-xl font-bold uppercase text-xs text-slate-600 hover:bg-slate-200" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-sky-600 hover:bg-sky-700 text-white font-black uppercase tracking-wider text-xs px-6 py-5 rounded-xl flex items-center gap-2">
                {loading ? <Loader2 className="animate-spin" /> : <Save size={14} />}
                Sign &amp; Commit Check-up
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
