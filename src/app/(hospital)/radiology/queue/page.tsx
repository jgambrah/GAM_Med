'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Camera, Loader2, ShieldAlert, CheckCircle2, Download, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow, format } from 'date-fns';
import { safeToDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

type RadiologyOrder = {
  id: string;
  scanName: string;
  patientName: string;
  providerName: string;
  modality: string;
  indication: string;
  orderedAt: any;
  completedAt?: any;
  status: 'PENDING' | 'IMAGE_READY' | 'COMPLETED';
  imageUrl?: string;
  impression?: string;
  findings?: string;
  radiologistName?: string;
};

export default function RadiologyQueuePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'ARCHIVE'>('ACTIVE');
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
  const isAuthorized = userRole === 'DIRECTOR' || userRole === 'RADIOLOGIST' || userRole === 'ADMIN';

  const allScansQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/radiology_orders`),
      orderBy("orderedAt", "desc")
    );
  }, [firestore, hospitalId]);
  
  const { data: allOrders, isLoading: areOrdersLoading } = useCollection<RadiologyOrder>(allScansQuery);

  const activeOrders = useMemo(() => {
    return allOrders?.filter(o => o.status === 'PENDING' || o.status === 'IMAGE_READY') || [];
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
          <p className="text-muted-foreground">You are not authorized to view the radiology queue.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Imaging <span className="text-orange-600">Desk</span></h1>
           <p className="text-muted-foreground font-medium">Acquire images, write scan reports, and track releases.</p>
        </div>
        
        {/* TAB CONTROLLERS */}
        <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1 border">
           <button 
             onClick={() => setActiveTab('ACTIVE')}
             className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'ACTIVE' ? 'bg-white text-black shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
           >
              Active Queue ({areOrdersLoading ? '...' : activeOrders.length})
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
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-orange-600" />
            Fetching imaging requests...
         </div>
      ) : activeTab === 'ACTIVE' ? (
        activeOrders.length === 0 ? (
          <div className="text-center p-20 bg-card border-2 border-dashed rounded-[32px] text-muted-foreground">
            <Camera className="h-12 w-12 mx-auto mb-2 text-slate-300" />
            The imaging queue is clear. No pending scan requests.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeOrders.map((order) => {
              const needsUpload = order.status === 'PENDING';
              return (
                <div key={order.id} className="bg-card p-6 rounded-[32px] border shadow-sm space-y-4 hover:border-orange-200 transition-all flex flex-col justify-between">
                   <div>
                     <div className="flex justify-between items-start mb-4">
                       <div className="bg-orange-100 p-3 rounded-2xl text-orange-600">
                          <Camera size={24} />
                       </div>
                       <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${needsUpload ? 'bg-blue-100/60 text-blue-800 border-blue-200' : 'bg-green-100/60 text-green-800 border-green-200 animate-pulse'}`}>
                          {needsUpload ? 'AWAITING UPLOAD' : 'IMAGE READY'}
                       </span>
                     </div>

                     <div className="space-y-1">
                       <p className="font-black text-card-foreground uppercase tracking-tight leading-tight">{order.scanName}</p>
                       <p className="text-xs font-bold text-muted-foreground">Patient: {order.patientName || 'Unknown Patient'}</p>
                       {order.indication && <p className="text-xs italic text-muted-foreground mt-2">"{order.indication}"</p>}
                       <p className="text-[10px] font-bold text-slate-400 mt-2">
                           Ordered By Dr. {order.providerName || 'Unknown Clinician'} • {formatDistanceToNow(safeToDate(order.orderedAt) || new Date(), { addSuffix: true })}
                       </p>
                     </div>
                   </div>
                   
                   {needsUpload ? (
                     <Button asChild className="w-full bg-foreground hover:bg-orange-600 text-background font-black uppercase text-[10px] tracking-widest transition-all mt-4 py-5 rounded-2xl">
                         <Link href={`/radiology/upload/${order.id}`}>
                             Acquire & Upload Image
                         </Link>
                     </Button>
                   ) : (
                     <Button asChild className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black uppercase text-[10px] tracking-widest transition-all mt-4 py-5 rounded-2xl">
                         <Link href={`/radiology/report/${order.id}`}>
                             Write Report & Sign
                         </Link>
                     </Button>
                   )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* ARCHIVE TAB VIEW */
        archiveOrders.length === 0 ? (
          <div className="text-center p-20 bg-card border-2 border-dashed rounded-[32px] text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-slate-300" />
            You have not transmitted any radiology reports yet.
          </div>
        ) : (
          <div className="bg-card rounded-[32px] border shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-black uppercase text-[10px] tracking-wider">Scan Name</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-wider">Patient Name</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-wider">Impression</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-wider">Clinician</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-wider">Radiologist</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-wider">Transmitted At</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-wider">Findings</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-wider text-right">Scan File</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archiveOrders.map((order) => {
                  const compDate = safeToDate(order.completedAt);
                  return (
                    <TableRow key={order.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-bold text-black uppercase text-xs">
                        {order.scanName}
                        <Badge variant="secondary" className="ml-2 text-[8px] font-black uppercase bg-slate-100">{order.modality}</Badge>
                      </TableCell>
                      <TableCell className="font-black uppercase text-xs text-slate-600">{order.patientName}</TableCell>
                      <TableCell className="font-black text-xs text-orange-600 uppercase tracking-tight max-w-xs truncate" title={order.impression}>
                        {order.impression}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-slate-600">Dr. {order.providerName}</TableCell>
                      <TableCell className="text-xs font-bold text-slate-600">{order.radiologistName || 'Signed'}</TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {compDate ? format(compDate, 'dd MMM yyyy, HH:mm') : 'N/A'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 italic max-w-xs truncate" title={order.findings}>
                        {order.findings}
                      </TableCell>
                      <TableCell className="text-right">
                        {order.imageUrl ? (
                          <Button asChild size="sm" variant="outline" className="h-8 px-3 rounded-xl border-orange-200 hover:border-orange-400 text-orange-700 hover:bg-orange-50">
                            <a href={order.imageUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 font-bold uppercase text-[9px]">
                              <Eye size={12} /> View Image
                            </a>
                          </Button>
                        ) : (
                          <span className="text-[9px] font-black uppercase text-slate-300 italic">No File</span>
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
