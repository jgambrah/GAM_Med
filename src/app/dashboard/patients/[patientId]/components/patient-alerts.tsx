

'use client';

import * as React from 'react';
import { AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { mockAlerts } from '@/lib/data';
import { PatientAlert } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { acknowledgeAlert } from '@/lib/actions';
import { formatDistanceToNow } from 'date-fns';


const severityConfig = {
    'Critical': {
        icon: AlertTriangle,
        color: 'bg-red-50 border-red-500 text-red-800',
        iconColor: 'text-red-500',
    },
    'Warning': {
        icon: AlertTriangle,
        color: 'bg-yellow-50 border-yellow-500 text-yellow-800',
        iconColor: 'text-yellow-500',
    },
    'Information': {
        icon: Info,
        color: 'bg-blue-50 border-blue-500 text-blue-800',
        iconColor: 'text-blue-500',
    },
}

interface PatientAlertsProps {
    patientId: string;
}

export function PatientAlerts({ patientId }: PatientAlertsProps) {
    const { user } = useAuth();
    // In a real app, this would be a real-time Firestore query.
    const unacknowledgedAlerts = mockAlerts.filter(a => a.patientId === patientId && !a.isAcknowledged);

    const canAcknowledge = user?.role === 'doctor' || user?.role === 'admin' || user?.role === 'nurse';

    const handleAcknowledge = async (alertId: string) => {
        const result = await acknowledgeAlert(patientId, alertId);
        if (result.success) {
            alert('Alert acknowledged (simulated).');
        } else {
            alert('Failed to acknowledge alert.');
        }
    }

    if (unacknowledgedAlerts.length === 0) {
        return null; // Don't render anything if there are no active alerts
    }

    return (
        <Card className="border-l-4 border-destructive">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                    <CardTitle>Active Clinical Alerts</CardTitle>
                </div>
                <CardDescription>
                    The following alerts require your attention. Please review and acknowledge them.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {unacknowledgedAlerts.map((alert) => {
                    const config = severityConfig[alert.severity];
                    const Icon = config.icon;
                    return (
                        <div key={alert.alertId} className={cn('p-4 rounded-md border flex items-start gap-4', config.color)}>
                            <Icon className={cn('h-5 w-5 mt-0.5 flex-shrink-0', config.iconColor)} aria-hidden="true" />
                            <div className="flex-grow">
                                <p className="font-semibold">{alert.severity} Alert</p>
                                <p className="text-sm">{alert.alert_message}</p>
                                <p className="text-xs mt-1 opacity-70">
                                    Triggered {formatDistanceToNow(new Date(alert.triggeredAt), { addSuffix: true })}
                                </p>
                            </div>
                             {canAcknowledge && (
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="bg-background"
                                    onClick={() => handleAcknowledge(alert.alertId)}
                                >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Acknowledge
                                </Button>
                             )}
                        </div>
                    )
                })}
            </CardContent>
        </Card>
    );
}
