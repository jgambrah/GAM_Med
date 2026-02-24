'use client';

import * as React from 'react';
import { Bed, Ward } from '@/lib/types';
import { BedCard } from './bed-card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export function BedStatusGrid({ beds, wards }: { beds: Bed[], wards: Ward[] }) {
  // Group beds by their wardId
  const bedsByWard = React.useMemo(() => {
    return beds.reduce((acc, bed) => {
      const wardId = bed.wardId || 'unassigned';
      if (!acc[wardId]) acc[wardId] = [];
      acc[wardId].push(bed);
      return acc;
    }, {} as Record<string, Bed[]>);
  }, [beds]);

  return (
    <div className="space-y-10">
      {Object.entries(bedsByWard).map(([wardId, wardBeds]) => {
        const wardInfo = wards.find(w => w.id === wardId);
        const wardName = wardInfo?.name || wardBeds[0]?.wardName || 'Unknown Ward';
        
        const occupiedCount = wardBeds.filter(b => b.status === 'Occupied').length;
        const totalBeds = wardBeds.length;
        const occupancyPercentage = totalBeds > 0 ? (occupiedCount / totalBeds) * 100 : 0;
        
        return (
          <div key={wardId} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-black tracking-tight text-slate-900">{wardName}</h2>
                        <Badge variant="outline" className="bg-muted/50 border-none font-bold">
                            {occupiedCount} / {totalBeds} OCCUPIED
                        </Badge>
                    </div>
                    {wardInfo?.type && (
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
                            Unit Type: {wardInfo.type}
                        </p>
                    )}
                </div>
                <div className="w-full sm:w-48 space-y-1.5">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                        <span>Load Factor</span>
                        <span>{Math.round(occupancyPercentage)}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div 
                            className={cn(
                                "h-full transition-all duration-1000",
                                occupancyPercentage > 90 ? "bg-red-500" : 
                                occupancyPercentage > 70 ? "bg-orange-500" : 
                                "bg-blue-500"
                            )}
                            style={{ width: `${occupancyPercentage}%` }}
                        />
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {wardBeds.map((bed) => (
                <BedCard key={bed.id} bed={bed} />
              ))}
            </div>
            <Separator className="opacity-50" />
          </div>
        )
      })}
    </div>
  );
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ');
}
