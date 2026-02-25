
'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { RotateCw } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

// Mock data for past backups
const mockBackupHistory = [
  {
    backupId: 'backup-202408160200',
    timestamp: new Date('2024-08-16T02:00:00Z').toISOString(),
    status: 'Success',
    triggeredBy: 'Automated',
  },
  {
    backupId: 'backup-202408150200',
    timestamp: new Date('2024-08-15T02:00:00Z').toISOString(),
    status: 'Success',
    triggeredBy: 'Automated',
  },
  {
    backupId: 'backup-202408140200',
    timestamp: new Date('2024-08-14T02:00:00Z').toISOString(),
    status: 'Failed',
    triggeredBy: 'Automated',
  },
];

/**
 * == Tenant Data Resilience Dashboard ==
 * 
 * Monitors the automated backup status for the specific hospital tenant.
 * Provides a manual trigger for ad-hoc resilience points.
 */
export function BackupDashboard() {
  const { user } = useAuth();
  const [backups, setBackups] = React.useState(mockBackupHistory);
  const [isBackingUp, setIsBackingUp] = React.useState(false);
  const lastBackup = backups[0];

  const handleManualBackup = async () => {
    setIsBackingUp(true);
    toast.info('Manual backup initiated...', {
      description: `Targeting facility vault: ${user?.hospitalId}`,
    });

    // Simulate the backup process (Cloud Storage snapshot)
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const newBackup = {
      backupId: `manual-snap-${Date.now()}`,
      timestamp: new Date().toISOString(),
      status: 'Success' as 'Success' | 'Failed',
      triggeredBy: 'Manual',
    };
    
    setBackups([newBackup, ...backups]);
    toast.success('Facility Backup Completed', {
      description: 'Your hospital data has been successfully snapshotted.',
    });
    setIsBackingUp(false);
  };
  
  const getStatusVariant = (status: string) => {
    return status === 'Success' ? 'secondary' : 'destructive';
  }

  return (
    <div className="grid gap-6 md:grid-cols-1">
        <Card className="border-t-4 border-t-primary">
            <CardHeader>
                <CardTitle>Data Resilience: {user?.hospitalId}</CardTitle>
                <CardDescription>
                    Monitor and manage automated database backups for your facility.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/5">
                    <div>
                        <p className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Last Backup Status</p>
                        <Badge variant={getStatusVariant(lastBackup.status)} className="mt-1">
                            {lastBackup.status}
                        </Badge>
                    </div>
                     <div>
                        <p className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Last Backup Time</p>
                        <p className="font-semibold">{format(new Date(lastBackup.timestamp), 'PPP p')}</p>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                 <Button onClick={handleManualBackup} disabled={isBackingUp}>
                    <RotateCw className={`mr-2 h-4 w-4 ${isBackingUp ? 'animate-spin' : ''}`} />
                    {isBackingUp ? 'Snapshot in Progress...' : 'Trigger Manual Snapshot'}
                </Button>
            </CardFooter>
        </Card>
        
      <Card>
        <CardHeader>
          <CardTitle>Resilience Audit Log</CardTitle>
          <CardDescription>A log of all recent backup attempts for your tenant.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Triggered By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Snapshot ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map(backup => (
                  <TableRow key={backup.backupId}>
                    <TableCell>{format(new Date(backup.timestamp), 'PPP p')}</TableCell>
                    <TableCell>{backup.triggeredBy}</TableCell>
                    <TableCell>
                        <Badge variant={getStatusVariant(backup.status)}>
                            {backup.status}
                        </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-[10px] opacity-60 uppercase">{backup.backupId}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
