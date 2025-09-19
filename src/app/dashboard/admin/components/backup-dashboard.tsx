
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
import { DatabaseBackup, RotateCw } from 'lucide-react';

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

export function BackupDashboard() {
  const [backups, setBackups] = React.useState(mockBackupHistory);
  const [isBackingUp, setIsBackingUp] = React.useState(false);
  const lastBackup = backups[0];

  const handleManualBackup = async () => {
    setIsBackingUp(true);
    toast.info('Manual backup initiated...', {
      description: 'This may take a few minutes.',
    });

    // Simulate the backup process
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const newBackup = {
      backupId: `backup-${Date.now()}`,
      timestamp: new Date().toISOString(),
      status: 'Success' as 'Success' | 'Failed',
      triggeredBy: 'Manual',
    };
    
    setBackups([newBackup, ...backups]);
    toast.success('Manual Backup Completed', {
      description: 'The database has been successfully backed up.',
    });
    setIsBackingUp(false);
  };
  
  const getStatusVariant = (status: string) => {
    return status === 'Success' ? 'secondary' : 'destructive';
  }

  return (
    <div className="grid gap-6 md:grid-cols-1">
        <Card>
            <CardHeader>
                <CardTitle>Backup Status</CardTitle>
                <CardDescription>
                    Monitor and manage automated database backups.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                        <p className="text-sm font-medium">Last Backup Status</p>
                        <Badge variant={getStatusVariant(lastBackup.status)} className="mt-1">
                            {lastBackup.status}
                        </Badge>
                    </div>
                     <div>
                        <p className="text-sm font-medium">Last Backup Time</p>
                        <p className="font-semibold">{format(new Date(lastBackup.timestamp), 'PPP p')}</p>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                 <Button onClick={handleManualBackup} disabled={isBackingUp}>
                    <RotateCw className={`mr-2 h-4 w-4 ${isBackingUp ? 'animate-spin' : ''}`} />
                    {isBackingUp ? 'Backup in Progress...' : 'Run Manual Backup'}
                </Button>
            </CardFooter>
        </Card>
        
      <Card>
        <CardHeader>
          <CardTitle>Backup History</CardTitle>
          <CardDescription>A log of all recent backup attempts.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Triggered By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Backup ID</TableHead>
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
                    <TableCell className="font-mono text-xs">{backup.backupId}</TableCell>
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
