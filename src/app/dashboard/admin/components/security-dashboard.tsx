
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { mockSecurityIncidents, allUsers } from '@/lib/data';
import { SecurityIncident } from '@/lib/types';
import { AddSecurityIncidentDialog } from './add-security-incident-dialog';
import { useDebouncedCallback } from 'use-debounce';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';

export function SecurityDashboard() {
  const { user } = useAuth();
  const [incidents, setIncidents] = React.useState<SecurityIncident[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');

  const filterIncidents = useDebouncedCallback((query: string) => {
    if (!user) return;

    // SaaS LOGIC: Always filter by hospitalId first
    const hospitalIncidents = mockSecurityIncidents.filter(i => i.hospitalId === user.hospitalId);

    if (!query) {
      setIncidents(hospitalIncidents);
    } else {
      const lowercasedQuery = query.toLowerCase();
      const filtered = hospitalIncidents.filter(incident =>
        incident.details.toLowerCase().includes(lowercasedQuery) ||
        incident.location.toLowerCase().includes(lowercasedQuery) ||
        incident.type.toLowerCase().includes(lowercasedQuery)
      );
      setIncidents(filtered);
    }
  }, 300);

  React.useEffect(() => {
    filterIncidents(searchQuery);
  }, [searchQuery, filterIncidents, user]);
  
  const getUserName = (userId: string) => allUsers.find(u => u.uid === userId)?.name || 'Unknown';

  const getStatusVariant = (status: SecurityIncident['status']): "default" | "secondary" | "destructive" => {
      if (status === 'Resolved') return 'secondary';
      if (status === 'Under Investigation') return 'default';
      return 'destructive';
  }

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center">
        <div>
          <CardTitle>Security Incident Log</CardTitle>
          <CardDescription>
            A log of all security-related incidents reported in the hospital.
          </CardDescription>
        </div>
        <AddSecurityIncidentDialog />
      </CardHeader>
      <CardContent>
         <div className="flex justify-end mb-4">
            <Input
                placeholder="Search incidents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
            />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Reported By</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidents.map((incident) => (
                <TableRow key={incident.incidentId}>
                  <TableCell className="font-mono text-xs">{format(new Date(incident.timestamp), 'PPP p')}</TableCell>
                  <TableCell>{incident.type}</TableCell>
                  <TableCell className="font-medium">{incident.location}</TableCell>
                  <TableCell className="max-w-xs truncate">{incident.details}</TableCell>
                  <TableCell>{getUserName(incident.reportedByUserId)}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(incident.status)}>{incident.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
