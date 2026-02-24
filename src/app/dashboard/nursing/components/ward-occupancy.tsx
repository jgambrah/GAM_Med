'use client';

import * as React from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { User, BedDouble, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * == Ward Tracker: Inpatient Census ==
 * 
 * Displays a live list of admitted patients and their current bed assignments.
 */
export function WardOccupancy({ hospitalId }: { hospitalId?: string }) {
  const firestore = useFirestore();

  const occupancyQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
        collection(firestore, 'admissions'),
        where('hospitalId', '==', hospitalId),
        where('status', '==', 'Admitted'),
        orderBy('admission_date', 'desc')
    );
  }, [firestore, hospitalId]);

  const { data: census, isLoading } = useCollection(occupancyQuery);

  if (isLoading) return <div className="p-6 text-center text-xs text-muted-foreground">Updating census...</div>;

  return (
    <div className="divide-y">
        {census && census.length > 0 ? (
            census.map((p: any) => (
                <Link 
                    key={p.id} 
                    href={`/dashboard/patients/${p.patient_id}`}
                    className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm font-bold">{p.attending_doctor_name || 'Patient'}</p>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-semibold">
                                <BedDouble className="h-3 w-3" />
                                {p.ward} | Bed {p.bed_id}
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-muted-foreground">Inpatient for</p>
                        <p className="text-xs font-bold text-primary">
                            {formatDistanceToNow(new Date(p.admission_date))}
                        </p>
                    </div>
                </Link>
            ))
        ) : (
            <div className="p-8 text-center text-sm text-muted-foreground italic">
                No patients currently admitted.
            </div>
        )}
    </div>
  );
}
