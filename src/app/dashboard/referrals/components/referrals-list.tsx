
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
import { Referral } from '@/lib/types';
import { format } from 'date-fns';
import { 
    CheckCircle2, 
    XCircle, 
    Clock, 
    Hospital,
    User,
    ArrowUpRight
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';

interface ReferralsListProps {
  referrals: Referral[];
  type: 'incoming' | 'outgoing';
}

export function ReferralsList({ referrals, type }: ReferralsListProps) {
  const firestore = useFirestore();

  const handleUpdateStatus = (id: string, status: Referral['status']) => {
    if (!firestore) return;
    const ref = doc(firestore, 'referrals', id);
    
    updateDocumentNonBlocking(ref, { 
        status,
        updatedAt: serverTimestamp()
    });

    toast.success(`Referral ${status}`);
  };

  const getStatusVariant = (status: Referral['status']) => {
    switch (status) {
      case 'Accepted': return 'secondary';
      case 'Rejected': return 'destructive';
      case 'Completed': return 'outline';
      default: return 'default';
    }
  };

  return (
    <div className="rounded-md border bg-white overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="pl-6">Patient</TableHead>
            <TableHead>{type === 'incoming' ? 'From Facility' : 'To Facility'}</TableHead>
            <TableHead>Clinical Summary</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right pr-6">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {referrals.length > 0 ? (
            referrals.map((ref) => (
              <TableRow key={ref.id} className="hover:bg-muted/20 transition-colors">
                <TableCell className="pl-6">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                        <p className="font-bold text-slate-900">{ref.patientName}</p>
                        <p className="text-[10px] text-muted-foreground font-mono uppercase">ID: {ref.patientId}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Hospital className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold">{type === 'incoming' ? ref.fromHospitalName : (ref.toHospitalName || ref.toHospitalId)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="text-xs line-clamp-2 max-w-xs text-muted-foreground italic">
                    "{ref.clinicalSummary}"
                  </p>
                </TableCell>
                <TableCell>
                  <Badge variant={ref.priority === 'Emergency' ? 'destructive' : 'outline'} className="text-[9px] uppercase font-black">
                    {ref.priority}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(ref.status)} className="text-[9px] uppercase font-black">
                    {ref.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right pr-6">
                  <div className="flex justify-end gap-2">
                    {type === 'incoming' && ref.status === 'Pending' && (
                      <>
                        <Button size="sm" variant="ghost" className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleUpdateStatus(ref.id!, 'Accepted')}>
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Accept
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 text-destructive" onClick={() => handleUpdateStatus(ref.id!, 'Rejected')}>
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    {type === 'incoming' && ref.status === 'Accepted' && (
                        <Button size="sm" className="h-8" onClick={() => handleUpdateStatus(ref.id!, 'Completed')}>
                            Mark Complete
                        </Button>
                    )}
                    <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold">
                        <ArrowUpRight className="h-3 w-3 mr-1" />
                        Details
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-32 text-center">
                <div className="flex flex-col items-center justify-center text-muted-foreground opacity-40">
                    <Clock className="h-12 w-12 mb-2" />
                    <p>No referrals in this queue.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
