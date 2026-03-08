'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, serverTimestamp } from 'firebase/firestore';
import { ShieldAlert, Search, Camera, CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function AssetPhysicalVerification() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'AUDITOR'].includes(userProfile?.role || '');

  const assetsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/assets`));
  }, [firestore, hospitalId]);
  const { data: assets, isLoading: areAssetsLoading } = useCollection(assetsQuery);

  const flagAsset = async (assetId: string, reason: string) => {
    if (!firestore || !user || !hospitalId) return;
    try {
      const assetRef = doc(firestore, `hospitals/${hospitalId}/assets`, assetId);
      updateDocumentNonBlocking(assetRef, {
        auditStatus: 'QUERIED',
        auditComment: reason,
        lastVerifiedAt: serverTimestamp(),
        verifiedBy: user.uid
      });
      toast({
        variant: 'destructive',
        title: "Asset Query Logged",
        description: `Query for asset ${assetId} has been logged for accountant action.`
      });
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Error flagging asset", description: e.message });
    }
  };
  
  const verifyAsset = async (assetId: string) => {
     if (!firestore || !user || !hospitalId) return;
    try {
      const assetRef = doc(firestore, `hospitals/${hospitalId}/assets`, assetId);
      updateDocumentNonBlocking(assetRef, {
        auditStatus: 'VERIFIED',
        auditComment: 'Physically verified by auditor.',
        lastVerifiedAt: serverTimestamp(),
        verifiedBy: user.uid
      });
      toast({
        title: "Asset Verified",
        description: `Asset ${assetId} has been marked as physically verified.`
      });
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Error verifying asset", description: e.message });
    }
  }

  const isLoading = isUserLoading || isProfileLoading || areAssetsLoading;
  
  if (isLoading) {
    return <div className="p-20 text-center font-black animate-pulse"><Loader2 className="mx-auto animate-spin" /> Verifying Credentials...</div>;
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
    <div className="p-8 space-y-8 max-w-7xl mx-auto text-black font-bold">
      <div className="flex justify-between items-end border-b-8 border-slate-900 pb-6">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic">Physical <span className="text-red-600">Verification</span></h1>
          <p className="text-slate-500 font-bold text-xs uppercase italic">Auditor's Existence & Condition Inspection Log.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading && <p>Loading Assets...</p>}
        {assets?.map(asset => (
          <div key={asset.id} className={`p-8 rounded-[40px] border-4 transition-all flex flex-col md:flex-row justify-between items-center gap-6 ${
            asset.auditStatus === 'QUERIED' ? 'border-red-600 bg-red-50' : 'border-slate-100 bg-white'
          }`}>
             <div className="flex items-center gap-6">
                <div className={`p-4 rounded-3xl ${asset.auditStatus === 'QUERIED' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'}`}>
                   <ShieldAlert size={28}/>
                </div>
                <div>
                   <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Tag ID: {asset.tagId}</p>
                   <h3 className="text-xl font-black uppercase text-black">{asset.name}</h3>
                   <p className="text-xs text-slate-400 italic uppercase">{asset.category} / {asset.subDivision || 'GENERAL'}</p>
                </div>
             </div>

             <div className="flex gap-3">
                {asset.auditStatus !== 'QUERIED' ? (
                  <>
                    <button 
                      onClick={() => {
                        const reason = prompt("Enter Discrepancy (e.g., Tag ID Mismatch, Item Missing, Damaged):");
                        if (reason) flagAsset(asset.id, reason);
                      }}
                      className="bg-red-50 text-red-600 px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2 border-red-200 hover:bg-red-600 hover:text-white transition-all"
                    >
                       Flag Discrepancy
                    </button>
                    <button onClick={() => verifyAsset(asset.id)} className="bg-green-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg">
                       Verify Existence
                    </button>
                  </>
                ) : (
                  <div className="text-right">
                     <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Audit Query Active</p>
                     <p className="text-xs italic text-red-800">"{asset.auditComment}"</p>
                  </div>
                )}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
