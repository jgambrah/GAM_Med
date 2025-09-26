
'use client';

import { allBeds as initialBeds } from '@/lib/data';
import { Bed } from '@/lib/types';
import { BedCard } from './bed-card';
import { useMemo } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';


export function BedStatusGrid() {
  const [beds] = useLocalStorage<Bed[]>('beds', initialBeds);

  const bedsByWard = useMemo(() => {
    return beds.reduce((acc, bed) => {
      const ward = bed.wardName;
      if (!acc[ward]) {
        acc[ward] = [];
      }
      acc[ward].push(bed);
      return acc;
    }, {} as Record<string, Bed[]>);
  }, [beds]);

  return (
    <div className="space-y-8">
      {Object.entries(bedsByWard).map(([ward, wardBeds]) => {
        const occupiedCount = wardBeds.filter(b => b.status === 'occupied').length;
        const totalBeds = wardBeds.length;
        const occupancyPercentage = totalBeds > 0 ? (occupiedCount / totalBeds) * 100 : 0;
        
        return (
          <div key={ward}>
            <div className="mb-4">
                <h2 className="text-2xl font-bold tracking-tight">{ward} ({occupiedCount}/{totalBeds} Occupied)</h2>
                <div className="mt-2 h-2 w-full rounded-full bg-muted">
                    <div 
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${occupancyPercentage}%` }}
                    />
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {wardBeds.map((bed) => (
                <BedCard key={bed.bed_id} bed={bed} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  );
}
