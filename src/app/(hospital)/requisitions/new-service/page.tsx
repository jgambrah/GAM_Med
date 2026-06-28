'use client';
import { useState } from 'react';
import { useUser, useFirestore, useMemoFirebase, addDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, serverTimestamp, doc } from 'firebase/firestore';
import { Wrench, Send, ClipboardList, Loader2, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function NewServiceRequisition() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'NURSE', 'DOCTOR', 'PHARMACIST', 'STORE_MANAGER'].includes(userRole || '');
  
  const [form, setForm] = useState({
    description: '',
    justification: '',
    priority: 'NORMAL' // NORMAL, URGENT, EMERGENCY
  });

  interface ServiceItem {
    id: string;
    serviceTitle: string;
    estimatedCost: number;
    description: string;
  }

  const [items, setItems] = useState<ServiceItem[]>([]);
  const [tempItem, setTempItem] = useState({
    serviceTitle: '',
    estimatedCost: 0,
    description: ''
  });

  const handleAddItem = () => {
    if (!tempItem.serviceTitle.trim()) {
      toast({ variant: 'destructive', title: "Please enter a service title." });
      return;
    }
    if (tempItem.estimatedCost <= 0) {
      toast({ variant: 'destructive', title: "Please enter a valid estimated budget." });
      return;
    }

    setItems([...items, {
      id: Math.random().toString(36).substring(7),
      serviceTitle: tempItem.serviceTitle.trim(),
      estimatedCost: tempItem.estimatedCost,
      description: tempItem.description.trim()
    }]);

    setTempItem({
      serviceTitle: '',
      estimatedCost: 0,
      description: ''
    });
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile || !firestore || !hospitalId) return;
    if (items.length === 0) {
      toast({ variant: 'destructive', title: "Please add at least one service item to your requisition." });
      return;
    }
    setLoading(true);

    try {
      const rfsNumber = `RFS-${hospitalId.slice(-4)}-${Math.floor(1000 + Math.random() * 9000)}`;
      const totalCost = items.reduce((sum, item) => sum + item.estimatedCost, 0);
      const representativeTitle = items[0].serviceTitle + (items.length > 1 ? ` (+ ${items.length - 1} more services)` : '');
      
      await addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/service_requisitions`), {
        ...form,
        items,
        rfsNumber,
        serviceTitle: representativeTitle, // Backwards compatibility
        estimatedCost: totalCost,          // Backwards compatibility
        hospitalId: hospitalId,
        requestingDept: userProfile.department || 'GENERAL',
        requestedBy: user.uid,
        requestedByName: userProfile.fullName,
        status: 'PENDING_APPROVAL', // PENDING -> APPROVED -> CONVERTED_TO_PO
        createdAt: serverTimestamp()
      });

      toast({ title: "Service Requisition Transmitted to Director" });
      setItems([]);
      setForm({ description: '', justification: '', priority: 'NORMAL' });
    } catch (e: any) { 
      toast({ variant: 'destructive', title: e.message }); 
    }
    setLoading(false);
  };

  const pageLoading = isUserLoading || isProfileLoading;
  if (pageLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-4 text-black font-bold">
        <div className="text-center">
          <Loader2 className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You are not authorized to create requisitions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 text-black font-bold">
      <h1 className="text-3xl font-black uppercase tracking-tighter italic">Requisition <span className="text-blue-600">for Service</span></h1>
      
      <form onSubmit={handleSendRequest} className="bg-white p-10 rounded-[40px] border-4 border-slate-900 shadow-2xl space-y-6">
        <div className="flex items-center gap-3 text-blue-600 border-b pb-4">
           <ClipboardList size={24} />
           <h3 className="text-xs font-black uppercase tracking-widest">Identify Service Obligation</h3>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">Priority Level</label>
                <select className="w-full p-4 border rounded-2xl bg-slate-50 mt-1 font-black outline-none" 
                  value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                  <option value="NORMAL">Normal / Scheduled</option>
                  <option value="URGENT">Urgent Requirement</option>
                  <option value="EMERGENCY">Life-Threatening Emergency</option>
                </select>
             </div>
             <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">Requisition Purpose / Brief</label>
                <input required placeholder="e.g. ICU Maintenance & Equipment Repair" className="w-full p-4 border rounded-2xl bg-slate-50 mt-1" 
                  value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
             </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase">Justification / Reason for Request</label>
            <textarea required className="w-full p-4 border rounded-2xl bg-slate-50 mt-1 h-20" 
              placeholder="Why are these services needed?"
              value={form.justification} onChange={e => setForm({...form, justification: e.target.value})} />
          </div>

          {/* Service Items Builder */}
          <div className="border-t border-slate-200 pt-6 space-y-4">
            <h4 className="text-[11px] font-black text-blue-600 uppercase tracking-wider">Service Items Builder</h4>
            
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase">Service Title / Job Name</label>
                  <input placeholder="e.g. Repair of ICU Ventilator #4" className="w-full p-3 border rounded-xl bg-white mt-1 text-sm font-bold" 
                    value={tempItem.serviceTitle} onChange={e => setTempItem({...tempItem, serviceTitle: e.target.value})} />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase">Estimated Cost (₵)</label>
                  <input type="number" placeholder="0" className="w-full p-3 border rounded-xl bg-white mt-1 text-sm font-bold text-blue-900" 
                    value={tempItem.estimatedCost || ''} onChange={e => setTempItem({...tempItem, estimatedCost: Number(e.target.value)})} />
                </div>
              </div>
              
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase">Item Description / Details (Optional)</label>
                <input placeholder="e.g. Rebuilding pump valve and replacing O-rings" className="w-full p-3 border rounded-xl bg-white mt-1 text-sm font-bold" 
                  value={tempItem.description} onChange={e => setTempItem({...tempItem, description: e.target.value})} />
              </div>

              <Button type="button" onClick={handleAddItem} className="w-full bg-slate-800 hover:bg-black text-white font-bold py-3 rounded-2xl text-xs uppercase tracking-wide flex items-center justify-center gap-2">
                <Plus size={14} /> Add Service Item to Requisition
              </Button>
            </div>
          </div>

          {/* List of Added Items */}
          {items.length > 0 && (
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase">Requisition Items List ({items.length})</label>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {items.map((item, idx) => (
                  <div key={item.id} className="flex items-center justify-between bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                     <div className="flex-1">
                        <p className="font-black uppercase text-xs text-slate-800">{idx + 1}. {item.serviceTitle}</p>
                        {item.description && <p className="text-[10px] text-slate-500 font-medium italic mt-0.5">{item.description}</p>}
                     </div>
                     <div className="flex items-center gap-4">
                        <span className="text-xs font-black text-blue-900">₵ {item.estimatedCost.toFixed(2)}</span>
                        <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}><Trash2 size={16} className="text-slate-400 hover:text-destructive"/></Button>
                     </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center bg-slate-900 text-white p-4 rounded-2xl border">
                <span className="text-xs font-black uppercase tracking-wider">Total Requisition Cost:</span>
                <span className="font-black text-lg">₵ {items.reduce((sum, item) => sum + item.estimatedCost, 0).toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3 hover:bg-black transition-all">
          {loading ? <Loader2 className="animate-spin"/> : <Send size={18}/>} Commit Requisition
        </button>
      </form>
    </div>
  );
}
