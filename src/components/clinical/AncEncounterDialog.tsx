'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Baby, Loader2, Save } from 'lucide-react';
import { useFirebaseApp } from '@/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '../ui/input';

const ancEncounterSchema = z.object({
  diagnosis: z.string().optional(),
  ancData: z.object({
    fundalHeight: z.coerce.number().optional(),
    fetalHeartRate: z.coerce.number().optional(),
    presentation: z.string().optional(),
    fetalMovement: z.string().optional(),
    urineProtein: z.string().optional(),
    urineSugar: z.string().optional(),
    edema: z.string().optional(),
  }),
});

type AncEncounterFormValues = z.infer<typeof ancEncounterSchema>;

interface AncEncounterDialogProps {
  patientId: string;
  hospitalId: string;
  patientName: string;
  maternityProfileId: string;
}

export function AncEncounterDialog({ patientId, hospitalId, patientName, maternityProfileId }: AncEncounterDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const firebaseApp = useFirebaseApp();
  const { toast } = useToast();

  const form = useForm<AncEncounterFormValues>({
    resolver: zodResolver(ancEncounterSchema),
    defaultValues: {
      ancData: {
        presentation: 'Cephalic',
        fetalMovement: 'Active',
        urineProtein: 'Negative',
        urineSugar: 'Negative',
        edema: 'None'
      }
    },
  });

  const onSubmit = async (values: AncEncounterFormValues) => {
    if (!firebaseApp) {
      toast({ variant: 'destructive', title: 'Error', description: 'System not ready.' });
      return;
    }
    setLoading(true);
    const functions = getFunctions(firebaseApp);
    const createEncounter = httpsCallable(functions, 'createEncounter');
    
    const payload = {
        ...values,
        patientId,
        hospitalId,
        patientName,
        encounterType: 'ANC Visit', // Hardcode the type for this specialized dialog
    };

    try {
      await createEncounter(payload);
      toast({
        title: 'ANC Visit Logged',
        description: `Routine check-up recorded for ${patientName}.`,
      });
      form.reset();
      setOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold uppercase tracking-widest text-[10px]">
          <Baby size={16} /> New ANC Visit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader className="p-6">
              <DialogTitle className="flex items-center gap-3 font-black tracking-tighter uppercase text-xl">
                <Baby className="text-pink-500" /> Routine ANC Encounter
              </DialogTitle>
              <DialogDescription className="text-xs uppercase font-bold">Patient: {patientName}</DialogDescription>
            </DialogHeader>

            <div className="px-6 py-4 space-y-6 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 bg-pink-50/50 p-6 rounded-[32px] border border-pink-100">
                <FormField
                  control={form.control}
                  name="ancData.fundalHeight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black text-pink-600 uppercase tracking-widest">Fundal Height (cm)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="ancData.fetalHeartRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black text-pink-600 uppercase tracking-widest">Fetal Heart Rate (bpm)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="ancData.presentation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black text-pink-600 uppercase tracking-widest">Presentation</FormLabel>
                       <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="Cephalic">Cephalic</SelectItem>
                            <SelectItem value="Breech">Breech</SelectItem>
                            <SelectItem value="Transverse">Transverse</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

               <FormField
                control={form.control}
                name="diagnosis"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Clinical Notes / Diagnosis</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Any clinical findings for this visit..." {...field} />
                        </FormControl>
                    </FormItem>
                )}
               />

            </div>

            <DialogFooter className="p-6 bg-muted/50">
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading} className="bg-pink-600 hover:bg-pink-700">
                {loading ? <Loader2 className="animate-spin" /> : <Save />}
                Save ANC Visit
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
