'use client';

import * as React from 'react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, orderBy } from 'firebase/firestore';
import { 
  Users, Activity, Loader2, ShieldAlert, AlertTriangle, Link as LinkIcon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

export default function CommandCenterDashboard() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  
  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;

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


  const isLoading = isUserLoading || isProfileLoading || areAlertsLoading || arePatientsLoading;

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
                        Last seen {patient.updatedAt ? formatDistanceToNow(patient.updatedAt.toDate(), {addSuffix: true}) : 'recently'}.
                     </p>
                </div>
            </Link>
        ))}
      </div>
    </div>
  );
}
