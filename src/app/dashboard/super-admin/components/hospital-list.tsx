'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Hospital } from '@/lib/types';
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';

export function HospitalList() {
  const db = useFirestore();
  const { user } = useAuth();

  /**
   * == SAAS TENANT-LOCKED QUERY ==
   * Super Admins see all hospitals.
   * Regular staff only see their own facility.
   * This ensures compliance with Firestore Security Rules.
   */
  const hospitalsQuery = useMemoFirebase(() => {
    if (!user) return null;
    
    const hospitalsRef = collection(db, 'hospitals');
    
    if (user.role === 'super_admin') {
        return query(hospitalsRef, orderBy('createdAt', 'desc'));
    }
    
    // THE SAAS WALL: Filter by hospitalId for logical isolation
    return query(
        hospitalsRef, 
        where("hospitalId", "==", user.hospitalId)
    );
  }, [db, user]);

  const { data: hospitals, isLoading } = useCollection<Hospital>(hospitalsQuery);

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading facility data...</div>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Hospital Name</TableHead>
            <TableHead>Tenant ID (Slug)</TableHead>
            <TableHead>Onboarded</TableHead>
            <TableHead>Tier</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {hospitals && hospitals.length > 0 ? (
            hospitals.map((hospital) => (
              <TableRow key={hospital.hospitalId}>
                <TableCell className="font-medium">{hospital.name}</TableCell>
                <TableCell className="font-mono text-xs">{hospital.hospitalId}</TableCell>
                <TableCell>{hospital.createdAt ? format(new Date(hospital.createdAt), 'PPP') : 'N/A'}</TableCell>
                <TableCell className="capitalize">{hospital.subscriptionTier}</TableCell>
                <TableCell>
                  <Badge variant={hospital.status === 'active' ? 'secondary' : 'destructive'}>
                    {hospital.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Tenant Ops</DropdownMenuLabel>
                      <DropdownMenuItem>View Performance</DropdownMenuItem>
                      <DropdownMenuItem>Manage Subscription</DropdownMenuItem>
                      {user?.role === 'super_admin' && (
                          <DropdownMenuItem className="text-destructive">Suspend Access</DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No hospitals found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}