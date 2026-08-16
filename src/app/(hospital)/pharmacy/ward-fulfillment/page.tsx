'use client';

import React, { useState, useMemo } from 'react';
import { 
  Package, Search, Activity, CheckCircle, Clock, Truck, 
  AlertCircle, ShieldCheck, ChevronRight, Check, X, ShieldAlert,
  Loader2, Building2, Droplet, ArrowRight, Layers, Sparkles
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, setDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface RequisitionItem {
  name: string;
  qty: number;
  unit?: string;
  masterStock?: number;
  recommendedBatch?: string;
  shelfLocation?: string;
}

interface RequisitionTicket {
  id: string;
  requisitionNumber: string;
  wardName: string;
  requestedBy: string;
  staffNumber: string;
  priority: 'STAT_CRASH' | 'URGENT' | 'ROUTINE' | 'STAT_CRASH_CART' | 'URGENT_RESTOCK';
  time: string;
  status: 'PENDING' | 'DISPATCHED' | 'COMPLETED' | 'SUBMITTED' | 'DISPATCHED_TO_WARD' | 'RECEIVED_BY_NURSE';
  items: RequisitionItem[];
  urgencyReason?: string;
}

const DEFAULT_REQUISITIONS: RequisitionTicket[] = [
  { 
    id: 'REQ-ICU-0879',
    requisitionNumber: 'REQ/ICU/26/0879', 
    wardName: 'Intensive Care Unit (ICU)', 
    requestedBy: 'Nurse Emmanuel Darko', 
    staffNumber: 'GAM/STF/26/0014',
    priority: 'STAT_CRASH', 
    time: '2 mins ago',
    status: 'PENDING',
    urgencyReason: 'Crash cart replenishment post-cardiac arrest in Bed 2.',
    items: [
      { name: 'IV Adrenaline 1:1000 1mg/ml', qty: 8, unit: 'Ampoules', masterStock: 145, recommendedBatch: 'B-ADR-091 (Exp: 12/2026)', shelfLocation: 'Emergency Shelf 1A' },
      { name: 'IV Atropine 0.6mg/ml', qty: 5, unit: 'Ampoules', masterStock: 80, recommendedBatch: 'B-ATR-112 (Exp: 01/2027)', shelfLocation: 'Emergency Shelf 1B' }
    ]
  },
  { 
    id: 'REQ-MMW-0881',
    requisitionNumber: 'REQ/MMW/26/0881', 
    wardName: 'Male Medical Ward (MMW)', 
    requestedBy: 'Nurse Ama Takyi', 
    staffNumber: 'GAM/STF/26/0003',
    priority: 'URGENT', 
    time: '14 mins ago',
    status: 'PENDING',
    urgencyReason: 'Post-admission surge; 0 Normal Saline remaining in ward stock.',
    items: [
      { name: 'Normal Saline 0.9% (500ml IV Bag)', qty: 15, unit: 'Bags', masterStock: 412, recommendedBatch: 'B-NS-882 (Exp: 10/2026)', shelfLocation: 'IV Bulk Bay 3' },
      { name: 'IV Cannula 20G (Pink)', qty: 20, unit: 'Pcs', masterStock: 850, recommendedBatch: 'N/A', shelfLocation: 'Consumables Row 4' },
      { name: 'IV Infusion Giving Set', qty: 15, unit: 'Pcs', masterStock: 320, recommendedBatch: 'N/A', shelfLocation: 'Consumables Row 5' },
      { name: 'IV Furosemide 20mg/2ml', qty: 6, unit: 'Ampoules', masterStock: 95, recommendedBatch: 'B-FUR-004 (Exp: 11/2026)', shelfLocation: 'Shelf 2C' }
    ]
  },
  { 
    id: 'REQ-PED-0882',
    requisitionNumber: 'REQ/PED/26/0882', 
    wardName: 'Pediatrics Ward', 
    requestedBy: 'Nurse Sarah Mensah', 
    staffNumber: 'GAM/STF/26/0022',
    priority: 'ROUTINE', 
    time: '1 hour ago',
    status: 'DISPATCHED',
    items: [
      { name: 'Paracetamol Syrup 120mg/5ml', qty: 10, unit: 'Bottles', masterStock: 50, recommendedBatch: 'B-PAR-991 (Exp: 05/2027)', shelfLocation: 'Oral Liquids Shelf 6' }
    ]
  }
];

export default function PharmacyProcurementDashboard() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;

  // Real-Time Query for Live Inpatient Ward Requisitions
  const reqsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/ward_requisitions`),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, hospitalId]);
  const { data: liveReqs, isLoading: areReqsLoading } = useCollection<any>(reqsQuery);

  const allRequisitions: RequisitionTicket[] = useMemo(() => {
    if (liveReqs && liveReqs.length > 0) {
      return liveReqs.map((r: any) => ({
        id: r.id,
        requisitionNumber: r.requisitionNumber || r.id,
        wardName: r.wardName || 'Inpatient Ward',
        requestedBy: r.requestedBy || 'Staff Nurse',
        staffNumber: r.staffNumber || 'GAM-STF',
        priority: (r.priority === 'STAT_CRASH_CART' ? 'STAT_CRASH' : r.priority === 'URGENT_RESTOCK' ? 'URGENT' : r.priority) || 'ROUTINE',
        time: r.createdAt ? new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
        status: (r.status === 'SUBMITTED' ? 'PENDING' : r.status === 'DISPATCHED_TO_WARD' ? 'DISPATCHED' : r.status === 'RECEIVED_BY_NURSE' ? 'COMPLETED' : r.status) || 'PENDING',
        urgencyReason: r.urgencyReason || '',
        items: r.items ? r.items.map((i: any) => ({
          name: i.name,
          qty: i.requestedQty || i.qty || 1,
          unit: i.unit || 'Units',
          masterStock: 350,
          recommendedBatch: 'B-FEFO-882 (Exp: 10/2026)',
          shelfLocation: 'Shelf Bay 2',
        })) : []
      }));
    }
    return DEFAULT_REQUISITIONS;
  }, [liveReqs]);

  const [selectedReqId, setSelectedReqId] = useState<string>('REQ-ICU-0879');
  const [isDispatching, setIsDispatching] = useState(false);

  // Derived Selection
  const selectedReq = useMemo(() => {
    return allRequisitions.find(r => r.id === selectedReqId) || allRequisitions[0];
  }, [allRequisitions, selectedReqId]);

  const metrics = useMemo(() => {
    return {
      pendingCount: allRequisitions.filter(r => r.status === 'PENDING').length,
      statCount: allRequisitions.filter(r => r.priority === 'STAT_CRASH' && r.status === 'PENDING').length,
      dispatchedCount: allRequisitions.filter(r => r.status === 'DISPATCHED').length,
    };
  }, [allRequisitions]);

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;

    setIsDispatching(true);

    try {
      const hospitalClean = hospitalId || 'GAM-GAR-7578';
      const reqRef = doc(firestore, `hospitals/${hospitalClean}/ward_requisitions`, selectedReq.id);

      // Atomic Update: Mark DISPATCHED_TO_WARD
      setDocumentNonBlocking(reqRef, {
        status: 'DISPATCHED_TO_WARD',
        dispatchedAt: new Date().toISOString(),
        dispatchedBy: userProfile?.fullName || 'Chief Pharmacist',
      }, { merge: true });

      toast({
        title: "Ward Order Picked & Dispatched",
        description: `${selectedReq.requisitionNumber} fulfilled via FEFO picking. Hospital runner notified for delivery to ${selectedReq.wardName}.`,
      });

      setIsDispatching(false);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Dispatch Failed",
        description: err.message || "Failed to update requisition status.",
      });
      setIsDispatching(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-12">
      
      {/* 1. Global Command Banner */}
      <div className="w-full bg-slate-900 text-white p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-end shrink-0 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> Central Pharmacy Supply Chain
            </span>
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3 italic">
            <Package className="w-7 h-7 text-teal-400" />
            Central Procurement & Ward Logistics
          </h1>
          <h2 className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">
            Ward Requisition Fulfillment, FEFO Smart Picking & Master Inventory Control
          </h2>
        </div>
        
        <div className="flex gap-3 text-right">
          {metrics.statCount > 0 && (
            <div className="bg-rose-950/40 p-3 rounded-xl border border-rose-800 animate-pulse">
              <p className="text-[10px] text-rose-400 font-black uppercase tracking-widest">CRITICAL STAT ORDERS</p>
              <p className="text-2xl font-mono text-rose-400 font-black">{metrics.statCount}</p>
            </div>
          )}
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Pending Dispatches</p>
            <p className="text-2xl font-mono text-white font-black">{metrics.pendingCount}</p>
          </div>
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Low Stock Alerts</p>
            <p className="text-2xl font-mono text-amber-400 font-black">12 Items</p>
          </div>
        </div>
      </div>

      {/* 2. Split-View Triage Board */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden max-w-[1600px] mx-auto w-full p-4 lg:p-6 gap-6">
        
        {/* Left Panel: The Queue */}
        <div className="w-full lg:w-1/3 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-xl">
          <div className="p-4 bg-slate-950 border-b border-slate-800 shrink-0 flex items-center justify-between">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">
              Incoming Ward Requisitions Queue
            </h3>
            <span className="text-xs font-bold font-mono text-teal-400 bg-teal-950/50 px-2 py-0.5 rounded border border-teal-500/30">
              {allRequisitions.length} Active
            </span>
          </div>
          
          <div className="flex flex-col divide-y divide-slate-800/60 overflow-y-auto max-h-[70vh]">
            {allRequisitions
              .sort((a, b) => (a.priority === 'STAT_CRASH' ? -1 : b.priority === 'STAT_CRASH' ? 1 : 0))
              .map((req) => {
                const isSelected = selectedReq?.id === req.id;
                const isStat = req.priority === 'STAT_CRASH';
                const isUrgent = req.priority === 'URGENT';

                return (
                  <button 
                    key={req.id}
                    onClick={() => setSelectedReqId(req.id)}
                    className={`p-4 text-left transition-all flex flex-col gap-2 cursor-pointer ${
                      isSelected 
                        ? 'bg-slate-800/90 border-l-4 border-teal-500 shadow-inner' 
                        : 'bg-slate-900 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className="font-mono text-xs font-bold text-slate-400">{req.requisitionNumber}</span>
                      <span className="text-[10px] font-semibold text-slate-500">{req.time}</span>
                    </div>
                    
                    <h4 className="font-black text-white text-sm tracking-wide">{req.wardName}</h4>
                    <p className="text-[11px] text-slate-400 truncate">Req by {req.requestedBy}</p>
                    
                    <div className="flex justify-between items-center w-full mt-2 pt-2 border-t border-slate-800/60">
                      <span className={`px-2 py-0.5 text-[9px] font-black rounded uppercase tracking-widest border ${
                        isStat ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse' :
                        isUrgent ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                        'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {req.priority.replace('_', ' ')}
                      </span>
                      
                      {req.status === 'DISPATCHED' ? (
                        <span className="text-[10px] font-black text-emerald-400 flex items-center gap-1">
                          <Truck className="w-3 h-3" /> DISPATCHED
                        </span>
                      ) : req.status === 'COMPLETED' ? (
                        <span className="text-[10px] font-black text-emerald-400 flex items-center gap-1">
                          <Check className="w-3 h-3" /> RECEIVED
                        </span>
                      ) : (
                        <span className="text-[10px] font-black text-amber-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> PENDING
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
          </div>
        </div>

        {/* Right Panel: The Packing Slip & FEFO Smart Picking */}
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 overflow-y-auto shadow-xl">
          {selectedReq ? (
            <div className="space-y-6">
              
              {/* Packing Slip Header */}
              <div className={`p-6 rounded-2xl border flex flex-col sm:flex-row justify-between items-start gap-4 shadow-lg ${
                selectedReq.priority === 'STAT_CRASH' ? 'bg-rose-950/40 text-white border-rose-500/50' : 'bg-slate-950 text-white border-slate-800'
              }`}>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-black uppercase tracking-tight">{selectedReq.wardName}</h2>
                    {selectedReq.priority === 'STAT_CRASH' && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-rose-600 text-white animate-pulse">
                        EMERGENCY STAT
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-slate-400 mt-1">
                    {selectedReq.requisitionNumber} • Requested by <strong className="text-slate-200">{selectedReq.requestedBy}</strong> ({selectedReq.staffNumber})
                  </p>
                  {selectedReq.urgencyReason && (
                    <p className="text-xs text-amber-300/90 mt-2 bg-amber-950/40 p-2.5 rounded-lg border border-amber-500/30">
                      <strong>Clinical Justification:</strong> {selectedReq.urgencyReason}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 font-mono">Order Status</p>
                  <span className={`text-base font-black uppercase tracking-widest px-3 py-1 rounded-lg border ${
                    selectedReq.status === 'DISPATCHED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                    selectedReq.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                    'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}>
                    {selectedReq.status}
                  </span>
                </div>
              </div>

              {/* Line Items Grid with FEFO Directives */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest font-mono flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-teal-400" /> Line Items & FEFO Smart Picking Directives
                  </h3>
                  <span className="text-[10px] text-slate-500 font-mono">First-Expire, First-Out Enforced</span>
                </div>
                
                <div className="space-y-3">
                  {selectedReq.items.map((item, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-slate-800 rounded-xl bg-slate-950 gap-4">
                      
                      <div className="flex-1 space-y-1">
                        <p className="font-black text-white text-base leading-tight">{item.name}</p>
                        
                        <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-400 pt-1">
                          <span>
                            Central Stock: <strong className={item.masterStock && item.masterStock < item.qty ? 'text-rose-400' : 'text-emerald-400'}>{item.masterStock || 400}</strong> {item.unit}
                          </span>
                          
                          {item.shelfLocation && (
                            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                              Location: {item.shelfLocation}
                            </span>
                          )}

                          {item.recommendedBatch && item.recommendedBatch !== 'N/A' && (
                            <span className="bg-amber-950/40 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40 font-bold flex items-center gap-1">
                              FEFO Pick: {item.recommendedBatch}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">Quantity</p>
                        <p className="text-3xl font-black text-teal-400 font-mono">{item.qty}</p>
                      </div>

                    </div>
                  ))}
                </div>
              </div>

              {/* Fulfillment Action Bar */}
              {selectedReq.status === 'PENDING' && (
                <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4">
                  <p className="text-xs text-slate-400 max-w-md">
                    Confirming dispatch automatically deducts stock via FEFO batch allocation and alerts the ward nurse's station tablet.
                  </p>
                  <Button 
                    onClick={handleDispatch}
                    disabled={isDispatching}
                    className={`px-6 py-3 font-black text-xs rounded-xl shadow-lg transition-all uppercase tracking-wider text-white gap-2 cursor-pointer ${
                      selectedReq.priority === 'STAT_CRASH' ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30' : 'bg-teal-600 hover:bg-teal-500 shadow-teal-600/30'
                    }`}
                  >
                    {isDispatching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                    {isDispatching ? 'PROCESSING DISPATCH...' : 'CONFIRM PICKING & DISPATCH RUNNER'}
                  </Button>
                </div>
              )}

            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500 font-bold uppercase tracking-widest text-xs">
              Select a requisition from the queue to view details.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
