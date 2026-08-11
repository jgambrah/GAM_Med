'use client';

import { useState } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, where, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { 
  Award, Plus, Calendar, ShieldCheck, FileText, 
  CheckCircle, Clock, AlertCircle, Loader2, UploadCloud, CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';

const cpdSubmissionSchema = z.object({
  topic: z.string().min(5, "Topic is too short."),
  provider: z.string().min(3, "Provider name is required."),
  points: z.coerce.number().min(0.5, "Points must be at least 0.5."),
  certificateUrl: z.string().url("Please enter a valid URL."),
});

type CpdFormValues = z.infer<typeof cpdSubmissionSchema>;

export default function MyCpdPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAddCpdOpen, setIsAddCpdOpen] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;

  const mySubmissionsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !user) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/cpd_submissions`), 
      where("staffId", "==", user.uid), 
      orderBy('createdAt', 'desc')
    );
  }, [firestore, hospitalId, user]);

  const { data: submissions, isLoading: areSubmissionsLoading } = useCollection(mySubmissionsQuery);

  const form = useForm<CpdFormValues>({
    resolver: zodResolver(cpdSubmissionSchema),
    defaultValues: {
      topic: '',
      provider: '',
      points: 1.0,
      certificateUrl: 'https://',
    }
  });

  const handleAddCpd = (values: CpdFormValues) => {
    if (!firestore || !hospitalId || !user || !userProfile) return;
    addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/cpd_submissions`), {
      ...values,
      hospitalId,
      staffId: user.uid,
      staffName: userProfile.fullName || userProfile.displayName || 'Staff Member',
      role: userProfile.role || 'STAFF',
      status: 'PENDING',
      createdAt: serverTimestamp(),
    });
    toast({ title: 'CPD Submitted for Verification', description: 'Your certificate has been queued for HR verification.' });
    form.reset();
    setIsAddCpdOpen(false);
  };

  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-20">
        <Loader2 className="h-16 w-16 animate-spin text-fuchsia-500" />
      </div>
    );
  }

  const hasCPDRecords = submissions && submissions.length > 0;
  
  const verifiedPoints = submissions 
    ? submissions.filter((s: any) => s.status === 'VERIFIED').reduce((acc: number, curr: any) => acc + (Number(curr.points) || 0), 0)
    : (userProfile?.totalCpdPoints || 0);

  const licenseExpiryLabel = userProfile?.licenseExpiry 
    ? format(new Date(userProfile.licenseExpiry), 'MMM dd, yyyy') 
    : 'Dec 31, 2026';

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* 1. THE DARK CREDENTIAL BANNER */}
      <div className="bg-slate-950 text-white rounded-2xl p-8 shadow-xl relative overflow-hidden mb-6">
        
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10 pb-5 border-b border-slate-800/60 mb-5">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white uppercase italic flex items-center gap-3">
              <Award className="w-7 h-7 text-fuchsia-400" />
              MY CPD PORTFOLIO
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-0.5 text-[10px] font-bold bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30 rounded-md uppercase tracking-wider">
                {userProfile?.role || 'Pharmacist'} (License: Active)
              </span>
              <span className="text-xs font-bold text-slate-300 tracking-wide flex items-center gap-1.5">
                {userProfile?.fullName || user?.displayName || 'Shane Gambrah'}
              </span>
            </div>
          </div>

          {/* Core Action Button Trigger */}
          <Dialog open={isAddCpdOpen} onOpenChange={setIsAddCpdOpen}>
            <DialogTrigger asChild>
              <button 
                type="button"
                className="px-5 py-2.5 text-xs font-bold text-white bg-fuchsia-600 hover:bg-fuchsia-700 rounded-xl shadow-sm transition flex items-center gap-2 uppercase tracking-wide cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Submit New CPD
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-lg font-black uppercase text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Award className="w-5 h-5 text-fuchsia-500" /> Submit CPD for Verification
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleAddCpd)} className="space-y-4 pt-2">
                  <FormField 
                    control={form.control} 
                    name="topic" 
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold text-slate-500 uppercase">Training/Event Title</FormLabel>
                        <FormControl>
                          <Input className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700" placeholder="e.g. Advanced Clinical Pharmacy Seminar" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} 
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField 
                      control={form.control} 
                      name="provider" 
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold text-slate-500 uppercase">Provider</FormLabel>
                          <FormControl>
                            <Input className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700" placeholder="e.g. Pharmacy Council Ghana" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField 
                      control={form.control} 
                      name="points" 
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold text-slate-500 uppercase">Points Awarded</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.5" className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField 
                    control={form.control} 
                    name="certificateUrl" 
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold text-slate-500 uppercase">Certificate Document URL</FormLabel>
                        <FormControl>
                          <Input className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700" placeholder="https://link.to/your/certificate.pdf" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} 
                  />
                  <DialogFooter className="pt-4">
                    <Button type="submit" disabled={form.formState.isSubmitting} className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold uppercase tracking-wider">
                      {form.formState.isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UploadCloud className="w-4 h-4 mr-2" /> Submit Certificate</>}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Compliance Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
          
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Verified Points</span>
            <span className="text-2xl font-black text-white">{verifiedPoints} <span className="text-sm font-medium text-slate-500">/ 20 Required</span></span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex justify-between items-center">
            <div>
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-fuchsia-400" /> License Expiry
              </span>
              <span className="text-2xl font-black text-amber-400">{licenseExpiryLabel}</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Compliance Status</span>
            <div className="mt-1 flex items-center gap-2">
              {verifiedPoints >= 20 ? (
                <span className="px-2.5 py-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3" /> Fully Compliant
                </span>
              ) : (
                <span className="px-2.5 py-1 text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3" /> Action Required
                </span>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* 2. MAIN CONTENT AREA */}
      {!hasCPDRecords ? (
        
        /* PREMIUM EMPTY STATE */
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-16 text-center flex flex-col items-center justify-center shadow-sm">
          <div className="w-16 h-16 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center mb-6 shadow-sm rotate-3">
            <Award className="w-8 h-8 text-slate-300 dark:text-slate-600 -rotate-3" />
          </div>
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight uppercase">
            No CPD Records Submitted
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md leading-relaxed">
            You currently have no verified Continuous Professional Development points for this licensing period. Click "Submit New CPD" to upload your certificates.
          </p>
        </div>

      ) : (

        /* ACTIVE CPD LEDGER */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" /> Training & Event Ledger
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                  <th className="py-4 pl-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Training / Event Name</th>
                  <th className="py-4 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Date Submitted</th>
                  <th className="py-4 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Points</th>
                  <th className="py-4 pr-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {submissions.map((sub: any) => {
                  const dateLabel = sub.createdAt?.toDate ? format(sub.createdAt.toDate(), 'MMM dd, yyyy') : 'Recently';

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition group">
                      <td className="py-4 pl-6">
                        <span className="text-sm font-black text-slate-800 dark:text-slate-100 block">{sub.topic}</span>
                        <span className="text-[10px] font-bold text-slate-400">Provider: {sub.provider}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 block">{dateLabel}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-sm font-black text-slate-700 dark:text-slate-200">{Number(sub.points).toFixed(1)}</span>
                      </td>
                      <td className="py-4 pr-6 text-right">
                        {sub.status === 'VERIFIED' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-md uppercase tracking-wider">
                            <CheckCircle className="w-3 h-3" /> Verified
                          </span>
                        ) : sub.status === 'REJECTED' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-md uppercase tracking-wider">
                            <AlertCircle className="w-3 h-3" /> Rejected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-md uppercase tracking-wider">
                            <Clock className="w-3 h-3" /> Pending Review
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
