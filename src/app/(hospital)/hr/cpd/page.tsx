'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, where, doc, serverTimestamp, writeBatch, increment } from 'firebase/firestore';
import { 
  GraduationCap, Award, AlertTriangle, FileCheck, 
  UploadCloud, CheckCircle2, ShieldAlert, Search,
  ExternalLink, Calendar, Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { addDays } from 'date-fns';

export default function TrainingCPDHub() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'HR_MANAGER'].includes(userRole);

  const submissionsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, 'hospitals', hospitalId, 'cpd_submissions'));
  }, [firestore, hospitalId]);
  const { data: submissions, isLoading: areSubmissionsLoading } = useCollection(submissionsQuery);

  const staffQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, 'users'), where('hospitalId', '==', hospitalId), where('is_active', '==', true));
  }, [firestore, hospitalId]);
  const { data: staffData, isLoading: areStaffLoading } = useCollection(staffQuery);

  const stats = useMemo(() => {
    if (!submissions || !staffData) return { totalPoints: 0, pending: 0, atRisk: 0 };
    
    const now = new Date();
    const in90Days = addDays(now, 90);

    const atRiskCount = staffData.filter(staff => {
        if (!staff.licenseExpiry) return false;
        try {
            const expiryDate = new Date(staff.licenseExpiry);
            return expiryDate <= in90Days && expiryDate >= now;
        } catch(e) {
            return false;
        }
    }).length;

    return {
      totalPoints: submissions.filter(s => s.status === 'VERIFIED').reduce((a, b) => a + (b.points || 0), 0),
      pending: submissions.filter(s => s.status === 'PENDING').length,
      atRisk: atRiskCount,
    };
  }, [submissions, staffData]);

  const handleVerify = async (sub: any) => {
    if (!firestore || !user || !hospitalId) return;
    const batch = writeBatch(firestore);
    
    try {
      // 1. Mark Submission as Verified
      const subRef = doc(firestore, 'hospitals', hospitalId, 'cpd_submissions', sub.id);
      batch.update(subRef, { 
        status: 'VERIFIED', 
        verifiedBy: user.uid,
        verifiedByName: user.displayName,
        verifiedAt: serverTimestamp() 
      });

      // 2. Increment the Staff member's total points in their User profile
      const userRef = doc(firestore, "users", sub.staffId);
      batch.update(userRef, {
        totalCpdPoints: increment(sub.points)
      });

      await batch.commit();
      toast({ title: `Verified ${sub.points} points for ${sub.staffName}`});
    } catch (e: any) {
      toast({ variant: 'destructive', title: e.message });
    }
  };
  
  const isLoading = isUserLoading || isProfileLoading || areSubmissionsLoading || areStaffLoading;

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
          <h1 className="text-3xl font-black uppercase tracking-tighter italic">Compliance <span className="text-primary">& CPD</span></h1>
          <p className="text-muted-foreground font-medium">Tracking Clinical Excellence & Regulatory Licensing.</p>
        </div>
        <div className="flex gap-4">
           <div className="bg-amber-100/50 text-amber-700 px-6 py-2 rounded-2xl border border-amber-200 flex items-center gap-2">
              <ShieldAlert size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest">Renewal Risk: {stats.atRisk} Staff</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <StatCard label="Verified Points (Total)" value={stats.totalPoints} icon={<Award size={28}/>} color="blue" />
         <StatCard label="Awaiting Verification" value={stats.pending} icon={<FileCheck size={28}/>} color="orange" />
         <div className="bg-foreground p-8 rounded-[40px] text-white flex items-center justify-between shadow-xl">
            <div>
               <p className="text-[10px] font-black uppercase text-primary">Institutional Standing</p>
               <p className="text-3xl font-black italic">COMPLIANT</p>
            </div>
            <div className="p-4 bg-green-500 text-white rounded-3xl shadow-lg shadow-green-500/50"><CheckCircle2 size={28}/></div>
         </div>
      </div>

      <div className="bg-card rounded-[40px] border shadow-sm overflow-hidden">
        <div className="bg-muted/50 p-6 border-b">
           <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <UploadCloud size={16} className="text-primary" /> Pending Certificate Reviews
           </h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Clinician / Role</TableHead>
              <TableHead>CPD Topic & Provider</TableHead>
              <TableHead>Points</TableHead>
              <TableHead>Evidence</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {areSubmissionsLoading && <TableRow><TableCell colSpan={5} className="text-center p-12"><Loader2 className="animate-spin" /></TableCell></TableRow>}
            {!areSubmissionsLoading && submissions?.length === 0 ? (
               <TableRow><TableCell colSpan={5} className="p-20 text-center text-muted-foreground italic uppercase text-xs">No pending CPD reviews.</TableCell></TableRow>
            ) : submissions?.filter(s => s.status === 'PENDING').map(sub => (
              <TableRow key={sub.id}>
                <TableCell>
                   <p className="uppercase text-sm font-bold">{sub.staffName}</p>
                   <p className="text-[9px] text-primary font-black tracking-widest">{sub.role}</p>
                </TableCell>
                <TableCell>
                   <p className="text-xs uppercase font-bold">{sub.topic}</p>
                   <p className="text-[10px] text-muted-foreground uppercase italic">{sub.provider}</p>
                </TableCell>
                <TableCell>
                   <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-black inline-block">
                      +{sub.points}
                   </div>
                </TableCell>
                <TableCell>
                   <a href={sub.certificateUrl} target="_blank" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-all text-[10px] uppercase font-bold">
                      View Certificate <ExternalLink size={12}/>
                   </a>
                </TableCell>
                <TableCell className="p-6 text-right">
                   <Button 
                     onClick={() => handleVerify(sub)}
                     size="sm"
                     className="bg-green-600 text-white font-black uppercase text-[10px] tracking-widest hover:bg-foreground transition-all shadow-lg"
                   >
                     Verify Points
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

function StatCard({ label, value, icon, color }: any) {
    const colors: any = {
        blue: "bg-blue-50 border-blue-100 text-blue-700",
        orange: "bg-orange-50 border-orange-100 text-orange-700",
    }
    return (
        <div className={`p-8 rounded-[40px] border-2 shadow-sm flex items-center justify-between ${colors[color]}`}>
            <div>
               <p className="text-[10px] font-black uppercase text-muted-foreground">{label}</p>
               <p className="text-3xl font-black">{value}</p>
            </div>
            <div className={`p-4 rounded-3xl ${colors[color].replace('text', 'bg').replace('50', '100')} text-white`}>{icon}</div>
         </div>
    )
}
