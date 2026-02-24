'use client';

import * as React from 'react';
import { 
    Card, 
    CardContent, 
    CardDescription, 
    CardHeader, 
    CardTitle 
} from '@/components/ui/card';
import { 
    Tabs, 
    TabsContent, 
    TabsList, 
    TabsTrigger 
} from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { 
    ClipboardCheck, 
    Activity, 
    Pill, 
    AlertCircle, 
    BedDouble,
    Loader2,
    CheckCircle2
} from 'lucide-react';
import { NurseTaskQueue } from './components/nurse-task-queue';
import { WardOccupancy } from './components/ward-occupancy';
import { PatientAlerts } from '../patients/[patientId]/components/patient-alerts';
import { Badge } from '@/components/ui/badge';

/**
 * == Nursing Station: Clinical Operations Hub ==
 * 
 * This is the primary interface for ward nurses. It provides a task-oriented 
 * view of the hospital, strictly isolated by hospitalId.
 */
export default function NursingPage() {
  const { user } = useAuth();
  const firestore = useFirestore();

  // 1. Fetch Global Facility Alerts (Critical Only)
  const alertsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.hospitalId) return null;
    return query(
        collection(firestore, 'alerts'),
        where('hospitalId', '==', user.hospitalId),
        where('isAcknowledged', '==', false),
        where('severity', '==', 'Critical'),
        orderBy('triggeredAt', 'desc')
    );
  }, [firestore, user?.hospitalId]);

  const { data: criticalAlerts, isLoading: alertsLoading } = useCollection(alertsQuery);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nursing Station</h1>
          <p className="text-muted-foreground">
            Ward management and daily care activities for <strong>{user?.hospitalId}</strong>.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 p-2 rounded-lg">
            <Activity className="h-4 w-4 text-blue-600 animate-pulse" />
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Live System Active</span>
        </div>
      </div>

      {/* Critical Safety Bar */}
      {criticalAlerts && criticalAlerts.length > 0 && (
          <div className="bg-destructive/10 border-l-4 border-destructive p-4 rounded-md flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <div>
                      <p className="text-sm font-bold text-destructive uppercase">CRITICAL ALERTS DETECTED</p>
                      <p className="text-xs text-destructive/80">{criticalAlerts.length} patients require immediate attention.</p>
                  </div>
              </div>
              <Badge variant="destructive" className="animate-bounce">Urgent Review</Badge>
          </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Worklist Column */}
        <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="tasks" className="w-full">
                <TabsList className="bg-muted/50 p-1">
                    <TabsTrigger value="tasks" className="gap-2">
                        <ClipboardCheck className="h-4 w-4" />
                        Care Tasks
                    </TabsTrigger>
                    <TabsTrigger value="meds" className="gap-2">
                        <Pill className="h-4 w-4" />
                        Medication Rounds
                    </TabsTrigger>
                </TabsList>
                
                <TabsContent value="tasks" className="mt-4">
                    <NurseTaskQueue hospitalId={user?.hospitalId} type="Care" />
                </TabsContent>
                
                <TabsContent value="meds" className="mt-4">
                    <NurseTaskQueue hospitalId={user?.hospitalId} type="Meds" />
                </TabsContent>
            </Tabs>
        </div>

        {/* Ward Status Column */}
        <div className="lg:col-span-1 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <BedDouble className="h-5 w-5 text-primary" />
                        Ward Occupancy
                    </CardTitle>
                    <CardDescription>Admitted patients in your facility.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <WardOccupancy hospitalId={user?.hospitalId} />
                </CardContent>
            </Card>

            <Card className="bg-accent/5">
                <CardHeader>
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                        Nurse Shift Notes
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-xs text-muted-foreground italic">
                        Use this space for non-clinical handoff notes. Shift ends in 4 hours.
                    </p>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
