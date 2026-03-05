'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ServerCrash } from "lucide-react";
import { formatDistanceToNow, isPast } from 'date-fns';
import { FacilityActions } from "./facility-actions";

type Hospital = {
  id: string;
  name: string;
  region: string;
  subscriptionPlan: string;
  isSuspended?: boolean;
  status: 'active' | 'suspended';
  trialExpiry?: {
    toDate: () => Date;
  };
};

interface FacilityDirectoryProps {
  hospitals: Hospital[] | null;
  isLoading: boolean;
}

const getStatus = (hospital: Hospital): { text: string; variant: "default" | "secondary" | "destructive" | "outline" } => {
    if (hospital.status === 'suspended') {
        return { text: 'Suspended', variant: 'destructive' };
    }
    if (hospital.trialExpiry) {
        const expiryDate = hospital.trialExpiry.toDate();
        if (isPast(expiryDate)) {
            return { text: 'Expired', variant: 'outline' };
        }
        return { text: `Trial (${formatDistanceToNow(expiryDate)} left)`, variant: 'secondary' };
    }
    return { text: 'Active', variant: 'default' };
};

export function FacilityDirectory({ hospitals, isLoading }: FacilityDirectoryProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Facility Directory</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hospitals || hospitals.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Facility Directory</CardTitle>
                <CardDescription>Manage all onboarded facilities.</CardDescription>
            </CardHeader>
            <CardContent className="text-center py-12">
                <ServerCrash className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">No Facilities Found</h3>
                <p className="text-sm text-muted-foreground">Onboard a new hospital to see it here.</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Facility Directory</CardTitle>
        <CardDescription>Manage all onboarded facilities.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Facility</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hospitals.map((hospital) => {
              const status = getStatus(hospital);
              return (
                <TableRow key={hospital.id}>
                    <TableCell>
                        <div className="font-medium">{hospital.name}</div>
                        <div className="text-sm text-muted-foreground">{hospital.region}</div>
                    </TableCell>
                    <TableCell>
                        <Badge variant="outline">{hospital.subscriptionPlan}</Badge>
                    </TableCell>
                    <TableCell>
                        <Badge variant={status.variant}>{status.text}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                        <FacilityActions hospital={hospital} />
                    </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
