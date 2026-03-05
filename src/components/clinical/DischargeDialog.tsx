'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser, useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp, increment } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { FileText, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

const dischargeSchema = z.object({
  dischargeSummary: z.string().min(20, "A detailed discharge summary is required."),
});

type DischargeFormValues = z.infer<typeof dischargeSchema>;

interface DischargeDialogProps {
  admission: any; // Consider creating a type for this
}

export function DischargeDialog({ admission }: DischargeDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<DischargeFormValues>({
    resolver: zodResolver(dischargeSchema),
  });

  const onSubmit = async (values: DischargeFormValues) => {
    if (!user || !firestore || !admission) {
      toast({ variant: 'destructive', title: 'Error', description: 'System not ready or admission data missing.' });
      return;
    }
    setLoading(true);

    const admissionRef = doc(firestore, `hospitals/${admission.hospitalId}/admissions`, admission.id);
    const bedRef = doc(firestore, `hospitals/${admission.hospitalId}/wards/${admission.wardId}/beds/${admission.bedId}`);
    const wardRef = doc(firestore, `hospitals/${admission.hospitalId}/wards/${admission.wardId}`);

    try {
      // Use batch writes for atomicity if this were a backend function
      // For client-side, we perform them sequentially.

      // 1. Mark Admission as DISCHARGED and add summary
      updateDocumentNonBlocking(admissionRef, {
        status: 'DISCHARGED',
        dischargedAt: serverTimestamp(),
        dischargedBy: user.uid,
        dischargeSummary: values.dischargeSummary,
      });

      // 2. Free up the Bed
      updateDocumentNonBlocking(bedRef, {
        status: 'Available',
        patientId: null,
        patientName: null,
        admittedAt: null,
      });

      // 3. Decrement Ward Occupancy
      updateDocumentNonBlocking(wardRef, {
        occupancy: increment(-1),
      });

      toast({
        title: "Patient Discharged Successfully",
        description: `${admission.patientName} has been discharged. Bed ${admission.bedId} is now available.`,
      });
      setOpen(false);
      router.push('/wards/management');

    } catch (err: any) {
      toast({ variant: "destructive", title: "Discharge Failed", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">
          Discharge Patient
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 font-black tracking-tighter uppercase text-xl"><FileText /> Discharge Summary</DialogTitle>
          <DialogDescription>Finalizing admission for {admission?.patientName}. This action will free up bed {admission?.bedId}.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="dischargeSummary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Clinical Summary of Admission</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Summarize the reason for admission, treatment provided, and patient's condition upon discharge."
                      rows={8}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : <Save />}
                Confirm & Finalize Discharge
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
