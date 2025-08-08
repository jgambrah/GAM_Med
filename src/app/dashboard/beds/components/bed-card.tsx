'use client';

import { Bed } from '@/lib/types';
import { cn } from '@/lib/utils';
import { BedDouble, User, Wrench } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface BedCardProps {
  bed: Bed;
}

const statusConfig = {
  vacant: {
    icon: <BedDouble className="h-5 w-5 text-green-500" />,
    color: 'border-green-500 bg-green-50',
    label: 'Vacant',
  },
  occupied: {
    icon: <User className="h-5 w-5 text-blue-500" />,
    color: 'border-blue-500 bg-blue-50',
    label: 'Occupied',
  },
  maintenance: {
    icon: <Wrench className="h-5 w-5 text-yellow-500" />,
    color: 'border-yellow-500 bg-yellow-50',
    label: 'Maintenance',
  },
};

export function BedCard({ bed }: BedCardProps) {
  const config = statusConfig[bed.status];

  return (
    <Card className={cn('flex flex-col h-full', config.color)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{bed.bed_id}</CardTitle>
        {config.icon}
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="text-lg font-bold">{config.label}</div>
        {bed.status === 'occupied' && (
          <p className="text-xs text-muted-foreground">
            Patient: {bed.current_patient_id}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
