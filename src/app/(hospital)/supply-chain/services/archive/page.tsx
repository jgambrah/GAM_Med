'use client';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { History, FileText, Loader2, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function JCCArchivePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'STORE_MANAGER', 'ACCOUNTANT'].includes(userProfile?.role || '');

  const jccQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/jcc_logs`),
      orderBy("createdAt", "desc")
    );
  }, [firestore, hospitalId]);

  const { data: jccLogs, isLoading: areLogsLoading } = useCollection(jccQuery);

  const isLoading = isUserLoading || isProfileLoading || areLogsLoading;

  if (isLoading) {
    return <div className="p-10 text-center"><Loader2 className="animate-spin" /></div>;
  }
  
  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-4">
        <div className="text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You are not authorized for this module.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end border-b pb-6">
        <div>
          <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">JCC <span className="text-primary">Archive</span></h1>
          <p className="text-muted-foreground font-medium">Historical record of all certified service completions.</p>
        </div>
      </div>

      <div className="bg-card rounded-[32px] border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>JCC Number</TableHead>
              <TableHead>PO Reference</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Value (GHS)</TableHead>
              <TableHead>Certified By</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {areLogsLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center p-12"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
            ) : jccLogs?.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center p-20 text-muted-foreground italic">No Job Completion Certificates found.</TableCell></TableRow>
            ) : jccLogs?.map(log => (
              <TableRow key={log.id}>
                <TableCell className="font-mono font-bold">{log.jccNumber}</TableCell>
                <TableCell className="font-mono">{log.poNumber}</TableCell>
                <TableCell className="font-bold uppercase">{log.supplierName}</TableCell>
                <TableCell className="font-mono">{log.totalValue.toFixed(2)}</TableCell>
                <TableCell>{log.hODName}</TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/supply-chain/services/certificate/${log.id}`}>
                       <FileText size={14}/> View
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}