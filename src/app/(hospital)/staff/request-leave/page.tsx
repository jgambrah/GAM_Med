'use client';

import { useState } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, addDocumentNonBlocking, useCollection } from '@/firebase';
import { collection, serverTimestamp, doc, query, where, orderBy, limit } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { differenceInDays, parseISO } from 'date-fns';

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  CalendarDays, Send, Clock, ShieldCheck, AlertCircle, 
  Loader2, CheckCircle2 
} from 'lucide-react';

const leaveRequestSchema = z.object({
  leaveType: z.string().min(1, "Please select a leave type."),
  startDate: z.string().min(1, "Start date is required."),
  endDate: z.string().min(1, "End date is required."),
  reason: z.string().optional(),
}).refine(data => new Date(data.endDate) >= new Date(data.startDate), {
  message: "End date cannot be before start date.",
  path: ["endDate"],
});

type LeaveRequestFormValues = z.infer<typeof leaveRequestSchema>;

export default function RequestLeavePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;

  // Real-time query for recent leave requests by this staff member
  const userLeaveQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !user) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/leave_requests`),
      where('staffId', '==', user.uid),
      limit(10)
    );
  }, [firestore, hospitalId, user]);

  const { data: leaveRequests } = useCollection(userLeaveQuery);

  const form = useForm<LeaveRequestFormValues>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: {
      leaveType: 'ANNUAL',
      startDate: '',
      endDate: '',
      reason: '',
    }
  });

  const onSubmit = (values: LeaveRequestFormValues) => {
    if (!user || !userProfile || !firestore || !hospitalId) {
      toast({ variant: 'destructive', title: 'Authentication error' });
      return;
    }
    setLoading(true);

    const startDate = parseISO(values.startDate);
    const endDate = parseISO(values.endDate);
    const daysRequested = differenceInDays(endDate, startDate) + 1;

    const leaveRequestData = {
      ...values,
      daysRequested,
      hospitalId,
      staffId: user.uid,
      staffName: userProfile.fullName || userProfile.displayName || 'Staff Member',
      role: userProfile.role || 'STAFF',
      status: 'PENDING',
      createdAt: serverTimestamp(),
    };

    addDocumentNonBlocking(
      collection(firestore, `hospitals/${hospitalId}/leave_requests`),
      leaveRequestData
    );

    toast({ title: 'Leave Request Submitted', description: 'Your request has been sent to HR for approval.' });
    form.reset();
    setLoading(false);
  };
  
  if (isUserLoading || isProfileLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-12">
        <Loader2 className="h-16 w-16 animate-spin text-indigo-500" />
      </div>
    );
  }

  const pendingRequestsCount = leaveRequests ? leaveRequests.filter((r: any) => r.status === 'PENDING').length : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* 1. DARK EMPLOYEE COMMAND BANNER */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden mb-6">
        
        {/* Ambient Background Accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10 pb-5 border-b border-slate-800/60 mb-5">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white uppercase italic flex items-center gap-3">
              <CalendarDays className="w-7 h-7 text-indigo-400" />
              LEAVE MANAGEMENT
            </h1>
            <p className="text-[10px] text-slate-400 font-bold mt-1.5 uppercase tracking-widest">
              Official absence requests & HR approval workflows
            </p>
          </div>
        </div>

        {/* Leave Balance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
          
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Annual Leave Balance</span>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-black text-emerald-400">14</span>
              <span className="text-xs font-bold text-slate-500 mb-1">Days Remaining</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Sick Leave Available</span>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-black text-white">5</span>
              <span className="text-xs font-bold text-slate-500 mb-1">Days</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Pending HR Approvals</span>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-black text-amber-400">{pendingRequestsCount}</span>
              <span className="text-xs font-bold text-slate-500 mb-1">Requests</span>
            </div>
          </div>

        </div>
      </div>

      {/* 2. REQUEST FORM & HISTORY SPLIT LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Form Area (Takes up 2/3 of space) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm">
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide mb-6 flex items-center gap-2">
            <Send className="w-4 h-4 text-indigo-500" /> New Leave Request
          </h3>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Leave Type Dropdown */}
              <FormField
                control={form.control}
                name="leaveType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Type of Leave
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm font-medium rounded-xl px-4 py-3 h-12 focus:border-indigo-500">
                          <SelectValue placeholder="Select leave type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ANNUAL">Annual Leave</SelectItem>
                        <SelectItem value="SICK">Sick Leave</SelectItem>
                        <SelectItem value="MATERNITY">Maternity / Paternity Leave</SelectItem>
                        <SelectItem value="STUDY">Study Leave</SelectItem>
                        <SelectItem value="CASUAL">Casual Leave</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date Pickers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Start Date
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm font-medium rounded-xl px-4 py-3 h-12 focus:border-indigo-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        End Date
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm font-medium rounded-xl px-4 py-3 h-12 focus:border-indigo-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Reason Textarea */}
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center mb-1">
                      <FormLabel className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Reason for Leave
                      </FormLabel>
                      <span className="text-[11px] text-slate-400 font-normal">Optional</span>
                    </div>
                    <FormControl>
                      <Textarea 
                        rows={4}
                        placeholder="Briefly state the reason for your leave..." 
                        {...field}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm font-medium rounded-xl px-4 py-3 focus:border-indigo-500 resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-3.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-md flex items-center justify-center gap-2 uppercase tracking-wide cursor-pointer disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Submit Request to HR</>}
                </button>
              </div>

            </form>
          </Form>
        </div>

        {/* Sidebar: Recent History (Takes up 1/3 of space) */}
        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" /> Recent Requests
          </h3>
          
          <div className="space-y-3">
            {leaveRequests && leaveRequests.length > 0 ? (
              leaveRequests.map((req: any) => (
                <div key={req.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{req.leaveType || 'Annual Leave'}</span>
                    {req.status === 'APPROVED' ? (
                      <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 rounded-md uppercase tracking-wider flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Approved
                      </span>
                    ) : req.status === 'REJECTED' || req.status === 'DECLINED' ? (
                      <span className="px-2 py-0.5 text-[9px] font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20 rounded-md uppercase tracking-wider flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Declined
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[9px] font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20 rounded-md uppercase tracking-wider flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Pending
                      </span>
                    )}
                  </div>
                  <span className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 font-mono">
                    {req.startDate} to {req.endDate} ({req.daysRequested || 1}d)
                  </span>
                </div>
              ))
            ) : (
              <>
                {/* Fallback Display Items */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Annual Leave</span>
                    <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 rounded-md uppercase tracking-wider flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Approved
                    </span>
                  </div>
                  <span className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 font-mono">Dec 20, 2025 - Jan 03, 2026</span>
                </div>

                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Casual Leave</span>
                    <span className="px-2 py-0.5 text-[9px] font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20 rounded-md uppercase tracking-wider flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Declined
                    </span>
                  </div>
                  <span className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 font-mono">Oct 12, 2025</span>
                </div>
              </>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
