'use client';

import * as React from 'react';
import { 
    Card, 
    CardContent 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { format } from 'date-fns';
import Link from 'next/link';
import { 
    Activity, 
    Pill, 
    ArrowRight,
    Loader2,
    CheckCircle2
} from 'lucide-react';
import { Badge } from '@/badge';
import { RecordVitalsDialog } from '@/components/nursing/record-vitals-dialog';

interface NurseTaskQueueProps {
    hospitalId?: string;
    type: 'Care' | 'Meds';
}

/**
 * == Live Task Queue: Care Plan Implementation ==
 * 
 * Fetches active interventions and medications for all admitted patients.
 * This is the "Engine" of the nursing dashboard.
 */
export function NurseTaskQueue({ hospitalId, type }: NurseTaskQueueProps) {
  const firestore = useFirestore();

  // LIVE QUERY: Fetch active Care Plans or Medication Records
  const taskQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    
    const collectionName = type === 'Meds' ? 'medication_records' : 'care_plans';
    return query(
        collection(firestore, collectionName),
        where('hospitalId', '==', hospitalId),
        where('status', '==', 'Active'),
        limit(20)
    );
  }, [firestore, hospitalId, type]);

  const { data: rawTasks, isLoading } = useCollection(taskQuery);

  if (isLoading) {
    return (
        <div className="flex justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
  }

  if (!rawTasks || rawTasks.length === 0) {
      return (
          <Card className="border-dashed bg-muted/20">
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="font-semibold text-muted-foreground">All clear for now!</p>
                  <p className="text-sm text-muted-foreground">No pending {type.toLowerCase()} tasks found.</p>
              </CardContent>
          </Card>
      );
  }

  return (
    <div className="space-y-3">
        {rawTasks.map((task: any) => (
            <Card key={task.id} className="hover:shadow-md transition-all border-l-4 border-l-primary overflow-hidden">
                <CardContent className="p-4">
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex-grow">
                            <div className="flex items-center gap-2 mb-1">
                                {type === 'Meds' ? <Pill className="h-4 w-4 text-blue-600" /> : <Activity className="h-4 w-4 text-green-600" />}
                                <h4 className="font-bold text-sm">
                                    {task.medicationName || task.title}
                                </h4>
                                <Badge variant="secondary" className="text-[10px] uppercase">
                                    {task.frequency || 'Care Task'}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                                {task.instructions || task.goal || 'Follow standard protocol'}
                            </p>
                            <div className="mt-3 flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] bg-muted/50">Patient ID: {task.patientId}</Badge>
                                <span className="text-[10px] text-muted-foreground">Scheduled Round: {format(new Date(), 'p')}</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            {type === 'Care' ? (
                                <RecordVitalsDialog 
                                    patientId={task.patientId} 
                                    patientName={task.patientName || `Patient ${task.patientId}`} 
                                />
                            ) : (
                                <Button variant="outline" size="sm" asChild className="group">
                                    <Link href={`/dashboard/patients/${task.patientId}`}>
                                        Record Meds
                                        <ArrowRight className="h-3 w-3 ml-2 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                </Button>
                            )}
                            <Button variant="ghost" size="sm" asChild className="text-[10px] h-6">
                                <Link href={`/dashboard/patients/${task.patientId}`}>
                                    View Full EHR
                                </Link>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        ))}
    </div>
  );
}
