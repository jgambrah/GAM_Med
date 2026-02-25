'use client';

import * as React from 'react';
import { Bed } from '@/lib/types';
import { cn } from '@/lib/utils';
import { BedDouble, User, Wrench, SprayCan, Clock, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface BedCardProps {
  bed: Bed;
}

const statusConfig = {
  Available: {
    icon: <BedDouble className="h-4 w-4 text-green-600" />,
    color: 'border-green-200 bg-white hover:bg-green-50/50',
    headerBg: 'bg-green-50/50',
    label: 'Available',
    labelColor: 'text-green-700'
  },
  Occupied: {
    icon: <User className="h-4 w-4 text-blue-600" />,
    color: 'border-blue-200 bg-white hover:bg-blue-50/50 shadow-sm',
    headerBg: 'bg-blue-50/50',
    label: 'Occupied',
    labelColor: 'text-blue-700'
  },
  Maintenance: {
    icon: <Wrench className="h-4 w-4 text-red-600" />,
    color: 'border-red-200 bg-red-50/20 grayscale opacity-70',
    headerBg: 'bg-red-50/50',
    label: 'Maintenance',
    labelColor: 'text-red-700'
  },
  Cleaning: {
    icon: <SprayCan className="h-4 w-4 text-orange-600" />,
    color: 'border-orange-200 bg-orange-50/20 animate-pulse',
    headerBg: 'bg-orange-50/50',
    label: 'Cleaning',
    labelColor: 'text-orange-700'
  },
  Reserved: {
    icon: <Clock className="h-4 w-4 text-purple-600" />,
    color: 'border-purple-200 bg-purple-50/20',
    headerBg: 'bg-purple-50/50',
    label: 'Reserved',
    labelColor: 'text-purple-700'
  }
};

export function BedCard({ bed }: BedCardProps) {
  // Use a type cast to any to allow flexible status strings while maintaining safety with fallback
  const config = (statusConfig as any)[bed.status] || statusConfig.Available;
  const isOccupied = (bed.status === 'Occupied' || bed.status === 'occupied') && bed.currentPatientId;

  const cardInner = (
    <Card className={cn('flex flex-col h-full overflow-hidden border-2 transition-all cursor-default', config.color)}>
      <CardHeader className={cn('flex flex-row items-center justify-between p-2.5 space-y-0', config.headerBg)}>
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{bed.bedNumber}</span>
        {config.icon}
      </CardHeader>
      <CardContent className="p-3 flex-grow flex flex-col justify-center">
        <div className={cn('text-xs font-black uppercase tracking-tighter', config.labelColor)}>
            {config.label}
        </div>
        {isOccupied && (
          <div className="mt-1.5">
            <p className="text-[11px] font-bold text-slate-900 line-clamp-1 leading-tight">
                {bed.currentPatientName || 'Patient Record'}
            </p>
            {(bed.occupiedSince || bed.occupied_since) && (
                <p className="text-[9px] text-muted-foreground mt-0.5 uppercase font-bold">
                    Since: {new Date(bed.occupiedSince || bed.occupied_since!).toLocaleDateString()}
                </p>
            )}
          </div>
        )}
        {bed.type && !isOccupied && (
            <p className="text-[9px] text-muted-foreground mt-1 uppercase font-bold tracking-widest">
                {bed.type}
            </p>
        )}
      </CardContent>
    </Card>
  );

  if (isOccupied && bed.currentPatientId) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={`/dashboard/patients/${bed.currentPatientId}`} className="block h-full group">
              <div className="relative h-full">
                {cardInner}
                <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="h-3 w-3 text-blue-600" />
                </div>
              </div>
            </Link>
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 text-white border-none p-3 rounded-xl shadow-2xl">
            <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-widest text-blue-400">Occupant Profile</p>
                <p className="font-bold text-sm">{bed.currentPatientName}</p>
                <p className="text-[10px] opacity-70">ID: {bed.currentPatientId}</p>
                <div className="pt-2">
                    <p className="text-[10px] font-bold text-green-400 uppercase">Click to open EHR</p>
                </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return cardInner;
}