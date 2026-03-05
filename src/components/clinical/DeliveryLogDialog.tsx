'use client';
import { useState } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc, useFirebaseApp } from '@/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, doc, serverTimestamp, writeBatch, query } from 'firebase/firestore';
import { Baby, Scale, Clock, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";

const deliveryLogSchema = z.object({
    deliveryDate: z.string().min(1, "Date is required"),
    deliveryTime: z.string().min(1, "Time is required"),
    modeOfDelivery: z.string().min(1, "Mode of delivery is required."),
    outcome: z.string().min(1, "Outcome is required."),
    babyGender: z.string().min(1, "Baby's gender is required."),
    birthWeight: z.coerce.number().min(0, "Weight must be a positive number."),
    apgarScore: z.string().optional(),
    maternalComplications: z.string().optional(),
});

type DeliveryLogFormValues = z.infer<typeof deliveryLogSchema>;

interface DeliveryLogDialogProps {
    patientId: string;
    patientName: string;
    hospitalId: string;
    maternityProfileId: string;
}

export function DeliveryLogDialog({ patientId, patientName, hospitalId, maternityProfileId }: DeliveryLogDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const firebaseApp = useFirebaseApp();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const servicesQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/general_services`));
  }, [firestore, hospitalId]);
  const { data: services } = useCollection(servicesQuery);

  const patientRef = useMemoFirebase(() => firestore && hospitalId && patientId ? doc(firestore, 'hospitals', hospitalId, 'patients', patientId) : null, [firestore, hospitalId, patientId]);
  const { data: patient } = useDoc(patientRef);

  const hospitalRef = useMemoFirebase(() => firestore && hospitalId ? doc(firestore, 'hospitals', hospitalId) : null, [firestore, hospitalId]);
  const { data: hospitalData } = useDoc(hospitalRef);

  const form = useForm<DeliveryLogFormValues>({
    resolver: zodResolver(deliveryLogSchema),
    defaultValues: {
      modeOfDelivery: 'SVD',
      outcome: 'Live Birth',
      babyGender: 'Female',
    },
  });

  const handleLogDelivery = async (values: DeliveryLogFormValues) => {
    if (!user || !firestore || !firebaseApp) return;
    setLoading(true);

    const deliveryFee = services?.find(s => s.name.includes(values.modeOfDelivery))?.price || (values.modeOfDelivery === 'C-Section' ? 2500 : 800);
    const batch = writeBatch(firestore);

    try {
      // 1. Create the Delivery Record
      const deliveryLogRef = doc(collection(firestore, `hospitals/${hospitalId}/patients/${patientId}/maternity_profiles/${maternityProfileId}/deliveries`));
      batch.set(deliveryLogRef, {
        ...values,
        patientId, patientName, hospitalId, maternityProfileId,
        recordedBy: user.uid,
        recordedByName: user.displayName,
        createdAt: serverTimestamp()
      });

      // 2. Financial Trigger: Add Delivery Fee to Bill
      const billingItemRef = doc(collection(firestore, `hospitals/${hospitalId}/billing_items`));
      batch.set(billingItemRef, {
        patientId, patientName, hospitalId,
        description: `Delivery Service Fee (${values.modeOfDelivery})`,
        category: 'MATERNITY',
        unitPrice: deliveryFee,
        qty: 1,
        total: deliveryFee,
        status: 'UNPAID',
        billedBy: user.uid,
        createdAt: serverTimestamp()
      });
      
      // 3. Update Maternity Profile status
      const maternityProfileRef = doc(firestore, `hospitals/${hospitalId}/patients/${patientId}/maternity_profiles/${maternityProfileId}`);
      batch.update(maternityProfileRef, { status: 'DELIVERED' });

      await batch.commit();
      toast({ title: "Delivery Logged & Billed Successfully" });

      // AUTO-SMS TO FAMILY
      if (patient?.emergencyContactPhone && hospitalData?.mrnPrefix) {
        const smsMessage = `Congratulations! A successful ${values.modeOfDelivery} delivery has been recorded for ${patientName} at ${hospitalData.name}. Baby Weight: ${values.birthWeight}kg. Thank you for choosing us.`;
        
        const functions = getFunctions(firebaseApp);
        const sendSms = httpsCallable(functions, 'sendClinicalSms');
        
        try {
          await sendSms({ 
            phoneNumber: patient.emergencyContactPhone, 
            message: smsMessage,
            hospitalId: hospitalId,
            senderId: hospitalData.mrnPrefix // Uses their custom prefix as Sender ID
          });
          toast({ title: "Family Notified via SMS" });
        } catch (smsError) {
           console.error("SMS Sending Error:", smsError);
           toast({ variant: 'destructive', title: "SMS Notification Failed", description: "The delivery was logged, but the SMS to the family could not be sent." });
        }
      }

      setOpen(false);
      form.reset();
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Error", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-widest text-[10px]">
                <Save size={16}/> Log Delivery
            </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl">
            <DialogHeader className="p-6">
                <DialogTitle className="flex items-center gap-4 border-b pb-4">
                    <div className="bg-pink-100 p-3 rounded-2xl text-pink-600"><Baby size={28}/></div>
                    <div>
                        <h2 className="text-2xl font-black uppercase italic">Delivery <span className="text-pink-600">Outcome Log</span></h2>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">Standard GHS Form 1B Entry for {patientName}</p>
                    </div>
                </DialogTitle>
            </DialogHeader>
             <Form {...form}>
                <form onSubmit={form.handleSubmit(handleLogDelivery)} className="px-6 pb-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField name="deliveryDate" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Date of Delivery</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage/></FormItem>
                        )}/>
                        <FormField name="deliveryTime" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Time of Delivery</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage/></FormItem>
                        )}/>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField name="modeOfDelivery" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Mode of Delivery</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="SVD">Spontaneous Vaginal (SVD)</SelectItem>
                                    <SelectItem value="C-Section">Caesarean Section (CS)</SelectItem>
                                    <SelectItem value="Assisted">Assisted (Vacuum/Forceps)</SelectItem>
                                </SelectContent>
                            </Select><FormMessage/></FormItem>
                        )}/>
                         <FormField name="outcome" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Outcome</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="Live Birth">Live Birth</SelectItem>
                                    <SelectItem value="Fresh Still Birth (FSB)">Fresh Still Birth (FSB)</SelectItem>
                                    <SelectItem value="Macerated Still Birth (MSB)">Macerated Still Birth (MSB)</SelectItem>
                                </SelectContent>
                            </Select><FormMessage/></FormItem>
                        )}/>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <FormField name="babyGender" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Baby's Gender</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="Female">Female</SelectItem>
                                    <SelectItem value="Male">Male</SelectItem>
                                </SelectContent>
                            </Select><FormMessage/></FormItem>
                        )}/>
                        <FormField name="birthWeight" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Birth Weight (kg)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage/></FormItem>
                        )}/>
                         <FormField name="apgarScore" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>APGAR Score</FormLabel><FormControl><Input placeholder="e.g., 8/10" {...field} /></FormControl><FormMessage/></FormItem>
                        )}/>
                    </div>
                     <FormField name="maternalComplications" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Maternal Complications (if any)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
                    )}/>
                    <DialogFooter>
                        <Button type="submit" disabled={loading} className="w-full md:w-auto bg-pink-600 hover:bg-pink-700">
                        {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Finalize Birth Record
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    </Dialog>
  );
}
