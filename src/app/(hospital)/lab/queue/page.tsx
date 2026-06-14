'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { FlaskConical, Loader2, ShieldAlert, CheckCircle2, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow, format } from 'date-fns';
import { safeToDate } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

type LabOrder = {
  id: string;
  testName: string;
  patientName: string;
  providerName: string;
  orderedAt: any;
  completedAt?: any;
  status: string;
  resultValue?: string;
  unit?: string;
  referenceRange?: string;
  isAbnormal?: boolean;
  labTechName?: string;
  remarks?: string;
  reportUrl?: string;
};

export default function LabQueuePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'PENDING' | 'ARCHIVE'>('PENDING');
  const [claims, setClaims] = useState<any>(null);
  const [isClaimsLoading, setIsClaimsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      user.getIdTokenResult(true).then((idTokenResult) => {
        setClaims(idTokenResult.claims);
        setIsClaimsLoading(false);
      });
    } else if (!isUserLoading) {
      setIsClaimsLoading(false);
    }
  }, [user, isUserLoading]);
  
  const hospitalId = claims?.hospitalId;
  const userRole = claims?.role;
  const isAuthorized = userRole === 'DIRECTOR' || userRole === 'LAB_TECH' || userRole === 'ADMIN';

  const allLabsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/lab_orders`),
      orderBy("orderedAt", "desc")
    );
  }, [firestore, hospitalId]);
  
  const { data: allOrders, isLoading: areOrdersLoading } = useCollection<LabOrder>(allLabsQuery);

  const pendingOrders = useMemo(() => {
    return allOrders?.filter(o => o.status === 'PENDING') || [];
  }, [allOrders]);

  const archiveOrders = useMemo(() => {
    return allOrders?.filter(o => o.status === 'COMPLETED') || [];
  }, [allOrders]);

  const isLoading = isUserLoading || isClaimsLoading;
  
  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-4">
        <div className="text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You are not authorized to view the lab queue.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Diagnostic <span className="text-purple-600">Desk</span></h1>
           <p className="text-muted-foreground font-medium">Process lab test requests and track released reports.</p>
        </div>
        
        {/* TAB CONTROLLERS */}
        <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1 border">
           <button 
             onClick={() => setActiveTab('PENDING')}
             className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'PENDING' ? 'bg-white text-black shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
           >
              Awaiting Tests ({areOrdersLoading ? '...' : pendingOrders.length})
           </button>
           <button 
             onClick={() => setActiveTab('ARCHIVE')}
             className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'ARCHIVE' ? 'bg-white text-black shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
           >
              Transmitted Archive ({areOrdersLoading ? '...' : archiveOrders.length})
           </button>
        </div>
      </div>
      
      {areOrdersLoading ? (
         <div className="text-center p-12 text-muted-foreground bg-card border rounded-[32px]">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-purple-600" />
            Fetching lab requests...
         </div>
      ) : activeTab === 'PENDING' ? (
        pendingOrders.length === 0 ? (
          <div className="text-center p-20 bg-card border-2 border-dashed rounded-[32px] text-muted-foreground">
            <FlaskConical className="h-12 w-12 mx-auto mb-2 text-slate-300" />
            The laboratory queue is clear. No pending tests.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingOrders.map((order) => (
              <div key={order.id} className="bg-card p-6 rounded-[32px] border shadow-sm space-y-4 hover:border-purple-200 transition-all flex flex-col justify-between">
                 <div>
                   <div className="flex justify-between items-start mb-4">
                     <div className="bg-purple-100 p-3 rounded-2xl text-purple-600">
                        <FlaskConical size={24} />
                     </div>
                     <span className="text-[10px] font-black bg-amber-100/60 text-amber-800 px-3 py-1 rounded-full border border-amber-200">AWAITING RESULT</span>
                   </div>

                   <div className="space-y-1">
                     <p className="font-black text-card-foreground uppercase tracking-tight leading-tight">{order.testName}</p>
                     <p className="text-xs font-bold text-muted-foreground">Patient: {order.patientName}</p>
                     <p className="text-[10px] font-bold text-slate-400">
                         Ordered By Dr. {order.providerName} • {formatDistanceToNow(safeToDate(order.orderedAt) || new Date(), { addSuffix: true })}
                     </p>
                   </div>
                 </div>

                 <Button 
                   className="w-full bg-foreground hover:bg-purple-600 text-background font-black uppercase text-[10px] tracking-widest transition-all mt-4 py-5 rounded-2xl"
                   onClick={() => router.push(`/lab/results/${order.id}`)}
                 >
                   Enter Results & Release
                 </Button>
              </div>
            ))}
          </div>
        )
      ) : (
        /* ARCHIVE TAB VIEW */
        archiveOrders.length === 0 ? (
          <div className="text-center p-20 bg-card border-2 border-dashed rounded-[32px] text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-slate-300" />
            You have not transmitted any lab reports yet.
          </div>
        ) : (
          <div className="bg-card rounded-[32px] border shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-black uppercase text-[10px] tracking-wider">Test Name</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-wider">Patient Name</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-wider">Measured Value</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-wider">Ref Range</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-wider">Clinician</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-wider">Transmitted At</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-wider">Remarks</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-wider text-right">Report File</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archiveOrders.map((order) => {
                  const compDate = safeToDate(order.completedAt);
                  return (
                    <TableRow key={order.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-bold text-black uppercase text-xs">{order.testName}</TableCell>
                      <TableCell className="font-black uppercase text-xs text-slate-600">{order.patientName}</TableCell>
                      <TableCell>
                        <span className={`font-black text-sm ${order.isAbnormal ? 'text-red-600 border-b-2 border-red-500 pb-0.5' : 'text-purple-700'}`}>
                          {order.resultValue} <span className="text-[10px] font-bold text-slate-400 not-italic">{order.unit}</span>
                        </span>
                        {order.isAbnormal && (
                          <Badge variant="destructive" className="ml-2 text-[8px] font-black uppercase py-0 px-2 animate-pulse">ABNORMAL</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-500">{order.referenceRange || 'N/A'} {order.unit}</TableCell>
                      <TableCell className="text-xs font-bold text-slate-600">Dr. {order.providerName}</TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {compDate ? format(compDate, 'dd MMM yyyy, HH:mm') : 'N/A'}
                      </TableCell>
                      <TableCell className="text-xs italic text-slate-500 max-w-xs truncate" title={order.remarks}>
                        {order.remarks || 'No remarks.'}
                      </TableCell>
                      <TableCell className="text-right">
                        {order.reportUrl ? (
                          <Button asChild size="sm" variant="outline" className="h-8 px-3 rounded-xl border-purple-200 hover:border-purple-400 text-purple-700 hover:bg-purple-50">
                            <a href={order.reportUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 font-bold uppercase text-[9px]">
                              <Download size={12} /> View File
                            </a>
                          </Button>
                        ) : (
                          <span className="text-[9px] font-black uppercase text-slate-300 italic">No Attachment</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )
      )}
    </div>
  );
}
