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
import { mockAlerts, allPatients } from '@/lib/data';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { acknowledgeAlert } from '@/lib/actions';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PatientAlert } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';

const getSeverityVariant = (severity: PatientAlert['severity']): "destructive" | "default" | "secondary" => {
    switch (severity) {
        case 'Critical': return 'destructive';
        case 'Warning': return 'default';
        default: return 'secondary';
    }
}

/**
 * == Conceptual UI: Global Alerts Dashboard ==
 * This component provides a centralized, hospital-wide view of all high-priority,
 * unacknowledged alerts for the current tenant.
 */
export function GlobalAlertsDashboard() {
  const { user } = useAuth();
  
  /**
   * == SaaS DATA QUERY ==
   * This is where the component would perform a Collection Group Query filtered by hospitalId.
   */
  const unacknowledgedAlerts = React.useMemo(() => {
    if (!user) return [];
    return mockAlerts.filter(a => 
        a.hospitalId === user.hospitalId &&
        !a.isAcknowledged && 
        (a.severity === 'Critical' || a.severity === 'Warning')
    );
  }, [user]);

  const getPatientName = (patientId: string) => {
    return allPatients.find(p => p.patient_id === patientId)?.full_name || 'Unknown Patient';
  }

  const handleAcknowledge = async (patientId: string, alertId: string) => {
      const result = await acknowledgeAlert(patientId, alertId);
      if (result.success) {
          alert('Alert acknowledged (simulated).');
      } else {
          alert('Failed to acknowledge alert.');
      }
  }

  return (
    <div className="rounded-md border">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Triggered</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Alert Message</TableHead>
                    <TableHead>Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {unacknowledgedAlerts.length > 0 ? (
                    unacknowledgedAlerts.map((alert) => (
                        <TableRow key={alert.alertId} className={cn(alert.severity === 'Critical' && 'bg-destructive/10 hover:bg-destructive/20')}>
                           <TableCell className="font-medium">
                                {formatDistanceToNow(new Date(alert.triggeredAt), { addSuffix: true })}
                            </TableCell>
                            <TableCell>
                                <Button variant="link" asChild className="p-0 h-auto">
                                    <Link href={`/dashboard/patients/${alert.patientId || '#'}`}>
                                        {getPatientName(alert.patientId || '')}
                                    </Link>
                                </Button>
                            </TableCell>
                            <TableCell>
                                <Badge variant={getSeverityVariant(alert.severity)}>
                                    <AlertTriangle className="h-3 w-3 mr-1.5" />
                                    {alert.severity}
                                </Badge>
                            </TableCell>
                            <TableCell>{alert.alert_message}</TableCell>
                            <TableCell>
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleAcknowledge(alert.patientId || '', alert.alertId)}
                                >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Acknowledge
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            No unacknowledged high-priority alerts.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    </div>
  );
}