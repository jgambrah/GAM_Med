
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AddMaintenanceRequestDialog } from '@/app/dashboard/admin/resources/components/add-maintenance-request-dialog';
import { useAuth } from '@/hooks/use-auth';
import { mockWorkOrders, mockResources } from '@/lib/data';
import { MyReportedIssue } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

function MyReportedIssues() {
  const { user } = useAuth();
  const [myIssues, setMyIssues] = React.useState<MyReportedIssue[]>([]);

  React.useEffect(() => {
    if (user) {
      const reported = mockWorkOrders
        .filter(wo => wo.reportedByUserId === user.uid)
        .map(wo => {
            const resource = mockResources.find(r => r.assetId === wo.assetId);
            return {
                issueId: wo.workOrderId,
                dateReported: wo.dateReported,
                description: wo.description,
                item: resource ? resource.name : (wo.facilityIssue || 'Facility Issue'),
                status: wo.status,
            }
        });
      setMyIssues(reported);
    }
  }, [user]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Reported Issues</CardTitle>
        <CardDescription>A list of all the maintenance issues you have reported.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date Reported</TableHead>
                <TableHead>Item / Area</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myIssues.length > 0 ? (
                myIssues.map(issue => (
                  <TableRow key={issue.issueId}>
                    <TableCell>{format(new Date(issue.dateReported), 'PPP p')}</TableCell>
                    <TableCell className="font-medium">{issue.item}</TableCell>
                    <TableCell>{issue.description}</TableCell>
                    <TableCell><Badge>{issue.status}</Badge></TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    You have not reported any issues.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReportIssuePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Report an Issue</h1>
          <p className="text-muted-foreground">
            Use this page to report any equipment or facility problems to the maintenance team.
          </p>
        </div>
        <AddMaintenanceRequestDialog />
      </div>
      <MyReportedIssues />
    </div>
  );
}
