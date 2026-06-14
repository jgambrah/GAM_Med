'use client';

import * as React from 'react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, orderBy } from 'firebase/firestore';
import { 
  Users, Activity, Loader2, ShieldAlert, AlertTriangle, Link as LinkIcon, ShieldCheck, Clock
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

function safeToDate(val: any): Date | null {
  if (!val) return null;
  if (typeof val.toDate === 'function') return val.toDate();
  if (val instanceof Date) return val;
  if (typeof val === 'object') {
    if (typeof val.seconds === 'number') {
      return new Date(val.seconds * 1000 + (val.nanoseconds || 0) / 1000000);
    }
    if (typeof val._seconds === 'number') {
      return new Date(val._seconds * 1000 + (val._nanoseconds || 0) / 1000000);
    }
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

export default function CommandCenterDashboard() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [showPrompt, setShowPrompt] = React.useState(false);
  const [suggestedShift, setSuggestedShift] = React.useState<any>(null);
  
  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;

  // Query active clock-in log for this user
  const activeLogQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !user?.uid) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/attendance_logs`),
      where("staffId", "==", user.uid),
      where("clockOutTime", "==", null)
    );
  }, [firestore, hospitalId, user?.uid]);
  const { data: activeLogs, isLoading: isActiveLogLoading } = useCollection(activeLogQuery);

  // Fetch shifts roster for the hospital
  const shiftsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/shifts`));
  }, [firestore, hospitalId]);
  const { data: shifts, isLoading: areShiftsLoading } = useCollection(shiftsQuery);

  React.useEffect(() => {
    if (activeLogs && shifts && activeLogs.length === 0) {
      const prompted = sessionStorage.getItem('clockInPrompted');
      if (prompted !== 'true') {
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        let foundShift = null;

        for (const s of shifts) {
          if (!s.startTime || !s.endTime) continue;
          const [startH, startM] = s.startTime.split(':').map(Number);
          const [endH, endM] = s.endTime.split(':').map(Number);
          const startMin = startH * 60 + startM;
          const endMin = endH * 60 + endM;

          if (endMin < startMin) {
            if (currentMinutes >= startMin || currentMinutes <= endMin) {
              foundShift = s;
              break;
            }
          } else {
            if (currentMinutes >= startMin && currentMinutes <= endMin) {
              foundShift = s;
              break;
            }
          }
        }

        if (foundShift) {
          setSuggestedShift(foundShift);
          setShowPrompt(true);
          sessionStorage.setItem('clockInPrompted', 'true');
        }
      }
    }
  }, [activeLogs, shifts]);

  // 1. Query for active alerts
  const alertsQuery = useMemoFirebase(() => {
      if (!firestore || !hospitalId) return null;
      return query(
          collection(firestore, `hospitals/${hospitalId}/clinical_alerts`),
          where("status", "==", "UNREAD"),
          orderBy("createdAt", "desc")
      );
  }, [firestore, hospitalId]);
  const { data: alerts, isLoading: areAlertsLoading } = useCollection(alertsQuery);

  // 2. Group alerts by patient
  const groupedAlerts = React.useMemo(() => {
      const map: Record<string, any[]> = {};
      if (!alerts) return map;

      alerts.forEach((alert: any) => {
          if (!map[alert.patientId]) {
            map[alert.patientId] = [];
          }
          map[alert.patientId].push(alert);
      });
      return map;
  }, [alerts]);
  
  // 3. Fetch all patients (can be optimized for large hospitals)
  const patientsQuery = useMemoFirebase(() => {
      if (!firestore || !hospitalId) return null;
      return query(collection(firestore, `hospitals/${hospitalId}/patients`));
  }, [firestore, hospitalId]);
  const { data: patients, isLoading: arePatientsLoading } = useCollection(patientsQuery);

  // 4. Combine data to create the critical patient list
  const criticalPatients = React.useMemo(() => {
    if (!patients || !alerts) return [];
    return patients
      ?.filter((p: any) => groupedAlerts[p.id])
      ?.map((p: any) => ({
        ...p,
        alerts: groupedAlerts[p.id],
      }))
      ?.sort((a, b) => b.alerts.length - a.alerts.length);
  }, [patients, alerts, groupedAlerts]);

  const getColor = (alerts: any[]) => {
    if (!alerts) return "border-slate-200";
    if (alerts.some(a => a.severity === "CRITICAL")) return "border-red-600";
    if (alerts.some(a => a.severity === "HIGH")) return "border-orange-500";
    return "border-yellow-500";
  };


  const isLoading = isUserLoading || isProfileLoading || areAlertsLoading || arePatientsLoading || isActiveLogLoading || areShiftsLoading;

  if (isLoading) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      );
  }
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase italic">
            Clinical Command
          </h1>
          <div className="flex items-center gap-2 text-muted-foreground font-bold uppercase text-xs">
            <ShieldCheck size={14} className="text-green-600" />
            Live Monitoring Console • {userProfile?.hospitalName}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {criticalPatients?.length === 0 && (
            <div className="md:col-span-3 text-center p-20 bg-card rounded-2xl border-2 border-dashed">
                <p className="font-bold text-muted-foreground">All systems clear. No active critical alerts.</p>
            </div>
        )}
        {criticalPatients?.map((patient: any) => (
            <Link href={`/patients/folder/${patient.id}`} key={patient.id}>
                <div className={`bg-card p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all cursor-pointer border-l-8 ${getColor(patient.alerts)}`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="font-black text-lg uppercase">{patient.firstName} {patient.lastName}</h2>
                            <p className="text-xs text-muted-foreground font-bold">EHR: {patient.ehrNumber}</p>
                        </div>
                        <span className="text-xs font-bold text-red-600">{patient.alerts.length} ALERTS</span>
                    </div>

                    <div className="mt-4 space-y-2">
                        {patient.alerts.map((alert: any, i: number) => (
                        <div
                            key={i}
                            className="bg-red-100/50 text-red-800 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 border border-red-200/50"
                        >
                            <AlertTriangle size={14} />
                            {alert.message}
                        </div>
                        ))}
                    </div>
                     <p className="text-[10px] text-muted-foreground mt-4 italic">
                        Last seen {safeToDate(patient.updatedAt) ? formatDistanceToNow(safeToDate(patient.updatedAt)!, {addSuffix: true}) : 'recently'}.
                     </p>
                </div>
            </Link>
        ))}
      </div>

      {/* Clock-In Prompt Modal */}
      <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
        <DialogContent className="max-w-md bg-white rounded-[40px] p-8 border">
          <DialogHeader className="text-left">
            <DialogTitle className="text-lg font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
              <Clock className="text-primary" size={20} /> Shift Attendance Prompt
            </DialogTitle>
          </DialogHeader>
          {suggestedShift && (
            <div className="space-y-4 text-black text-left mt-2">
              <p className="text-xs font-bold text-slate-500 leading-normal">
                We noticed you signed in and a shift pattern is currently running:
              </p>
              <div className="bg-slate-50 p-6 rounded-[28px] border border-slate-100">
                <p className="text-[10px] font-black uppercase text-slate-400">Scheduled Shift</p>
                <p className="font-black text-sm text-slate-800 uppercase mt-0.5">{suggestedShift.name}</p>
                <p className="text-xs font-bold text-muted-foreground mt-0.5">{suggestedShift.startTime} — {suggestedShift.endTime}</p>
              </div>
              <p className="text-xs text-slate-400 font-bold leading-normal">
                Would you like to clock in for your shift now?
              </p>
              <DialogFooter className="pt-2 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPrompt(false)}
                  className="rounded-2xl"
                >
                  Dismiss
                </Button>
                <Button
                  onClick={() => {
                    setShowPrompt(false);
                    router.push('/staff/clock-in');
                  }}
                  className="bg-primary text-white rounded-2xl hover:bg-black font-black uppercase text-[10px] tracking-widest px-6"
                >
                  Yes, Clock In
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
