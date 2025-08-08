'use client';

import { allBeds } from '@/lib/data';
import { Bed } from '@/lib/types';
import { BedCard } from './bed-card';
import { useMemo } from 'react';

export function BedStatusGrid() {
  const bedsByWard = useMemo(() => {
    return allBeds.reduce((acc, bed) => {
      const ward = bed.ward;
      if (!acc[ward]) {
        acc[ward] = [];
      }
      acc[ward].push(bed);
      return acc;
    }, {} as Record<string, Bed[]>);
  }, []);

  return (
    <div className="space-y-8">
      {Object.entries(bedsByWard).map(([ward, beds]) => (
        <div key={ward}>
          <h2 className="text-2xl font-bold tracking-tight mb-4">{ward}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {beds.map((bed) => (
              <BedCard key={bed.bed_id} bed={bed} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
