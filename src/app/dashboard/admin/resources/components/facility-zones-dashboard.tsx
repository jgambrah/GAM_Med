
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { mockFacilityZones, mockWorkOrders, allUsers } from '@/lib/data';
import { FacilityZone } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

export function FacilityZonesDashboard() {
  const [zones, setZones] = React.useState<FacilityZone[]>(mockFacilityZones);

  const getOpenRequestsCount = (zoneId: string) => {
    return mockWorkOrders.filter(
      (req) => req.facilityIssue?.includes(zoneId) && req.status === 'Open'
    ).length;
  };
  
  const getManagerName = (managerId?: string) => {
    if (!managerId) return 'N/A';
    return allUsers.find(u => u.uid === managerId)?.name || 'Unknown';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Facility Zone Overview</CardTitle>
        <CardDescription>
          A summary of all hospital zones and their open work orders.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zone Name</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead className="text-center">Open Work Orders</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {zones.map((zone) => {
                const openRequests = getOpenRequestsCount(zone.zoneId);
                return (
                  <TableRow key={zone.zoneId}>
                    <TableCell className="font-medium">{zone.name}</TableCell>
                    <TableCell>{getManagerName(zone.managerId)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={openRequests > 0 ? 'destructive' : 'secondary'}>
                        {openRequests}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
