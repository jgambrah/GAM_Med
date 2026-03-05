'use client';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { Clock, Banknote, UserCheck, CheckCircle2, AlertCircle, Loader2, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

export default function LocumShiftTracker() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);
  
  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'HR_MANAGER', 'ACCOUNTANT'].includes(userRole || '');

  const locumAttendanceQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/attendance_logs`), 
      where("contractType", "==", "LOCUM"),
      where("paymentStatus", "==", "UNPAID"),
      orderBy('clockInTime', 'desc')
    );
  }, [firestore, hospitalId]);

  const { data: locumAttendance, isLoading: areLogsLoading } = useCollection(locumAttendanceQuery);
  
  const totalUnpaidValue = useMemo(() => {
    // This requires fetching salary profiles for each locum to get their rate,
    // which is complex for a client-side calculation.
    // For now, we'll just show the count of unpaid shifts.
    return locumAttendance?.length || 0;
  }, [locumAttendance]);

  const isLoading = isUserLoading || isProfileLoading || areLogsLoading;

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
          <p className="text-muted-foreground">You are not authorized for this module.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 text-black font-bold">
       <div className="flex justify-between items-end border-b pb-6">
            <div>
                <h1 className="text-3xl font-black uppercase tracking-tighter italic">Locum <span className="text-primary">Shift Tracker</span></h1>
                <p className="text-muted-foreground font-medium">Consolidate unpaid shifts for freelance doctors to generate payment vouchers.</p>
            </div>
            <Button>
                <Banknote size={16} /> Generate Bulk PV
            </Button>
        </div>
      
      <div className="bg-card rounded-[40px] border shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-foreground text-primary-foreground text-[10px] uppercase font-black">
            <tr>
              <th className="p-6">Doctor Name</th>
              <th className="p-6">Date & Shift</th>
              <th className="p-6">Hours Worked</th>
              <th className="p-6 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {locumAttendance?.map((log: any) => (
              <tr key={log.id}>
                <td className="p-6 uppercase text-sm">{log.staffName}</td>
                <td className="p-6 text-xs text-muted-foreground">{log.clockInTime ? format(log.clockInTime.toDate(), 'PPP') : 'N/A'} ({log.shiftName})</td>
                <td className="p-6 font-black">{log.hoursWorked || 'N/A'} Hrs</td>
                <td className="p-6 text-right">
                   <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[9px] uppercase italic">Unpaid Claim</span>
                </td>
              </tr>
            ))}
             {locumAttendance?.length === 0 && (
                <tr>
                    <td colSpan={4} className="p-12 text-center text-muted-foreground italic">No unpaid locum shifts found.</td>
                </tr>
             )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
