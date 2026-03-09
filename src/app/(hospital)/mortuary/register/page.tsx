'use client';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, serverTimestamp, writeBatch, runTransaction, increment } from 'firebase/firestore';
import { UserCheck, Box, LogOut, Loader2, ShieldAlert, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { differenceInCalendarDays, format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';

export default function MortuaryRegisterPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [releaseInfo, setReleaseInfo] = useState({ name: '', idNumber: '' });
  const [isReleaseDialogOpen, setIsReleaseDialogOpen] = useState(false);

  const userProfileRef = useMemoFirebase(() => (user && firestore ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'MORTUARY_ATTENDANT'].includes(userProfile?.role || '');

  const recordsQuery = useMemoFirebase(() => (hospitalId ? query(collection(firestore, `hospitals/${hospitalId}/mortuary_records`), where("status", "in", ["IN_STORAGE", "PENDING_RELEASE"])) : null), [firestore, hospitalId]);
  const { data: records, isLoading: areRecordsLoading } = useCollection(recordsQuery);

  const configRef = useMemoFirebase(() => (hospitalId ? doc(firestore, 'hospitals', hospitalId, 'mortuary_config', 'main') : null), [firestore, hospitalId]);
  const { data: mortuaryConfig, isLoading: isConfigLoading } = useDoc(configRef);

  const calculateDays = (admittedAt: any) => {
    if (!admittedAt) return 0;
    return differenceInCalendarDays(new Date(), admittedAt.toDate()) + 1;
  };

  const calculateBill = (record: any) => {
    if (!mortuaryConfig || !record?.admittedAt) return 0;
    const days = calculateDays(record.admittedAt);
    return days * (mortuaryConfig.dailyStorageFee || 50);
  };
  
  const handleOpenReleaseDialog = (record: any) => {
    setSelectedRecord(record);
    setIsReleaseDialogOpen(true);
  };

  const handleFinalizeRelease = async () => {
    if (!selectedRecord || !user || !firestore || !hospitalId || !releaseInfo.name || !releaseInfo.idNumber) {
        toast({ variant: "destructive", title: "Missing Details", description: "Please enter the full name and ID of the person receiving the body." });
        return;
    }
    setLoading(true);

    try {
        await runTransaction(firestore, async (transaction) => {
            const recordRef = doc(firestore, `hospitals/${hospitalId}/mortuary_records`, selectedRecord.id);
            const chamberRef = doc(firestore, `hospitals/${hospitalId}/mortuary_chambers`, selectedRecord.chamberId);
            
            const totalBill = calculateBill(selectedRecord);
            
            // 1. BILLING: Create the final billing item for the mortuary stay
            if (totalBill > 0) {
              const billRef = doc(collection(firestore, `hospitals/${hospitalId}/billing_items`));
              transaction.set(billRef, {
                  description: `Mortuary Services for Body of ${selectedRecord.bodyName}`,
                  total: totalBill,
                  category: 'MORTUARY',
                  status: 'UNPAID',
                  patientId: selectedRecord.id,
                  patientName: `Family of ${selectedRecord.bodyName}`,
                  hospitalId,
                  billedBy: user.uid,
                  createdAt: serverTimestamp(),
              });
            }

            // 2. CHAIN OF CUSTODY: Update the mortuary record with release details
            transaction.update(recordRef, { 
                status: 'RELEASED',
                releasedToName: releaseInfo.name,
                releasedToID: releaseInfo.idNumber,
                releasedBy: user.uid,
                releasedAt: serverTimestamp(),
            });

            // 3. LOGISTICS: Free up the chamber
            transaction.update(chamberRef, { 
                status: 'AVAILABLE',
                bodyId: null,
                bodyName: null,
                admittedAt: null,
            });
        });

        toast({ title: "Body Release Authorized", description: `Final bill sent to cashier. Printing certificate...` });
        router.push(`/mortuary/release/certificate/${selectedRecord.id}`);
        setIsReleaseDialogOpen(false);
        setSelectedRecord(null);

    } catch (e: any) {
        toast({ variant: 'destructive', title: "Error during release", description: e.message });
    } finally {
        setLoading(false);
    }
  }

  const isLoading = isUserLoading || isProfileLoading || areRecordsLoading;
  
  if (isLoading) return <div className="p-20 text-center"><Loader2 className="animate-spin" /></div>;

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
    <>
      <div className="p-8 space-y-8 max-w-7xl mx-auto text-black font-bold">
        <div className="flex justify-between items-end border-b-8 border-slate-900 pb-6">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter italic">Mortuary <span className="text-blue-600">Register</span></h1>
            <p className="text-slate-500 font-bold text-xs uppercase italic">Live Census of All Bodies in Cold Storage.</p>
          </div>
          <div className="bg-slate-900 text-white p-4 rounded-3xl flex items-center gap-3">
             <Box size={20} className="text-blue-400" />
             <span className="text-[10px] font-black uppercase tracking-widest">Active Records: {isLoading ? '...' : records?.length ?? 0}</span>
          </div>
        </div>

        <div className="bg-white rounded-[40px] border-4 border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-900 text-white text-[10px] uppercase font-black tracking-widest">
              <tr>
                <th className="p-6">Deceased Name & ID</th>
                <th className="p-6">Admitted On</th>
                <th className="p-6">Chamber No.</th>
                <th className="p-6 text-center">Days</th>
                <th className="p-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y-4 divide-slate-50">
              {areRecordsLoading && <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="animate-spin" /></td></tr>}
              {!areRecordsLoading && records?.length === 0 ? (
                <tr><td colSpan={5} className="p-20 text-center text-slate-300 italic uppercase">No bodies currently in storage.</td></tr>
              ) : records?.map(record => (
                <tr key={record.id} className="hover:bg-blue-50/50 transition-all font-bold">
                  <td className="p-6">
                    <p className="text-sm uppercase">{record.bodyName}</p>
                    <p className="text-[9px] text-blue-600 font-black">ID: {record.bodyId}</p>
                  </td>
                  <td className="p-6 text-sm text-slate-500">{record.admittedAt ? format(record.admittedAt.toDate(), 'PPP') : 'N/A'}</td>
                  <td className="p-6 text-center">
                    <span className="bg-slate-100 px-4 py-1 rounded-full text-xs">{record.chamberNumber}</span>
                  </td>
                  <td className="p-6 text-center text-lg font-black">{calculateDays(record.admittedAt)}</td>
                  <td className="p-6 text-right">
                    <Button onClick={() => handleOpenReleaseDialog(record)} className="bg-blue-600 hover:bg-black text-white" size="sm" disabled={record.status === 'PENDING_RELEASE'}>
                       {record.status === 'PENDING_RELEASE' ? 'Pending Payment' : 'Initiate Release'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <Dialog open={isReleaseDialogOpen} onOpenChange={setIsReleaseDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Authorize Final Release & Bill</DialogTitle>
                <DialogDescription>
                    This will generate the final bill for <strong>{selectedRecord?.bodyName}</strong> and prepare the release certificate.
                </DialogDescription>
            </DialogHeader>
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 text-center">
                <p className="text-[10px] font-black uppercase text-blue-500">Calculated Final Bill</p>
                <p className="text-3xl font-black text-blue-900">GHS {selectedRecord ? calculateBill(selectedRecord).toLocaleString(undefined, {minimumFractionDigits: 2}) : '0.00'}</p>
                <p className="text-xs text-blue-400 italic">({selectedRecord ? calculateDays(selectedRecord.admittedAt) : 0} days @ GHS {mortuaryConfig?.dailyStorageFee || 0}/day)</p>
            </div>
             <div className="space-y-4 py-4">
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Receiving Relative's Full Name</label>
                    <Input className="mt-1" onChange={(e) => setReleaseInfo({...releaseInfo, name: e.target.value})} />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Receiving Relative's Ghana Card ID</label>
                    <Input className="mt-1" onChange={(e) => setReleaseInfo({...releaseInfo, idNumber: e.target.value})} />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsReleaseDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleFinalizeRelease} disabled={loading}>
                    {loading ? <Loader2 className="animate-spin"/> : 'Confirm & Release Body'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
