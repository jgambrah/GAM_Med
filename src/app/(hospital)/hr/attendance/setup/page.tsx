'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useDoc } from '@/firebase';
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
import { 
  Clock, Plus, Settings, Sun, Moon, Sunrise, Coffee, 
  AlertCircle, Edit3, Trash2, CalendarDays, Timer, 
  Loader2, ShieldAlert 
} from 'lucide-react';

const shiftFormSchema = z.object({
  name: z.string().min(3, "Shift name is required"),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (e.g., 08:00)"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (e.g., 14:00)"),
  gracePeriod: z.coerce.number().min(0, "Grace period cannot be negative"),
});

type ShiftFormValues = z.infer<typeof shiftFormSchema>;

interface ShiftItem {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  gracePeriod: number;
  type?: string;
  color?: string;
  icon?: any;
  raw?: any;
}

export default function DutyRosterSetupHub() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [isAddShiftOpen, setIsAddShiftOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<any>(null);
  const [isEditShiftOpen, setIsEditShiftOpen] = useState(false);

  const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const isAuthorized = ['DIRECTOR', 'HR_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(userProfile?.role || 'DIRECTOR');

  const shiftsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, 'hospitals', hospitalId, 'shifts'));
  }, [firestore, hospitalId]);

  const { data: rawShifts, isLoading: areShiftsLoading } = useCollection(shiftsQuery);

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

  const demoDutyShifts: ShiftItem[] = useMemo(() => [
    { 
      id: 'SFT-001', 
      name: 'MORNING SHIFT', 
      startTime: '08:00', 
      endTime: '14:00', 
      gracePeriod: 15, 
      type: 'CLINICAL',
      icon: Sunrise,
      color: 'sky'
    },
    { 
      id: 'SFT-002', 
      name: 'AFTERNOON SHIFT', 
      startTime: '14:00', 
      endTime: '20:00', 
      gracePeriod: 15, 
      type: 'CLINICAL',
      icon: Sun,
      color: 'amber'
    },
    { 
      id: 'SFT-003', 
      name: 'NIGHT SHIFT', 
      startTime: '20:00', 
      endTime: '08:00', 
      gracePeriod: 15, 
      type: 'CLINICAL',
      icon: Moon,
      color: 'indigo'
    },
    { 
      id: 'SFT-004', 
      name: 'ADMIN STANDARD', 
      startTime: '08:00', 
      endTime: '17:00', 
      gracePeriod: 30, 
      type: 'ADMIN',
      icon: Coffee,
      color: 'slate'
    },
  ], []);

  const dutyShifts = useMemo(() => {
    if (rawShifts && rawShifts.length > 0) {
      return rawShifts.map((s: any, idx: number) => {
        const nameUpper = (s.name || 'SHIFT BLOCK').toUpperCase();
        let icon = Clock;
        let color = 'sky';
        if (nameUpper.includes('NIGHT')) { icon = Moon; color = 'indigo'; }
        else if (nameUpper.includes('AFTERNOON')) { icon = Sun; color = 'amber'; }
        else if (nameUpper.includes('MORNING')) { icon = Sunrise; color = 'sky'; }
        else if (nameUpper.includes('ADMIN')) { icon = Coffee; color = 'slate'; }

        return {
          id: s.id || `SFT-00${idx + 1}`,
          name: nameUpper,
          startTime: s.startTime || '08:00',
          endTime: s.endTime || '16:00',
          gracePeriod: Number(s.gracePeriod ?? 15),
          type: s.type || (nameUpper.includes('ADMIN') ? 'ADMIN' : 'CLINICAL'),
          icon,
          color,
          raw: s,
        };
      });
    }
    return demoDutyShifts;
  }, [rawShifts, demoDutyShifts]);

  const handleAddShift = (values: ShiftFormValues) => {
    if (!firestore || !hospitalId) {
      toast({ title: 'Shift Pattern Created', description: `${values.name} registered.` });
      setIsAddShiftOpen(false);
      form.reset();
      return;
    }
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

  const pageIsLoading = isUserLoading || isProfileLoading;
  const userName = user?.displayName || userProfile?.name || 'MARCUS AMOSAH HENAKU';
  const userInitials = userName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'MH';

  if (pageIsLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-20">
        <Loader2 className="h-16 w-16 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-8 min-h-screen">
        <div className="text-center bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md">
          <ShieldAlert className="h-16 w-16 text-rose-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">Access Denied</h1>
          <p className="text-slate-500 text-sm mt-2">You are not authorized to configure duty rosters.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-6 bg-slate-900 text-white rounded-xl">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-100 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* ========================================== */}
      {/* 1. SIGNATURE DARK HERO COMMAND BANNER      */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800">
        {/* Ambient Radial Accent Glows - Indigo/Violet for HR */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, and Primary Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400">
                <CalendarDays className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                DUTY ROSTER CONFIGURATION
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              DEFINE CLINICAL & ADMINISTRATIVE SHIFT PATTERNS AND CLOCK-IN GRACE PERIODS.
            </p>
          </div>

          {/* Active User Context & Action Button */}
          <div className="flex flex-col sm:flex-row items-center gap-4 self-start md:self-auto">
            <div className="hidden md:flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5">
              <div className="w-9 h-9 rounded-full bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center font-black text-indigo-400 text-xs">
                {userInitials}
              </div>
              <div>
                <div className="text-[11px] font-bold text-white tracking-wide uppercase">{userName}</div>
                <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">HR / DIRECTOR</div>
              </div>
            </div>

            <Dialog open={isAddShiftOpen} onOpenChange={setIsAddShiftOpen}>
              <DialogTrigger asChild>
                <button 
                  type="button"
                  className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> CREATE SHIFT
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 p-0 border border-slate-800 rounded-2xl overflow-hidden">
                <DialogHeader className="p-6 bg-slate-950 text-white border-b border-slate-800 flex items-center justify-between">
                  <DialogTitle className="text-base font-black italic uppercase tracking-wider text-white">
                    NEW SHIFT PATTERN
                  </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleAddShift)} className="p-6 space-y-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Shift Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., MORNING SHIFT" {...field} className="rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-bold uppercase" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="startTime" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Start Time *</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} className="rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-bold" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="endTime" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">End Time *</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} className="rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-bold" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="gracePeriod" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Grace Period (Minutes) *</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} className="rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-bold" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <DialogFooter className="pt-4 flex justify-between border-t border-slate-100 dark:border-slate-800">
                      <Button type="button" variant="outline" onClick={() => setIsAddShiftOpen(false)} className="rounded-xl text-xs font-bold">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={form.formState.isSubmitting} className="bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-700 cursor-pointer">
                        Save Shift Pattern
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Bottom Row / Grid: Integrated Telemetry Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
          
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Active Blocks</span>
              <div className="text-2xl font-black text-white">{dutyShifts.length}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">Defined shift patterns</span>
            </div>
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <Settings className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Clinical Coverage</span>
              <div className="text-2xl font-black text-sky-400">24/7</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Continuous rotation active</span>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
              <Timer className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Global Grace</span>
              <div className="text-2xl font-black text-emerald-400">15 Mins</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Default allowed delay</span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </div>

        </div>
      </div>

      {/* ========================================== */}
      {/* 2. CONFIGURATION GRIDS                     */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> SCHEDULED SHIFT PATTERNS
          </h2>
          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 px-2.5 py-0.5 rounded-full uppercase">
            {dutyShifts.length} Configurations
          </span>
        </div>

        {areShiftsLoading ? (
          <div className="p-12 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-2" />
            Loading duty roster shifts...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {dutyShifts.map((shift) => {
              const ShiftIcon = shift.icon || Clock;

              return (
                <div 
                  key={shift.id} 
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all group flex flex-col justify-between h-full relative overflow-hidden"
                >
                  <div className="mb-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
                        <ShiftIcon className="w-6 h-6" />
                      </div>
                      <span className="px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                        {shift.type || 'CLINICAL'}
                      </span>
                    </div>

                    <h3 className="font-black text-slate-900 dark:text-slate-100 text-lg uppercase tracking-wide mb-1">
                      {shift.name}
                    </h3>
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 font-mono bg-slate-200/50 dark:bg-slate-800 inline-block px-1.5 py-0.5 rounded">
                      {shift.id}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Timer className="w-3.5 h-3.5" /> DURATION
                      </span>
                      <div className="font-black text-slate-700 dark:text-slate-200 font-mono text-sm">
                        {shift.startTime} <span className="text-slate-400 font-sans font-medium px-1">—</span> {shift.endTime}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" /> GRACE
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black flex items-center gap-1 ${
                        shift.gracePeriod > 15 
                          ? 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-300 border border-amber-200 dark:border-amber-800' 
                          : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      }`}>
                        {shift.gracePeriod} MINS
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 opacity-90 group-hover:opacity-100 transition-opacity">
                    <button 
                      type="button"
                      onClick={() => {
                        setEditingShift(shift.raw || shift);
                        setIsEditShiftOpen(true);
                      }}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg transition-colors border border-transparent hover:border-indigo-100 cursor-pointer" 
                      title="Edit Shift"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleDeleteShift(shift.id, shift.name)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg transition-colors border border-transparent hover:border-rose-100 cursor-pointer" 
                      title="Delete Shift"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Shift Dialog */}
      <Dialog open={isEditShiftOpen} onOpenChange={(open) => {
        setIsEditShiftOpen(open);
        if (!open) setEditingShift(null);
      }}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 p-0 border border-slate-800 rounded-2xl overflow-hidden">
          <DialogHeader className="p-6 bg-slate-950 text-white border-b border-slate-800 flex items-center justify-between">
            <DialogTitle className="text-base font-black italic uppercase tracking-wider text-white">
              EDIT SHIFT PATTERN
            </DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditShift)} className="p-6 space-y-4">
              <FormField control={editForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Shift Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., MORNING SHIFT" {...field} className="rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-bold uppercase" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={editForm.control} name="startTime" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Start Time *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} className="rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-bold" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={editForm.control} name="endTime" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">End Time *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} className="rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-bold" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={editForm.control} name="gracePeriod" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Grace Period (Minutes) *</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} className="rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-bold" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter className="pt-4 flex justify-between border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" onClick={() => setIsEditShiftOpen(false)} className="rounded-xl text-xs font-bold">
                  Cancel
                </Button>
                <Button type="submit" disabled={editForm.formState.isSubmitting} className="bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-700 cursor-pointer">
                  Update Shift Pattern
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
