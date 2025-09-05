
'use client';

import * as React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { mockEquipmentLogs } from '@/lib/data';
import { EquipmentLog } from '@/lib/types';
import { format } from 'date-fns';
import { AlertCircle } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

export function EquipmentLogDashboard() {
  // In a real-time app, this would be a live listener to the `equipment_logs` collection.
  const [logs, setLogs] = React.useState<EquipmentLog[]>(mockEquipmentLogs);

  return (
    <div className="rounded-md border">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Equipment ID</TableHead>
                    <TableHead>Sample Barcode</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {logs.length > 0 ? (
                    logs.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((log) => (
                        <TableRow key={log.logId} className={log.error ? 'bg-destructive/10' : ''}>
                           <TableCell className="font-mono text-xs">
                                {format(new Date(log.timestamp), 'PPP p')}
                            </TableCell>
                            <TableCell>{log.equipmentId}</TableCell>
                            <TableCell className="font-mono">{log.barcodeScanned}</TableCell>
                            <TableCell>
                                <Badge variant={log.isProcessed ? 'secondary' : 'default'}>
                                    {log.isProcessed ? 'Processed' : 'Pending'}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                {log.error && (
                                     <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <span className="flex items-center text-destructive">
                                                    <AlertCircle className="h-4 w-4 mr-2" />
                                                    Error
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{log.error}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                            </TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            No equipment logs found.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    </div>
  );
}
