'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, serverTimestamp } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { Send, Hospital, Loader2 } from 'lucide-react';
import { Patient, Hospital as HospitalType } from '@/lib/types';
import { Combobox } from '@/components/ui/combobox';

const ReferralSchema = z.object({
  toHospitalId: z.string().min(1, "Target facility is required"),
  patientId: z.string().min(1, "Patient is required"),
  clinicalSummary: z.string().min(10, "Summary must be at least 10 chars"),
  priority: z.enum(['Routine', 'Urgent', 'Emergency']),
});

/**
 * == Cross-Tenant Referral Tool ==
 * 
 * Tool for clinicians to send patient data to another facility.
 * Enforces atomic creation of the shared Referral record.
 */
export function CreateReferralDialog() {
  const { user } = useAuth();
  const firestore = useFirestore();
  const [open, setOpen] = React.useState(false);

  // DATA SOURCES: Fetch network hospitals and facility patients
  const hospitalQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'hospitals'));
  }, [firestore]);
  const { data: hospitals } = useCollection<HospitalType>(hospitalQuery);

  const patientQuery = useMemoFirebase(() => {
    if (!firestore || !user?.hospitalId) return null;
    return query(collection(firestore, 'patients'), where('hospitalId', '==', user.hospitalId));
  }, [firestore, user?.hospitalId]);
  const { data: patients } = useCollection<Patient>(patientQuery);

  const form = useForm<z.infer<typeof ReferralSchema>>({
    resolver: zodResolver(ReferralSchema),
    defaultValues: {
      toHospitalId: '',
      patientId: '',
      clinicalSummary: '',
      priority: 'Routine',
    },
  });

  const onSubmit = async (values: z.infer<typeof ReferralSchema>) => {
    if (!user || !firestore) return;

    try {
        const targetHosp = hospitals?.find(h => h.hospitalId === values.toHospitalId);
        const patient = patients?.find(p => p.patient_id === values.patientId);

        const referralData = {
            fromHospitalId: user.hospitalId,
            fromHospitalName: (user as any).hospitalName || "Source Facility",
            toHospitalId: values.toHospitalId,
            toHospitalName: targetHosp?.name || "Target Facility",
            patientId: values.patientId,
            patientName: patient?.full_name || "Patient",
            clinicalSummary: values.clinicalSummary,
            status: 'Pending',
            priority: values.priority,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        addDocumentNonBlocking(collection(firestore, 'referrals'), referralData);
        
        toast.success("Referral Sent", {
            description: `Clinical records for ${referralData.patientName} sent to ${referralData.toHospitalName}.`
        });
        
        setOpen(false);
        form.reset();
    } catch (error) {
        toast.error("Process Failed");
    }
  };

  const hospOptions = hospitals?.filter(h => h.hospitalId !== user?.hospitalId).map(h => ({ label: h.name, value: h.hospitalId })) || [];
  const patOptions = patients?.map(p => ({ label: `${p.full_name} (${p.mrn})`, value: p.patient_id })) || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-md">
          <Send className="h-4 w-4" />
          Send New Referral
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2 text-primary">
            <Hospital className="h-5 w-5" />
            <DialogTitle>Inter-Facility Referral</DialogTitle>
          </div>
          <DialogDescription>
            Securely send clinical data to another network provider.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="toHospitalId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Destination Facility</FormLabel>
                  <Combobox
                    options={hospOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Search network hospitals..."
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="patientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Patient to Refer</FormLabel>
                  <Combobox
                    options={patOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select from your registry..."
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Triage Priority</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-muted/30"><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Routine">Routine</SelectItem>
                      <SelectItem value="Urgent">Urgent (STAT)</SelectItem>
                      <SelectItem value="Emergency">Emergency (Red)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="clinicalSummary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Clinical Summary & Indication</FormLabel>
                  <FormControl>
                    <Textarea 
                        placeholder="Why is this patient being referred?" 
                        className="bg-muted/30 h-24"
                        {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Send Referral
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
