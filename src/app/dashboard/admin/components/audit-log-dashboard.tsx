
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDebouncedCallback } from 'use-debounce';
import { Input } from '@/components/ui/input';
import { allUsers, mockAuditLogs } from '@/lib/data';
import { AuditLog } from '@/lib/types';
import { format } from 'date-fns';

export function AuditLogDashboard() {
  const [logs, setLogs] = React.useState<AuditLog[]>(mockAuditLogs);
  const [searchQuery, setSearchQuery] = React.useState('');

  const filterLogs = useDebouncedCallback((query: string) => {
    if (!query) {
      setLogs(mockAuditLogs);
    } else {
      const lowercasedQuery = query.toLowerCase();
      const filtered = mockAuditLogs.filter(log =>
        log.action.toLowerCase().includes(lowercasedQuery) ||
        log.userId.toLowerCase().includes(lowercasedQuery) ||
        (getUserName(log.userId).toLowerCase().includes(lowercasedQuery)) ||
        log.details.targetDocId.toLowerCase().includes(lowercasedQuery)
      );
      setLogs(filtered);
    }
  }, 300);

  React.useEffect(() => {
    filterLogs(searchQuery);
  }, [searchQuery, filterLogs]);
  
  const getUserName = (userId: string) => allUsers.find(u => u.uid === userId)?.name || 'Unknown User';

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <CardTitle>System Audit Log</CardTitle>
              <CardDescription>
                An immutable, real-time log of all user actions in the system.
              </CardDescription>
            </div>
            <Input
                placeholder="Search by action, user, or target ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
            />
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border h-[60vh] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/50">
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target Document</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.logId}>
                  <TableCell className="font-mono text-xs">{format(new Date(log.timestamp), 'PPP p')}</TableCell>
                  <TableCell>{getUserName(log.userId)} ({log.userId})</TableCell>
                  <TableCell className="font-semibold">{log.action}</TableCell>
                  <TableCell className="font-mono text-xs">{log.details.targetDocId}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
