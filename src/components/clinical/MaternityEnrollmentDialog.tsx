'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser, useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Baby, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { add, format } from 'date-fns';

// Form validation schema
const enrollmentSchema = z.object({
  lmp: z.string().min(1, "LMP is required to calculate EDD."),
  gravida: z.coerce.number().min(1, "Gravida is required."),
  para: z.coerce.number().min(0, "Para is required."),
  bloodGroup: z.string().min(1, "Blood group is required."),
  rhesusFactor: z.enum(['Positive', 'Negative']),
  sicklingStatus: z.string().min(1, "Sickling status is required."),
  tetanusDiphtheriaStatus: z.string().optional(),
});

type EnrollmentFormValues = z.infer<typeof enrollmentSchema>;

interface MaternityEnrollmentDialogProps {
  patientId: string;
  patientName: string;
  hospitalId: string;
}

export function MaternityEnrollmentDialog({ patientId, hospitalId, patientName }: MaternityEnrollmentDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [calculatedEdd, setCalculatedEdd] = useState<string | null>(null);

  const form = useForm<EnrollmentFormValues>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: {
      gravida: 1,
      para: 0,
      rhesusFactor: 'Positive'
    }
  });

  const lmpValue = form.watch('lmp');

  // Automatic EDD Calculation (Naegele's Rule)
  useEffect(() => {
    if (lmpValue) {
      try {
        const lmpDate = new Date(lmpValue);
        // Add 7 days, then 9 months. Or add 1 year, subtract 3 months, add 7 days.
        const eddDate = add(lmpDate, { days: 7, months: 9 });
        setCalculatedEdd(format(eddDate, 'yyyy-MM-dd'));
      } catch (e) {
        setCalculatedEdd(null); // Invalid date
      }
    } else {
      setCalculatedEdd(null);
    }
  }, [lmpValue]);

  const onSubmit = async (values: EnrollmentFormValues) => {
    if (!user || !calculatedEdd) {
      toast({ variant: "destructive", title: "Missing Information", description: "User not found or EDD not calculated." });
      return;
    }
    setLoading(true);

    try {
      const profilesCollection = collection(firestore, `hospitals/${hospitalId}/patients/${patientId}/maternity_profiles`);
      await addDocumentNonBlocking(profilesCollection, {
        ...values,
        patientId,
        patientName,
        hospitalId,
        edd: calculatedEdd,
        enrolledBy: user.uid,
        status: 'ACTIVE_PREGNANCY',
        createdAt: serverTimestamp(),
      });
      
      toast({
        title: "Maternity Profile Activated",
        description: `${patientName} has been enrolled for antenatal care.`,
      });
      form.reset();
      setOpen(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Enrollment Failed", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="bg-pink-600 hover:bg-pink-700 text-white font-bold uppercase tracking-widest text-[10px]">
          <Baby /> Enroll Maternity
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 font-black tracking-tighter uppercase text-xl"><Baby className="text-pink-500" /> New Maternity Enrollment</DialogTitle>
          <DialogDescription>Creating a new pregnancy profile for {patientName}.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-h-[70vh] overflow-y-auto pr-4 pt-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
               <FormField
                control={form.control}
                name="lmp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Menstrual Period (LMP)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 h-full flex flex-col justify-center">
                <FormLabel className="text-[10px] font-black text-blue-400 uppercase">Calculated EDD</FormLabel>
                <p className="text-xl font-black text-blue-900">{calculatedEdd ? format(new Date(calculatedEdd), 'PPP') : 'Select LMP'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <FormField control={form.control} name="gravida" render={({ field }) => (
                  <FormItem><FormLabel>Gravida</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
               <FormField control={form.control} name="para" render={({ field }) => (
                  <FormItem><FormLabel>Para</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="bloodGroup" render={({ field }) => (
                  <FormItem><FormLabel>Blood Group</FormLabel><FormControl><Input placeholder="e.g. O+" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="sicklingStatus" render={({ field }) => (
                  <FormItem><FormLabel>Sickling</FormLabel><FormControl><Input placeholder="e.g. AS" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
            </div>
             <FormField control={form.control} name="rhesusFactor" render={({ field }) => (
                <FormItem><FormLabel>Rhesus Factor</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select Rh Factor" /></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="Positive">Positive</SelectItem><SelectItem value="Negative">Negative</SelectItem></SelectContent>
                </Select><FormMessage /></FormItem>
             )}/>
             <FormField control={form.control} name="tetanusDiphtheriaStatus" render={({ field }) => (
                  <FormItem><FormLabel>Tetanus-Diphtheria Status (Optional)</FormLabel><FormControl><Input placeholder="e.g., Fully immunized" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>

            <DialogFooter className="sticky bottom-0 bg-background pt-4 pb-0 -mx-6 px-6">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : <Save />}
                Activate Profile
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
