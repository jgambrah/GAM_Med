
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
 * unacknowledged alerts. It's designed for administrators or a rapid response team
 * to monitor patient safety issues across all wards.
 */
export function GlobalAlertsDashboard() {
  
  /**
   * == DATA QUERY (PSEUDOCODE) ==
   * This is where the component would perform a powerful Collection Group Query.
   * This type of query can search across all sub-collections with a specific name (e.g., 'alerts')
   * throughout the entire database, which is perfect for this kind of hospital-wide dashboard.
   *
   *   const q = query(
   *     collectionGroup(db, 'alerts'), // Query all 'alerts' sub-collections
   *     where('isAcknowledged', '==', false),
   *     where('severity', 'in', ['Critical', 'Warning']),
   *     orderBy('triggeredAt', 'desc')
   *   );
   *
   *   // This hook would provide a real-time list of all urgent alerts.
   *   const [urgentAlerts, loading, error] = useCollection(q);
   *
   */
  const unacknowledgedAlerts = mockAlerts.filter(a => 
    !a.isAcknowledged && (a.severity === 'Critical' || a.severity === 'Warning')
  );

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
                                    <Link href={`/dashboard/patients/${alert.patientId}`}>
                                        {getPatientName(alert.patientId)}
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
                                    onClick={() => handleAcknowledge(alert.patientId, alert.alertId)}
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
