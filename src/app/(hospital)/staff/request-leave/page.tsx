
'use client';
import { useState } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { differenceInDays, parseISO } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Send, Loader2 } from 'lucide-react';

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

  const form = useForm<LeaveRequestFormValues>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: {
      leaveType: 'ANNUAL',
    }
  });

  const onSubmit = (values: LeaveRequestFormValues) => {
    if (!user || !userProfile || !firestore) {
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
      hospitalId: userProfile.hospitalId,
      staffId: user.uid,
      staffName: userProfile.fullName,
      role: userProfile.role,
      status: 'PENDING',
      createdAt: serverTimestamp(),
    };

    addDocumentNonBlocking(
      collection(firestore, `hospitals/${userProfile.hospitalId}/leave_requests`),
      leaveRequestData
    );

    toast({ title: 'Leave Request Submitted', description: 'Your request has been sent to HR for approval.' });
    form.reset();
    setLoading(false);
  };
  
  if (isUserLoading || isProfileLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex justify-between items-end border-b pb-6">
        <div>
          <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Request <span className="text-primary">Leave</span></h1>
          <p className="text-muted-foreground font-medium">Submit your official leave request for HR approval.</p>
        </div>
      </div>
      <div className="bg-card p-8 rounded-[40px] border shadow-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="leaveType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type of Leave</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="ANNUAL">Annual Leave</SelectItem>
                      <SelectItem value="SICK">Sick Leave</SelectItem>
                      <SelectItem value="MATERNITY">Maternity Leave</SelectItem>
                      <SelectItem value="PATERNITY">Paternity Leave</SelectItem>
                      <SelectItem value="CASUAL">Casual Leave</SelectItem>
                      <SelectItem value="STUDY">Study Leave</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Leave (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Briefly state the reason for your leave..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-foreground text-primary-foreground py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">
              {loading ? <Loader2 className="animate-spin" /> : <><Send size={16} /> Submit Request</>}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
