'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, Activity, CheckCircle, Clock, Truck, 
  AlertCircle, Package, ShieldCheck, ChevronRight, Check, X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

// Initial Mock Data for Inpatient Ward Requests
const INITIAL_WARD_REQUESTS = [
  {
    id: 'WRD-ICU-104',
    ward: 'Intensive Care Unit (ICU)',
    urgency: 'STAT',
    time: '10 mins ago',
    itemsCount: 4,
    itemsList: [
      { name: 'EPINEPHRINE 1MG/ML INJ', qty: 10, sku: 'INJ-EPI-101' },
      { name: 'SODIUM CHLORIDE 0.9% 500ML', qty: 20, sku: 'IVF-NS-500' },
      { name: 'PROPOFOL 10MG/ML 20ML', qty: 5, sku: 'ANAE-PROP-20' },
      { name: 'FENTANYL 50MCG/ML 2ML', qty: 10, sku: 'INJ-FEN-050' }
    ],
    status: 'PENDING',
    requestedBy: 'Sister Mercy Addo (ICU Lead)'
  },
  {
    id: 'WRD-MAT-088',
    ward: 'Maternity Ward & Delivery Suite',
    urgency: 'ROUTINE',
    time: '2 hours ago',
    itemsCount: 12,
    itemsList: [
      { name: 'OXYTOCIN 10IU/ML INJ', qty: 50, sku: 'INJ-OXY-010' },
      { name: 'MISOPROSTOL 200MCG TAB', qty: 30, sku: 'TAB-MSO-200' },
      { name: 'TRANEXAMIC ACID 500MG INJ', qty: 15, sku: 'INJ-TXA-500' }
    ],
    status: 'IN_TRANSIT',
    requestedBy: 'Midwife Hannah Baidoo'
  },
  {
    id: 'WRD-GEN-042',
    ward: 'Male Surgical Ward (Gen Wing B)',
    urgency: 'ROUTINE',
    time: '4 hours ago',
    itemsCount: 8,
    itemsList: [
      { name: 'CEFTRIAXONE 1G INJ', qty: 40, sku: 'INJ-CEF-100' },
      { name: 'METRONIDAZOLE 500MG IV 100ML', qty: 25, sku: 'IVF-MET-500' },
      { name: 'DICLOFENAC SODIUM 75MG INJ', qty: 30, sku: 'INJ-DIC-075' }
    ],
    status: 'COMPLETED',
    requestedBy: 'Nurse In-Charge Mensah'
  }
];

export default function WardFulfillmentPage() {
  const { toast } = useToast();
  const [requests, setRequests] = useState(INITIAL_WARD_REQUESTS);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'IN_TRANSIT' | 'COMPLETED'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);

  // Active STAT Orders Count
  const statCount = useMemo(() => {
    return requests.filter(r => r.urgency === 'STAT' && r.status === 'PENDING').length;
  }, [requests]);

  // Tab Counts
  const pendingCount = useMemo(() => requests.filter(r => r.status === 'PENDING').length, [requests]);
  const transitCount = useMemo(() => requests.filter(r => r.status === 'IN_TRANSIT').length, [requests]);
  const completedCount = useMemo(() => requests.filter(r => r.status === 'COMPLETED').length, [requests]);

  // Filtered Requests
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const matchesTab = 
        activeTab === 'PENDING' ? req.status === 'PENDING' :
        activeTab === 'IN_TRANSIT' ? req.status === 'IN_TRANSIT' :
        req.status === 'COMPLETED';

      if (!matchesTab) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        req.id.toLowerCase().includes(q) ||
        req.ward.toLowerCase().includes(q) ||
        req.requestedBy.toLowerCase().includes(q) ||
        req.itemsList.some(item => item.name.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q))
      );
    });
  }, [requests, activeTab, searchQuery]);

  // Action: Fulfill & Dispatch Ward Request
  const handleDispatchOrder = (requestId: string) => {
    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'IN_TRANSIT' } : r));
    toast({ 
      title: "Ward Order Dispatched", 
      description: `Request #${requestId} has been packed and sent IN TRANSIT to the ward.` 
    });
    setSelectedRequest(null);
  };

  // Action: Confirm Delivery (Mark Completed)
  const handleCompleteDelivery = (requestId: string) => {
    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'COMPLETED' } : r));
    toast({ 
      title: "Delivery Confirmed", 
      description: `Request #${requestId} marked as COMPLETED by Ward Staff.` 
    });
    setSelectedRequest(null);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 md:p-0 pb-12">
      
      {/* 1. DARK HERO COMMAND CENTER */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 shadow-md space-y-6 relative overflow-hidden">
        
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

        {/* Header & Metrics */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white uppercase italic flex items-center gap-2">
              <Activity className="w-6 h-6 text-teal-400" />
              WARD FULFILLMENT
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-widest">
              Inpatient bulk requests and scheduled medication rounds
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-right min-w-[150px]">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Active STAT Orders
              </span>
              <span className="text-2xl font-black text-rose-500">{statCount}</span>
            </div>
          </div>
        </div>

        {/* Global Search Input */}
        <div className="relative z-10">
          <Search className="absolute left-4 top-3 text-slate-500 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by Ward Name, Request ID, or required medications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 text-sm bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:ring-2 focus:ring-teal-500 outline-none transition placeholder:text-slate-600"
          />
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-4 pt-4 border-t border-slate-800 relative z-10 overflow-x-auto">
          <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800 whitespace-nowrap">
            <button 
              onClick={() => setActiveTab('PENDING')}
              className={`px-4 py-2 text-xs font-bold rounded-md transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'PENDING' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-4 h-4" /> PENDING REQUESTS ({pendingCount})
            </button>
            <button 
              onClick={() => setActiveTab('IN_TRANSIT')}
              className={`px-4 py-2 text-xs font-bold rounded-md transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'IN_TRANSIT' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Truck className="w-4 h-4" /> IN TRANSIT ({transitCount})
            </button>
            <button 
              onClick={() => setActiveTab('COMPLETED')}
              className={`px-4 py-2 text-xs font-bold rounded-md transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'COMPLETED' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckCircle className="w-4 h-4" /> COMPLETED ({completedCount})
            </button>
          </div>
        </div>
      </div>

      {/* 2. THE WARD REQUEST CARDS OR EMPTY STATE */}
      {filteredRequests.length === 0 ? (
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-16 text-center space-y-3">
          <ShieldCheck className="w-12 h-12 text-teal-500 mx-auto opacity-80" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
            No Ward Requests Found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {searchQuery ? `No requests matching "${searchQuery}".` : `There are currently no ${activeTab.toLowerCase().replace('_', ' ')} ward fulfillment orders.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRequests.map((req) => (
            <div key={req.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:border-teal-400 transition flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">#{req.id}</span>
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide mt-0.5">{req.ward}</h3>
                    <p className="text-[10px] text-slate-500 font-medium">{req.requestedBy}</p>
                  </div>
                  {req.urgency === 'STAT' ? (
                    <span className="px-2.5 py-1 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 text-[10px] font-black rounded-md flex items-center gap-1 animate-pulse">
                      <AlertCircle className="w-3 h-3" /> STAT / URGENT
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-bold rounded-md">
                      ROUTINE
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400 mb-4">
                  <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-400" /> {req.time}</span>
                  <span className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5 text-slate-400" /> {req.itemsCount} Items Requested</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                {req.status === 'PENDING' && (
                  <button 
                    onClick={() => setSelectedRequest(req)}
                    className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
                  >
                    Review & Fulfill Ward Order
                  </button>
                )}

                {req.status === 'IN_TRANSIT' && (
                  <button 
                    onClick={() => handleCompleteDelivery(req.id)}
                    className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Truck className="w-4 h-4" /> Confirm Ward Receipt Delivery
                  </button>
                )}

                {req.status === 'COMPLETED' && (
                  <div className="py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 text-xs font-bold rounded-xl text-center flex items-center justify-center gap-1.5">
                    <CheckCircle className="w-4 h-4" /> Fulfilled & Verified
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. FULFILLMENT MODAL */}
      {selectedRequest && (
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-base font-black uppercase tracking-tight flex items-center justify-between">
                <span>Fulfill Ward Order #{selectedRequest.id}</span>
                {selectedRequest.urgency === 'STAT' && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded-md">
                    STAT
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between">
                <div>
                  <span className="text-slate-400 block font-medium">Destination Ward</span>
                  <strong className="text-slate-800 dark:text-slate-100 text-sm">{selectedRequest.ward}</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block font-medium">Requested By</span>
                  <strong className="text-slate-800 dark:text-slate-100">{selectedRequest.requestedBy}</strong>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-500 uppercase text-[10px] mb-2 tracking-wider">Item Pick List ({selectedRequest.itemsList.length} SKUs)</h4>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedRequest.itemsList.map((item: any, i: number) => (
                    <div key={i} className="p-3 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-100">{item.name}</div>
                        <div className="text-[10px] font-mono text-teal-600 dark:text-teal-400">{item.sku}</div>
                      </div>
                      <div className="font-black text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
                        {item.qty} units
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                Cancel
              </Button>
              <Button 
                onClick={() => handleDispatchOrder(selectedRequest.id)}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold"
              >
                Pack & Dispatch to Ward
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
