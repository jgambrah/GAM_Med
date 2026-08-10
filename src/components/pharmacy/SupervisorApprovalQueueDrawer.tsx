'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldAlert, CheckCircle2, XCircle, Clock, KeyRound, User, AlertTriangle } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, limit, doc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface SupervisorApprovalQueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  hospitalId: string;
}

export function SupervisorApprovalQueueDrawer({ isOpen, onClose, hospitalId }: SupervisorApprovalQueueDrawerProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const requestsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, 'hospitals', hospitalId, 'approval_requests'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
  }, [firestore, hospitalId]);

  const { data: requests, isLoading } = useCollection(requestsQuery);

  const handleApproveRequest = (requestItem: any) => {
    if (!firestore || !hospitalId) return;

    // Generate random secure 4-digit One-Time Security Override PIN (e.g. 5819)
    const generatedPin = Math.floor(1000 + Math.random() * 9000).toString();
    const reqRef = doc(firestore, `hospitals/${hospitalId}/approval_requests`, requestItem.id);

    updateDocumentNonBlocking(reqRef, {
      status: 'APPROVED',
      issuedPin: generatedPin,
      approvedBy: 'Dr. James Gambrah (Pharmacy Director)',
      approvedTimestamp: serverTimestamp(),
    });

    toast({
      title: '✅ Supervisor Override PIN Issued',
      description: `Issued One-Time Security PIN [${generatedPin}] to ${requestItem.requestedBy} for ${requestItem.drugName}.`,
    });
  };

  const handleRejectRequest = (requestItem: any) => {
    if (!firestore || !hospitalId) return;

    const reqRef = doc(firestore, `hospitals/${hospitalId}/approval_requests`, requestItem.id);

    updateDocumentNonBlocking(reqRef, {
      status: 'REJECTED',
      rejectedBy: 'Dr. James Gambrah (Pharmacy Director)',
      rejectedTimestamp: serverTimestamp(),
    });

    toast({
      variant: 'destructive',
      title: '❌ Adjustment Request Rejected',
      description: `Rejected stock adjustment for ${requestItem.drugName}.`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-6 rounded-3xl">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black">
              <KeyRound size={24} />
            </div>
            <div>
              <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                <span>Supervisor Override Authorization Queue</span>
              </DialogTitle>
              <DialogDescription className="text-xs font-bold text-muted-foreground uppercase">
                Review pending staff stock adjustment requests & issue One-Time Security PINs
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {isLoading ? (
            <p className="text-center text-xs font-bold text-muted-foreground py-8">Loading approval queue...</p>
          ) : !requests || requests.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <CheckCircle2 size={40} className="mx-auto text-emerald-500 opacity-80" />
              <p className="text-sm font-bold text-foreground">No Pending Authorization Requests</p>
              <p className="text-xs text-muted-foreground">All pharmacy adjustment requests have been processed.</p>
            </div>
          ) : (
            requests.map((req: any) => {
              const isPending = req.status === 'PENDING_SUPERVISOR_PIN';
              const isApproved = req.status === 'APPROVED';
              const isRejected = req.status === 'REJECTED';

              return (
                <div key={req.id} className="p-4 rounded-2xl border bg-card space-y-3 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm uppercase text-foreground">{req.drugName}</span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-muted">
                          {req.batchNo || 'BT-2025-A12'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground font-medium flex items-center gap-1 mt-0.5">
                        <User size={12} /> Requested by: <span className="font-bold text-foreground">{req.requestedBy}</span>
                      </p>
                    </div>

                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                      isPending ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse' :
                      isApproved ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                      'bg-red-500/10 text-red-600 border-red-500/20'
                    }`}>
                      {req.status}
                    </span>
                  </div>

                  {/* VARIANCE & REASON GRID */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-900 text-white rounded-xl text-xs">
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Current Stock</p>
                      <p className="font-mono font-bold text-white">{req.currentStock} Units</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Proposed Stock</p>
                      <p className="font-mono font-bold text-emerald-400">{req.proposedStock} Units</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Variance</p>
                      <p className={`font-mono font-black ${req.variance < 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {req.variance > 0 ? `+${req.variance}` : req.variance}
                      </p>
                    </div>
                  </div>

                  <div className="text-xs space-y-1">
                    <p className="font-bold uppercase text-destructive text-[10px]">Reason: {req.reasonCode}</p>
                    <p className="text-muted-foreground italic bg-muted/40 p-2 rounded-lg text-xs">
                      "{req.notes}"
                    </p>
                  </div>

                  {/* ACTIONS BAR */}
                  {isPending && (
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        type="button"
                        onClick={() => handleApproveRequest(req)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase rounded-xl py-2"
                      >
                        <CheckCircle2 size={14} className="mr-1.5" /> Approve & Release PIN
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleRejectRequest(req)}
                        className="text-destructive border-destructive/30 hover:bg-destructive/10 font-bold text-xs uppercase rounded-xl py-2"
                      >
                        <XCircle size={14} className="mr-1.5" /> Reject
                      </Button>
                    </div>
                  )}

                  {isApproved && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-700 dark:text-emerald-300">
                        ✅ Released PIN Code: <span className="font-mono font-black tracking-widest text-base ml-1">{req.issuedPin}</span>
                      </span>
                      <span className="text-[10px] text-muted-foreground">{req.approvedBy}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
