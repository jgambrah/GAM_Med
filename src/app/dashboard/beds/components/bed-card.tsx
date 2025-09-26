
'use client';

import { Admission, Bed, Patient } from '@/lib/types';
import { cn } from '@/lib/utils';
import { BedDouble, User, Wrench, SprayCan, Clock } from 'lucide-react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { allPatients as initialPatients, allAdmissions as initialAdmissions, allUsers } from '@/lib/data';
import { useLocalStorage } from '@/hooks/use-local-storage';

interface BedCardProps {
  bed: Bed;
}

const statusConfig = {
  vacant: {
    icon: <BedDouble className="h-5 w-5 text-green-500" />,
    color: 'border-green-500 bg-green-50 hover:bg-green-100 transition-colors',
    label: 'Vacant',
  },
  occupied: {
    icon: <User className="h-5 w-5 text-blue-500" />,
    color: 'border-blue-500 bg-blue-50 hover:bg-blue-100 transition-colors',
    label: 'Occupied',
  },
  maintenance: {
    icon: <Wrench className="h-5 w-5 text-red-500" />,
    color: 'border-red-500 bg-red-50',
    label: 'Maintenance',
  },
  cleaning: {
    icon: <SprayCan className="h-5 w-5 text-yellow-500" />,
    color: 'border-yellow-500 bg-yellow-50',
    label: 'Cleaning',
  },
  Reserved: {
    icon: <Clock className="h-5 w-5 text-purple-500" />,
    color: 'border-purple-500 bg-purple-50',
    label: 'Reserved',
  }
};

export function BedCard({ bed }: BedCardProps) {
  const [allPatients] = useLocalStorage<Patient[]>('patients', initialPatients);
  const [allAdmissions] = useLocalStorage<Admission[]>('admissions', initialAdmissions);

  const config = statusConfig[bed.status];
  const isOccupied = bed.status === 'occupied' && bed.current_patient_id;

  const patient = isOccupied ? allPatients.find(p => p.patient_id === bed.current_patient_id) : null;
  const admission = patient ? allAdmissions.find(a => a.admission_id === patient.current_admission_id) : null;
  const doctor = admission ? allUsers.find(u => u.uid === admission.attending_doctor_id) : null;

  const CardContentWrapper = ({ children }: { children: React.ReactNode }) => (
     <Card className={cn('flex flex-col h-full', config.color)}>
        {children}
     </Card>
  );

  const cardContent = (
    <>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{bed.bed_id}</CardTitle>
        {config.icon}
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="text-lg font-bold">{config.label}</div>
        {isOccupied && patient && (
          <p className="text-xs text-muted-foreground truncate">
            {patient.full_name}
          </p>
        )}
         {bed.status === 'vacant' && bed.cleaningNeeded && (
            <p className="text-xs text-yellow-600 font-semibold">
                Cleaning Needed
            </p>
        )}
      </CardContent>
    </>
  );

  if (isOccupied && patient) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={`/dashboard/patients/${bed.current_patient_id}`} className="h-full block">
              <CardContentWrapper>{cardContent}</CardContentWrapper>
            </Link>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-semibold">{patient.full_name}</p>
            <p className="text-sm text-muted-foreground">
              Doctor: {doctor?.name || 'N/A'}
            </p>
             <p className="text-sm text-muted-foreground">
              Admitted: {admission ? new Date(admission.admission_date).toLocaleDateString() : 'N/A'}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <CardContentWrapper>{cardContent}</CardContentWrapper>
  );
}
