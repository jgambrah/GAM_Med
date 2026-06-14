'use client';
import { useState, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Clock, Plus, Loader2, ShieldAlert, Edit2, Trash2 } from 'lucide-react';

const shiftFormSchema = z.object({
  name: z.string().min(3, "Shift name is required"),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (e.g., 08:00)"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (e.g., 14:00)"),
  gracePeriod: z.coerce.number().min(0, "Grace period cannot be negative"),
});

type ShiftFormValues = z.infer<typeof shiftFormSchema>;

export default function ShiftSetupPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [claims, setClaims] = useState<any>(null);
  const [isClaimsLoading, setIsClaimsLoading] = useState(true);
  const [isAddShiftOpen, setIsAddShiftOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<any>(null);
  const [isEditShiftOpen, setIsEditShiftOpen] = useState(false);

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
  const userRole = claims?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'HR_MANAGER'].includes(userRole);

  const shiftsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, 'hospitals', hospitalId, 'shifts'));
  }, [firestore, hospitalId]);

  const { data: shifts, isLoading: areShiftsLoading } = useCollection(shiftsQuery);

  const form = useForm<ShiftFormValues>({
    resolver: zodResolver(shiftFormSchema),
    defaultValues: { name: '', startTime: '08:00', endTime: '14:00', gracePeriod: 15 },
  });

  const editForm = useForm<ShiftFormValues>({
    resolver: zodResolver(shiftFormSchema),
    defaultValues: { name: '', startTime: '08:00', endTime: '14:00', gracePeriod: 15 },
  });

  useEffect(() => {
    if (editingShift) {
      editForm.reset({
        name: editingShift.name || '',
        startTime: editingShift.startTime || '08:00',
        endTime: editingShift.endTime || '14:00',
        gracePeriod: editingShift.gracePeriod !== undefined ? Number(editingShift.gracePeriod) : 15,
      });
    }
  }, [editingShift, editForm]);

  const handleAddShift = (values: ShiftFormValues) => {
    if (!firestore || !hospitalId) return;
    addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/shifts`), {
      ...values,
      hospitalId,
      createdAt: serverTimestamp(),
    });
    toast({ title: 'Shift Created', description: `${values.name} has been added to the duty roster.` });
    form.reset();
    setIsAddShiftOpen(false);
  };

  const handleEditShift = async (values: ShiftFormValues) => {
    if (!firestore || !hospitalId || !editingShift) return;
    try {
      const shiftRef = doc(firestore, `hospitals/${hospitalId}/shifts`, editingShift.id);
      await updateDoc(shiftRef, {
        name: values.name,
        startTime: values.startTime,
        endTime: values.endTime,
        gracePeriod: Number(values.gracePeriod),
      });
      toast({ title: 'Shift Updated', description: `${values.name} has been updated.` });
      setIsEditShiftOpen(false);
      setEditingShift(null);
    } catch (error: any) {
      toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteShift = async (shiftId: string, shiftName: string) => {
    if (!firestore || !hospitalId) return;
    if (!confirm(`Are you sure you want to delete the shift "${shiftName}"?`)) return;
    try {
      const shiftRef = doc(firestore, `hospitals/${hospitalId}/shifts`, shiftId);
      await deleteDoc(shiftRef);
      toast({ title: 'Shift Deleted', description: `${shiftName} has been deleted.` });
    } catch (error: any) {
      toast({ title: 'Delete Failed', description: error.message, variant: 'destructive' });
    }
  };

  const isLoading = isUserLoading || isClaimsLoading;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
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
          <p className="text-muted-foreground">You are not authorized to configure shifts.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end border-b pb-6">
        <div>
          <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Duty <span className="text-primary">Roster</span></h1>
          <p className="text-muted-foreground font-medium">Define clinical shift patterns (e.g., 8am-2pm, 2pm-8pm).</p>
        </div>
        <Dialog open={isAddShiftOpen} onOpenChange={setIsAddShiftOpen}>
          <DialogTrigger asChild>
            <Button><Plus size={16} /> Create Shift</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Shift Pattern</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleAddShift)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Shift Name</FormLabel><FormControl><Input placeholder="e.g., Morning Shift" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="startTime" render={({ field }) => (
                    <FormItem><FormLabel>Start Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="endTime" render={({ field }) => (
                    <FormItem><FormLabel>End Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                 <FormField control={form.control} name="gracePeriod" render={({ field }) => (
                    <FormItem><FormLabel>Grace Period (minutes)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                <DialogFooter>
                  <Button type="submit" disabled={form.formState.isSubmitting}>Save Shift</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit Shift Dialog */}
        <Dialog open={isEditShiftOpen} onOpenChange={(open) => {
          setIsEditShiftOpen(open);
          if (!open) setEditingShift(null);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Shift Pattern</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(handleEditShift)} className="space-y-4">
                <FormField control={editForm.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Shift Name</FormLabel><FormControl><Input placeholder="e.g., Morning Shift" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={editForm.control} name="startTime" render={({ field }) => (
                    <FormItem><FormLabel>Start Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={editForm.control} name="endTime" render={({ field }) => (
                    <FormItem><FormLabel>End Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                 <FormField control={editForm.control} name="gracePeriod" render={({ field }) => (
                    <FormItem><FormLabel>Grace Period (minutes)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                <DialogFooter>
                  <Button type="submit" disabled={editForm.formState.isSubmitting}>Update Shift</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {areShiftsLoading ? <p>Loading shifts...</p> :
        shifts?.map(s => (
          <div key={s.id} className="bg-card p-6 rounded-[32px] border-2 flex justify-between items-center group hover:border-primary/20 transition-all">
             <div className="flex items-center gap-4 text-left">
                <div className="bg-primary/10 p-3 rounded-2xl text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                   <Clock size={24} />
                </div>
                <div>
                   <p className="font-black text-card-foreground uppercase text-sm">{s.name}</p>
                   <p className="text-[10px] font-bold text-muted-foreground">{s.startTime} — {s.endTime}</p>
                </div>
             </div>
             <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1 rounded-full uppercase italic">{s.gracePeriod}m Grace</span>
                <button
                   onClick={() => {
                     setEditingShift(s);
                     setIsEditShiftOpen(true);
                   }}
                   className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
                   title="Edit Shift"
                >
                   <Edit2 size={14} />
                </button>
                <button
                   onClick={() => handleDeleteShift(s.id, s.name)}
                   className="p-2 text-slate-400 hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                   title="Delete Shift"
                >
                   <Trash2 size={14} />
                </button>
             </div>
          </div>
        ))}
         {!areShiftsLoading && shifts?.length === 0 && (
            <div className="md:col-span-3 text-center p-20 bg-card border-2 border-dashed rounded-2xl text-muted-foreground">
                No shifts configured yet. Create the first shift to get started.
            </div>
        )}
      </div>
    </div>
  );
}
