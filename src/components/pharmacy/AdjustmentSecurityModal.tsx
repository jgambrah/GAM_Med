import React, { useState, useEffect } from 'react';
import { ShieldAlert, X, AlertTriangle, KeyRound, Send, CheckCircle2, BellRing, Loader2, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking, useDoc, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, doc } from 'firebase/firestore';

interface AdjustmentSecurityModalProps {
  drug: {
    id: string;
    name: string;
    batchNo?: string;
    batchNumber?: string;
    stockLevel: number;
    quantity?: number;
    price?: number;
    unitPrice?: number;
    hospitalId?: string;
  } | null;
  onClose: () => void;
  onSubmit: (payload: {
    drugId: string;
    newQuantity: number;
    reasonCode: string;
    notes: string;
    supervisorPin: string;
  }) => void;
}

export default function AdjustmentSecurityModal({ drug, onClose, onSubmit }: AdjustmentSecurityModalProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [pin, setPin] = useState('');
  const [reasonCode, setReasonCode] = useState('');
  const [adjustmentQty, setAdjustmentQty] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isRequestingRemote, setIsRequestingRemote] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);

  if (!drug) return null;

  const currentStock = drug.stockLevel ?? drug.quantity ?? 0;
  const displayBatch = drug.batchNo || drug.batchNumber || 'N/A';
  const hospitalId = drug.hospitalId || 'GAM-GAR-7578';

  // Real-time listener for supervisor PIN release
  const activeReqRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !activeRequestId) return null;
    return doc(firestore, `hospitals/${hospitalId}/approval_requests`, activeRequestId);
  }, [firestore, hospitalId, activeRequestId]);

  const { data: requestDocData } = useDoc(activeReqRef);

  useEffect(() => {
    if (requestDocData && requestDocData.status === 'APPROVED' && requestDocData.issuedPin) {
      setPin(requestDocData.issuedPin);
      toast({
        title: '🎉 Supervisor Approved & PIN Released!',
        description: `Pharmacy Director released 1-Time Security PIN [${requestDocData.issuedPin}]. You can now authorize the stock adjustment.`,
      });
    } else if (requestDocData && requestDocData.status === 'REJECTED') {
      setError('Supervisor rejected this stock adjustment request.');
      toast({
        variant: 'destructive',
        title: '❌ Remote Request Rejected',
        description: 'Pharmacy Director rejected this manual stock modification.',
      });
    }
  }, [requestDocData, toast]);

  const handleAuthorize = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Basic validation
    if (!reasonCode) return setError('You must select a mandatory reason code.');
    if (!adjustmentQty || isNaN(Number(adjustmentQty)) || Number(adjustmentQty) < 0) {
      return setError('Enter a valid non-negative adjustment quantity.');
    }
    if (notes.trim().length < 5) return setError('Audit Notes are mandatory (minimum 5 characters).');
    if (pin.length < 4) return setError('Enter a valid 4-digit Supervisor PIN.');

    // Execute submission
    onSubmit({
      drugId: drug.id,
      newQuantity: Number(adjustmentQty),
      reasonCode,
      notes,
      supervisorPin: pin,
    });
  };

  const handleRequestRemoteApproval = async () => {
    setError('');
    if (!reasonCode) return setError('Select a Reason Code before requesting remote approval.');
    if (!adjustmentQty || isNaN(Number(adjustmentQty)) || Number(adjustmentQty) < 0) {
      return setError('Enter the proposed adjustment quantity before requesting remote approval.');
    }
    if (notes.trim().length < 5) return setError('Enter Audit Notes before requesting remote approval.');

    setIsRequestingRemote(true);

    try {
      if (firestore && hospitalId) {
        const requestId = `REQ-${Date.now()}`;
        const requestDocRef = doc(firestore, `hospitals/${hospitalId}/approval_requests`, requestId);

        updateDocumentNonBlocking(requestDocRef, {
          id: requestId,
          type: 'STOCK_ADJUSTMENT_OVERRIDE',
          drugId: drug.id,
          drugName: drug.name,
          batchNo: displayBatch,
          currentStock,
          proposedStock: Number(adjustmentQty),
          variance: Number(adjustmentQty) - currentStock,
          reasonCode,
          notes,
          requestedBy: user?.displayName || user?.email || 'Shane Gambrah (Pharmacist)',
          requestedByUid: user?.uid || 'UNKNOWN_UID',
          status: 'PENDING_SUPERVISOR_PIN',
          timestamp: serverTimestamp(),
          createdDate: new Date().toISOString(),
        });

        setActiveRequestId(requestId);
      }

      toast({
        title: '📲 Remote Approval Request Dispatched!',
        description: `Notification sent to Pharmacy Director Queue. Waiting for supervisor to release 1-Time Security PIN...`,
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Request Failed',
        description: `Could not dispatch remote approval: ${err.message}`,
      });
    } finally {
      setIsRequestingRemote(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 dark:border-slate-800">
        
        {/* HEADER: Security Warning */}
        <div className="bg-red-50 dark:bg-red-950/50 px-6 py-4 border-b border-red-100 dark:border-red-900 flex items-center justify-between">
          <div className="flex items-center space-x-3 text-red-700 dark:text-red-400">
            <ShieldAlert size={24} />
            <h2 className="font-bold text-lg">Restricted Action</h2>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-red-400 hover:text-red-700 dark:hover:text-red-300 transition rounded-lg p-1"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleAuthorize} className="p-6 space-y-5">
          
          {/* DRUG CONTEXT */}
          <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <p className="text-[10px] text-gray-500 dark:text-slate-400 uppercase font-black tracking-wider mb-1">Target Item</p>
            <p className="font-bold text-gray-900 dark:text-slate-100 uppercase">{drug.name} • {displayBatch}</p>
            <p className="text-sm text-gray-600 dark:text-slate-400">Current Stock: <span className="font-bold text-emerald-600 dark:text-emerald-400">{currentStock} Units</span></p>
          </div>

          {/* ACTION DETAILS */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 uppercase">New Quantity *</label>
              <input 
                type="number" 
                min="0"
                value={adjustmentQty}
                onChange={(e) => setAdjustmentQty(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-950 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm font-mono font-bold dark:text-white"
                placeholder={`e.g., ${currentStock}`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 uppercase">Reason Code *</label>
              <select 
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-950 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-xs font-bold dark:text-white"
              >
                <option value="" disabled>Select...</option>
                <option value="SPILLAGE">Spillage / Damaged</option>
                <option value="EXPIRED">Expired Stock</option>
                <option value="COUNT_DISCREPANCY">Physical Count Discrepancy</option>
                <option value="RECALL">Manufacturer Recall</option>
              </select>
            </div>
          </div>

          {/* MANDATORY NOTES */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 uppercase">Audit Notes *</label>
            <textarea 
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-950 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-xs dark:text-white"
              placeholder="Explain the reason for this manual adjustment..."
              rows={2}
            />
          </div>

          {/* AUTHORIZATION PIN */}
          <div className="pt-4 border-t border-gray-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-900 dark:text-slate-200 flex items-center space-x-1.5 uppercase">
                <AlertTriangle size={15} className="text-amber-500"/>
                <span>Supervisor PIN Required</span>
              </label>

              {/* REMOTE APPROVAL REQUEST BUTTON */}
              <button
                type="button"
                onClick={handleRequestRemoteApproval}
                disabled={isRequestingRemote || !!activeRequestId}
                className="text-[10px] font-black uppercase text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 flex items-center gap-1 bg-cyan-500/10 px-2 py-1 rounded-lg border border-cyan-500/20 transition"
                title="Send alert notification to Pharmacy Manager dashboard"
              >
                {isRequestingRemote ? (
                  <>
                    <Loader2 size={12} className="animate-spin text-cyan-500" />
                    <span>Dispatching Alert...</span>
                  </>
                ) : activeRequestId ? (
                  <>
                    <Clock size={12} className="text-amber-500 animate-spin" />
                    <span>Waiting for Manager Release...</span>
                  </>
                ) : (
                  <>
                    <BellRing size={12} className="text-cyan-500 animate-pulse" />
                    <span>Request Remote PIN</span>
                  </>
                )}
              </button>
            </div>

            <input 
              type="password" 
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full px-3 py-3 border-2 border-gray-300 dark:border-slate-700 dark:bg-slate-950 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-center tracking-[1em] text-lg font-bold dark:text-white font-mono"
              placeholder="••••"
            />
            <p className="text-[9px] text-muted-foreground text-center font-medium">
              Pharmacy Manager PIN (Default: <span className="font-bold font-mono text-foreground">1234</span>)
            </p>
          </div>

          {error && <p className="text-red-600 dark:text-red-400 text-xs font-bold text-center">{error}</p>}

          <button 
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl shadow-md transition text-xs uppercase tracking-wider flex items-center justify-center gap-2"
          >
            AUTHORIZE & ADJUST STOCK
          </button>
        </form>
      </div>
    </div>
  );
}
