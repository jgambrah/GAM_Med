'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { allUsers } from '@/lib/data';
import { User } from '@/lib/types';
import { differenceInDays, parseISO, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';

type License = NonNullable<User['licenses']>[number];
type Certification = NonNullable<User['certifications']>[number];
type Credential = (License & { type: 'License' }) | (Certification & { type: 'Certification' });

type FlatCredential = Credential & {
  staffId: string;
  staffName: string;
  status: 'Active' | 'Expiring Soon' | 'Expired';
};

const getStatus = (expiryDate: string): 'Active' | 'Expiring Soon' | 'Expired' => {
  const daysToExpiry = differenceInDays(parseISO(expiryDate), new Date());
  if (daysToExpiry < 0) return 'Expired';
  if (daysToExpiry <= 60) return 'Expiring Soon';
  return 'Active';
};

export function CredentialsDashboard() {
  const { user: currentUser } = useAuth();
  const [statusFilter, setStatusFilter] = React.useState('All');
  
  // SaaS LOGIC: Only process users for THIS hospital
  const allCredentials = React.useMemo<FlatCredential[]>(() => {
    const hospitalUsers = allUsers.filter(u => u.hospitalId === currentUser?.hospitalId);
    
    return hospitalUsers.flatMap(user => {
      const licenses = (user.licenses || []).map(lic => ({
        ...lic,
        type: 'License' as const,
        staffId: user.uid,
        staffName: user.name,
        status: getStatus(lic.expiryDate),
      }));
      const certs = (user.certifications || []).map(cert => ({
        ...cert,
        type: 'Certification' as const,
        staffId: user.uid,
        staffName: user.name,
        status: cert.expiryDate ? getStatus(cert.expiryDate) : 'Active',
      }));
      return [...licenses, ...certs];
    });
  }, [currentUser?.hospitalId]);
  
  const filteredCredentials = React.useMemo(() => {
    if (statusFilter === 'All') return allCredentials;
    return allCredentials.filter(c => c.status === statusFilter);
  }, [allCredentials, statusFilter]);

  const total = allCredentials.length;
  const activeCount = allCredentials.filter(c => c.status === 'Active').length;
  const expiringCount = allCredentials.filter(c => c.status === 'Expiring Soon').length;
  const expiredCount = allCredentials.filter(c => c.status === 'Expired').length;

  const activePercentage = total > 0 ? (activeCount / total) * 100 : 0;
  
  const getStatusVariant = (status: 'Active' | 'Expiring Soon' | 'Expired'): 'secondary' | 'default' | 'destructive' => {
    if (status === 'Expired') return 'destructive';
    if (status === 'Expiring Soon') return 'default';
    return 'secondary';
  }

  return (
    <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
            <Card>
                <CardHeader>
                    <CardTitle>Compliance Rate</CardTitle>
                    <CardDescription>Percentage of credentials that are currently active.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold">{activePercentage.toFixed(1)}%</div>
                    <Progress value={activePercentage} className="mt-2" />
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Expiring Soon</CardTitle>
                    <CardDescription>Credentials expiring within the next 60 days.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="text-3xl font-bold text-yellow-600">{expiringCount}</div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Expired</CardTitle>
                    <CardDescription>Credentials that are past their expiry date.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="text-3xl font-bold text-destructive">{expiredCount}</div>
                </CardContent>
            </Card>
        </div>
      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <CardTitle>Credential Expiry Report</CardTitle>
                    <CardDescription>A sortable list of all staff credentials for <strong>{currentUser?.hospitalId}</strong>.</CardDescription>
                </div>
                <div className="w-full sm:w-[200px]">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Statuses</SelectItem>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Expiring Soon">Expiring Soon</SelectItem>
                            <SelectItem value="Expired">Expired</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Credential Name</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCredentials.length > 0 ? (
                  filteredCredentials.map(cred => (
                    <TableRow key={`${cred.staffId}-${(cred as any).name || (cred as any).licenseNumber}-${cred.type}`} className={cn(cred.status === 'Expired' && 'bg-destructive/10', cred.status === 'Expiring Soon' && 'bg-yellow-500/10')}>
                      <TableCell>
                        <Button asChild variant="link" className="p-0 h-auto font-medium">
                            <Link href={`/dashboard/hr/staff/${cred.staffId}`}>
                                {cred.staffName}
                            </Link>
                        </Button>
                      </TableCell>
                      <TableCell>{cred.type}</TableCell>
                      <TableCell className="font-medium">{(cred as any).name || (cred as any).licenseNumber}</TableCell>
                      <TableCell>{cred.expiryDate ? format(parseISO(cred.expiryDate), 'PPP') : 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(cred.status)}>{cred.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic">
                      No credentials match the selected filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
