'use client';
import { useState, useMemo } from 'react';
import { Zap, ShieldAlert, Sparkles, CheckCircle2, FileText, Activity, ShieldCheck, Plus, Trash2, Send, Baby, Scissors, Bed, AlertCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import {
  getConditionOrderBundles,
  checkDrugSafety,
  OrderBundle,
  OrderItem,
  SafetyAlert
} from '@/ai/flows/ai-clinical-orders-engine';
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface ClinicalOrdersCardProps {
  patientId?: string;
  hospitalId?: string;
  patientName?: string;
  allergies?: string;
  activeMedications?: string[];
  defaultExpanded?: boolean;
}

export function ClinicalOrdersCard({
  patientId,
  hospitalId: propHospitalId,
  patientName = 'Patient',
  allergies = 'NKDA',
  activeMedications = [],
  defaultExpanded = true
}: ClinicalOrdersCardProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const params = useParams();
  const effectivePatientId = patientId || (params?.id as string);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc(userProfileRef);

  const hospitalId = propHospitalId || userProfile?.hospitalId;

  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [selectedBundleId, setSelectedBundleId] = useState<string | null>(null);
  const [orderBasket, setOrderBasket] = useState<OrderItem[]>([]);
  const [customDrugName, setCustomDrugName] = useState('');
  const [customDosage, setCustomDosage] = useState('');
  const [customDuration, setCustomDuration] = useState('5 Days');
  const [safetyAlerts, setSafetyAlerts] = useState<SafetyAlert[]>([]);

  const bundles = useMemo(() => getConditionOrderBundles(), []);

  // Check safety whenever custom drug input changes
  const handleCustomDrugChange = (drugName: string) => {
    setCustomDrugName(drugName);
    if (drugName.length >= 3) {
      const alerts = checkDrugSafety(drugName, allergies, activeMedications);
      setSafetyAlerts(alerts);
    } else {
      setSafetyAlerts([]);
    }
  };

  const applyBundle = (bundle: OrderBundle) => {
    setSelectedBundleId(bundle.id);
    
    // Check safety for all items in bundle against patient allergies
    const newAlerts: SafetyAlert[] = [];
    bundle.items.forEach(item => {
      if (item.category === 'MEDICATION') {
        const alerts = checkDrugSafety(item.name, allergies, activeMedications);
        newAlerts.push(...alerts);
      }
    });

    setSafetyAlerts(newAlerts);
    setOrderBasket(bundle.items);

    toast({
      title: `⚡ Loaded Bundle: ${bundle.title}`,
      description: `Auto-queued ${bundle.items.length} clinical orders for ${patientName}.`
    });
  };

  const addCustomDrugToBasket = () => {
    if (!customDrugName.trim()) return;

    // Check for blocking allergy alerts
    const alerts = checkDrugSafety(customDrugName, allergies, activeMedications);
    const blockingAlert = alerts.find(a => a.severity === 'BLOCKING_ALLERGY');

    if (blockingAlert) {
      toast({
        variant: 'destructive',
        title: '🚨 ORDER BLOCKED BY SAFETY CHECKER',
        description: blockingAlert.message
      });
      return;
    }

    const newItem: OrderItem = {
      id: `CUSTOM-RX-${Date.now()}`,
      category: 'MEDICATION',
      name: customDrugName.trim(),
      details: `Internal e-Rx Order (${customDosage || 'Standard Dose'})`,
      dosage: customDosage || '1 Tab',
      frequency: 'Daily',
      duration: customDuration,
      isUrgent: false
    };

    setOrderBasket(prev => [...prev, newItem]);
    setCustomDrugName('');
    setCustomDosage('');
    setSafetyAlerts([]);

    toast({
      title: '💊 Medication Added to e-Rx Basket',
      description: `Queued ${newItem.name} for ${patientName}.`
    });
  };

  const removeOrderItem = (itemId: string) => {
    setOrderBasket(prev => prev.filter(i => i.id !== itemId));
  };

  const dispatchOrdersToHospital = () => {
    if (orderBasket.length === 0) return;

    if (firestore && hospitalId && effectivePatientId) {
      // Write lab orders
      const labItems = orderBasket.filter(i => i.category === 'LAB' || i.category === 'IMAGING');
      if (labItems.length > 0) {
        const labOrderRef = doc(firestore, `hospitals/${hospitalId}/lab_orders/LAB-${Date.now()}`);
        setDocumentNonBlocking(labOrderRef, {
          patientId: effectivePatientId,
          patientName,
          orders: labItems,
          orderedBy: user?.displayName || userProfile?.name || 'Attending Physician',
          status: 'PENDING',
          createdAt: serverTimestamp()
        }, { merge: true });
      }

      // Write prescriptions
      const rxItems = orderBasket.filter(i => i.category === 'MEDICATION');
      if (rxItems.length > 0) {
        const rxRef = doc(firestore, `hospitals/${hospitalId}/prescriptions/RX-${Date.now()}`);
        setDocumentNonBlocking(rxRef, {
          patientId: effectivePatientId,
          patientName,
          medications: rxItems,
          prescribedBy: user?.displayName || userProfile?.name || 'Attending Physician',
          status: 'QUEUED_PHARMACY',
          createdAt: serverTimestamp()
        }, { merge: true });
      }
    }

    toast({
      title: '⚡ Orders Dispatched to Pharmacy & Laboratory',
      description: `Dispatched ${orderBasket.length} clinical orders for ${patientName}.`
    });

    setOrderBasket([]);
    setSelectedBundleId(null);
    setSafetyAlerts([]);
  };

  return (
    <div className="bg-slate-950 text-white rounded-[32px] border-4 border-indigo-600 shadow-2xl overflow-hidden transition-all mb-6">
      {/* COLLAPSIBLE HEADER BAR */}
      <div 
        onClick={() => setIsExpanded(prev => !prev)}
        className="p-5 bg-indigo-950/40 hover:bg-indigo-900/40 flex flex-col md:flex-row justify-between items-start md:items-center cursor-pointer transition-all border-b border-indigo-900 gap-3 select-none"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-900/80 rounded-2xl border border-indigo-700 text-indigo-300">
            <Zap className="animate-pulse" size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-indigo-300">Integrated Clinical Orders & e-Rx Safety Execution Hub</h3>
              <span className="text-[9px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-full uppercase">
                {orderBasket.length} ORDERS QUEUED
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
              1-Click Condition Bundles (ANC, Preeclampsia, Sepsis, VOC) • Real-Time e-Rx Allergy & Drug Interaction Safety Checker
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black bg-indigo-950 text-indigo-300 border border-indigo-800 px-3 py-1 rounded-full uppercase">
            Allergies: {allergies}
          </span>
          <Button size="sm" variant="ghost" className="text-indigo-400 font-black text-xs uppercase rounded-xl">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {isExpanded ? 'Collapse' : 'Expand Orders Hub'}
          </Button>
        </div>
      </div>

      {/* EXPANDABLE ORDERS WORKSPACE */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* SECTION 1: 1-CLICK CONDITION ORDER BUNDLES */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase text-indigo-400 tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Sparkles size={14} /> 1-Click Condition Order Bundles (Pre-Packaged Protocols):
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {bundles.map((bundle) => (
                <div
                  key={bundle.id}
                  onClick={() => applyBundle(bundle)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer select-none space-y-2 ${
                    selectedBundleId === bundle.id 
                      ? 'bg-indigo-900/60 border-indigo-400 ring-2 ring-indigo-500/40 shadow-xl' 
                      : 'bg-slate-900 border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-black uppercase bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-800">
                      {bundle.category}
                    </span>
                    <span className="text-[10px] font-black text-indigo-400">{bundle.items.length} Orders</span>
                  </div>

                  <div>
                    <h5 className="text-xs font-black text-white">{bundle.title}</h5>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">{bundle.subtitle}</p>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase rounded-xl h-7"
                  >
                    ⚡ Auto-Queue Bundle
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 2: INTERNAL E-PRESCRIBING (e-Rx) WITH REAL-TIME SAFETY CHECKER */}
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
            <h4 className="text-xs font-black uppercase text-cyan-400 tracking-wider flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
              <ShieldCheck size={14} /> Internal E-Prescribing (e-Rx) & Real-Time Safety Checker:
            </h4>

            {/* REAL-TIME SAFETY ALERTS BANNER */}
            {safetyAlerts.length > 0 && (
              <div className="space-y-2 animate-in slide-in-from-top-2">
                {safetyAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-xl border flex items-start gap-3 ${
                      alert.severity === 'BLOCKING_ALLERGY'
                        ? 'bg-red-950/80 border-red-600 text-red-200'
                        : 'bg-amber-950/80 border-amber-600 text-amber-200'
                    }`}
                  >
                    <ShieldAlert size={18} className="shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="text-xs font-black">{alert.message}</p>
                      <p className="text-[10px] font-bold text-slate-300">{alert.recommendation}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* DRUG PRESCRIBING BAR */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={customDrugName}
                  onChange={(e) => handleCustomDrugChange(e.target.value)}
                  placeholder="Enter medication (e.g. Amoxicillin, Labetalol, Paracetamol)..."
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500 font-medium"
                />
              </div>

              <div>
                <input
                  type="text"
                  value={customDosage}
                  onChange={(e) => setCustomDosage(e.target.value)}
                  placeholder="Dosage (e.g. 500mg PO TID)..."
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500 font-medium"
                />
              </div>

              <div>
                <Button
                  type="button"
                  onClick={addCustomDrugToBasket}
                  disabled={!customDrugName.trim()}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs uppercase rounded-xl h-11 flex items-center justify-center gap-1.5 shadow-lg disabled:opacity-50"
                >
                  <Plus size={14} /> Add to e-Rx
                </Button>
              </div>
            </div>
          </div>

          {/* SECTION 3: QUEUED ORDERS BASKET & DISPATCH BUTTON */}
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                <Activity size={14} /> Active Order Basket ({orderBasket.length} Orders Queued):
              </h4>

              <Button
                type="button"
                onClick={dispatchOrdersToHospital}
                disabled={orderBasket.length === 0}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase rounded-xl h-8 px-4 flex items-center gap-1.5 shadow-lg disabled:opacity-50"
              >
                <Send size={14} /> ⚡ Dispatch Orders to Pharmacy & Lab
              </Button>
            </div>

            <div className="space-y-2">
              {orderBasket.length > 0 ? (
                orderBasket.map((item) => (
                  <div key={item.id} className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex justify-between items-center gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                        item.category === 'MEDICATION' ? 'bg-cyan-900 text-cyan-200 border border-cyan-700' :
                        item.category === 'LAB' ? 'bg-amber-900 text-amber-200 border border-amber-700' :
                        'bg-purple-900 text-purple-200 border border-purple-700'
                      }`}>
                        {item.category}
                      </span>

                      <div>
                        <h5 className="text-xs font-bold text-white flex items-center gap-2">
                          {item.name}
                          {item.isUrgent && <span className="bg-red-600 text-white text-[8px] font-black px-1.5 rounded-sm">URGENT</span>}
                        </h5>
                        <p className="text-[10px] text-slate-400 font-medium">{item.details} {item.dosage ? `• ${item.dosage}` : ''}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => removeOrderItem(item.id)}
                      className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-4 bg-slate-900/40 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500 font-medium">
                  No orders queued yet. Select a 1-Click Condition Bundle above or add a prescription.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
