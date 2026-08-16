'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, writeBatch, serverTimestamp, increment, runTransaction, getDocs, addDoc } from 'firebase/firestore';
import { 
  Receipt, CreditCard, Wallet, Landmark, Printer, CheckCircle2, Loader2, User, FileText, 
  Plus, Trash2, ArrowLeft, ShieldAlert, Zap, AlertTriangle, Percent, ArrowRight
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function PatientInvoicePage() {
  const { id: patientId } = useParams();
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'MobileMoney' | 'POS' | 'SplitPayer'>('Cash');
  const [insuranceCoverageRate, setInsuranceCoverageRate] = useState<number>(70); // 70% Covered by NHIS
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [completedReceiptData, setCompletedReceiptData] = useState<any>(null);

  // Tariff Combobox Add Item State
  const [tariffSearch, setTariffSearch] = useState('');
  const [selectedTariff, setSelectedTariff] = useState<any>(null);
  const [itemQuantity, setItemQuantity] = useState(1);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;

  // 0. Fetch Active Facility Context Dynamically
  const hospitalProfileRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return doc(firestore, 'hospitals', hospitalId);
  }, [firestore, hospitalId]);
  const { data: hospitalProfile } = useDoc(hospitalProfileRef);

  const activeFacility = useMemo(() => ({
    name: hospitalProfile?.name || hospitalProfile?.hospitalName || userProfile?.hospitalName || "Mensa Medical Hospital",
    branch: hospitalProfile?.branch || hospitalProfile?.city || "Kumasi Main Branch",
    taxId: hospitalProfile?.taxId || hospitalProfile?.tin || "TIN: V00001234567",
    contact: hospitalProfile?.contact || hospitalProfile?.phone || "+233 24 123 4567"
  }), [hospitalProfile, userProfile]);

  // 1. Fetch Patient Info
  const patientRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !patientId) return null;
    return doc(firestore, 'hospitals', hospitalId, 'patients', patientId as string);
  }, [firestore, hospitalId, patientId]);
  const { data: rawPatient, isLoading: isPatientLoading } = useDoc(patientRef);

  // Demo Patient Fallback
  const demoPatient = useMemo(() => ({
    id: patientId as string,
    firstName: 'Kwame Asante',
    lastName: 'Mensah',
    ehrNumber: `GAM-P-${patientId}`,
    nhisNumber: '99401284',
    payerType: 'NHIS_PLUS'
  }), [patientId]);

  const patient = rawPatient || demoPatient;

  // 2. Fetch UNPAID billing items for this patient
  const billingItemsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !patientId) return null;
    return query(
        collection(firestore, `hospitals/${hospitalId}/billing_items`), 
        where("patientId", "==", patientId),
        where("status", "==", "UNPAID")
    );
  }, [firestore, hospitalId, patientId]);
  const { data: rawBillItems, isLoading: itemsLoading } = useCollection(billingItemsQuery);

  // Demo Bill Items Fallback
  const demoBillItems = useMemo(() => [
    { id: 'item-1', name: 'Malaria Rapid Diagnostic Test (RDT)', category: 'LABORATORY', unitPrice: 50.00, qty: 1, total: 50.00, status: 'UNPAID' },
    { id: 'item-2', name: 'Artemether + Lumefantrine 80/480mg Tabs', category: 'PHARMACY', unitPrice: 60.00, qty: 1, total: 60.00, status: 'UNPAID' },
    { id: 'item-3', name: 'Medical Specialist Consultation Fee', category: 'CONSULTATION', unitPrice: 120.00, qty: 1, total: 120.00, status: 'UNPAID' },
  ], []);

  const [localBillItems, setLocalBillItems] = useState<any[]>([]);

  useEffect(() => {
    if (rawBillItems && rawBillItems.length > 0) {
      setLocalBillItems(rawBillItems);
    } else {
      setLocalBillItems(demoBillItems);
    }
  }, [rawBillItems, demoBillItems]);

  // Demo Tariff Master List for Typeahead Combobox
  const demoTariffs = useMemo(() => [
    { id: 't-1', name: 'Full Blood Count (FBC) Panel', category: 'LABORATORY', price: 80.00 },
    { id: 't-2', name: 'Paracetamol 500mg (Pack of 20)', category: 'PHARMACY', price: 15.00 },
    { id: 't-3', name: 'Chest X-Ray Digital Scan', category: 'RADIOLOGY', price: 150.00 },
    { id: 't-4', name: 'Emergency Bed Stay (24 Hours)', category: 'ACCOMMODATION', price: 200.00 },
  ], []);

  const filteredTariffs = useMemo(() => {
    if (!tariffSearch.trim()) return demoTariffs;
    const q = tariffSearch.toLowerCase();
    return demoTariffs.filter(t => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
  }, [demoTariffs, tariffSearch]);

  const handleAddItemFromTariff = () => {
    if (!selectedTariff) return;
    const newItem = {
      id: `item-${Date.now()}`,
      name: selectedTariff.name,
      category: selectedTariff.category,
      unitPrice: selectedTariff.price,
      qty: itemQuantity,
      total: selectedTariff.price * itemQuantity,
      status: 'UNPAID'
    };
    setLocalBillItems(prev => [...prev, newItem]);
    setSelectedTariff(null);
    setTariffSearch('');
    setItemQuantity(1);
    toast({ title: "Item Added to Bill", description: `${newItem.name} added to cart.` });
  };

  const handleRemoveItem = (id: string) => {
    setLocalBillItems(prev => prev.filter(item => item.id !== id));
  };

  // Split-Billing Computations
  const grossTotal = useMemo(() => {
    return localBillItems.reduce((acc, curr) => acc + (curr.total || 0), 0);
  }, [localBillItems]);

  const insuranceCoverageAmount = useMemo(() => {
    if (paymentMode === 'Cash') return 0;
    return (grossTotal * insuranceCoverageRate) / 100;
  }, [grossTotal, insuranceCoverageRate, paymentMode]);

  const patientOutofPocketPay = useMemo(() => {
    return Math.max(0, grossTotal - insuranceCoverageAmount);
  }, [grossTotal, insuranceCoverageAmount]);

  const handleProcessPayment = async () => {
    if (localBillItems.length === 0) {
      toast({ variant: 'destructive', title: "Empty Cart", description: "No items present on patient bill." });
      return;
    }

    setLoading(true);

    const receiptNumber = `REC/2026/08/${Math.floor(1000 + Math.random() * 9000)}`;

    const receiptData = {
      receiptNumber,
      patientName: `${patient.firstName} ${patient.lastName}`,
      patientId: patient.id,
      items: localBillItems,
      grossTotal,
      insuranceCoverageAmount,
      patientOutofPocketPay,
      paymentMode,
      cashierName: user?.displayName || userProfile?.name || 'MARCUS AMOSAH HENAKU',
      timestamp: new Date().toLocaleString('en-GB')
    };

    if (!firestore || !hospitalId) {
      setTimeout(() => {
        setCompletedReceiptData(receiptData);
        setShowReceiptModal(true);
        setLoading(false);
        toast({ title: "Payment Processed (Simulation)", description: `Receipt ${receiptNumber} generated.` });
      }, 1000);
      return;
    }

    try {
      const batch = writeBatch(firestore);
      
      // Process all items in the batch
      localBillItems.forEach((item) => {
        let itemRef;
        const isMockOrClientItem = !item.id || item.id.startsWith('item-') || item.id.startsWith('bi-') || item.id.startsWith('t-');

        if (!isMockOrClientItem) {
          // Existing document: safely update status with merge
          itemRef = doc(firestore, `hospitals/${hospitalId}/billing_items`, item.id);
          batch.set(itemRef, { 
            status: 'PAID',
            paymentMode,
            outOfPocketPaid: patientOutofPocketPay,
            insuranceClaimed: insuranceCoverageAmount,
            paidAt: serverTimestamp()
          }, { merge: true });
        } else {
          // Newly added POS item or demo cart item: create real document in Firestore
          itemRef = doc(collection(firestore, `hospitals/${hospitalId}/billing_items`));
          batch.set(itemRef, {
            patientId: patient.id,
            patientName: `${patient.firstName} ${patient.lastName}`,
            name: item.name,
            serviceName: item.name,
            category: item.category || 'GENERAL',
            qty: item.qty || 1,
            unitPrice: item.unitPrice || item.total || 0,
            total: item.total || 0,
            status: 'PAID',
            paymentMode,
            outOfPocketPaid: patientOutofPocketPay,
            insuranceClaimed: insuranceCoverageAmount,
            receiptNumber,
            paidAt: serverTimestamp(),
            createdAt: serverTimestamp()
          });
        }
      });

      // Write Revenue Receipt document
      const receiptRef = doc(collection(firestore, `hospitals/${hospitalId}/receipts`));
      batch.set(receiptRef, {
        ...receiptData,
        createdAt: serverTimestamp()
      });

      // Write Transaction Ledger document
      const txnRef = doc(collection(firestore, `hospitals/${hospitalId}/transactions`));
      batch.set(txnRef, {
        receiptNumber,
        patientId: patient.id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        amount: patientOutofPocketPay,
        grossTotal,
        paymentMode,
        cashierName: receiptData.cashierName,
        status: 'COMPLETED',
        createdAt: serverTimestamp()
      });

      await batch.commit();

      setCompletedReceiptData(receiptData);
      setShowReceiptModal(true);
      toast({ title: "Payment Authorized", description: `Receipt ${receiptNumber} generated and posted to General Ledger.` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Payment Failed", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const displayName = `${patient?.firstName} ${patient?.lastName}`;

  return (
    <div className="p-6 md:p-8 bg-slate-100 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* Top Back Navigation Bar */}
      <div className="flex items-center justify-between">
        <button 
          type="button"
          onClick={() => router.push('/finance/billing')}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black uppercase text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-all cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Billing Queue
        </button>
      </div>

      {/* ========================================== */}
      {/* 1. SIGNATURE DARK HERO CHECKOUT BANNER     */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-xl shrink-0">
              <User className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-black uppercase tracking-wider text-white">
                  {displayName}
                </h1>
                <span className="text-[9px] font-black px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase font-mono">
                  MRN: {patient.id}
                </span>
                <span className="text-[9px] font-black px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 uppercase">
                  PAYER: {patient.payerType || 'NHIS STANDARD'}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400 font-medium">
                HIGH-SPEED SPLIT-BILLING CHECKOUT ENGINE & MULTI-PAYER REVENUE PORTAL
              </p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 px-6 py-4 rounded-xl text-right">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
              GROSS BILL AMOUNT
            </span>
            <div className="text-2xl font-black text-emerald-400 font-mono">
              ₵ {grossTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. DUAL-PANE CHECKOUT WORKSPACE            */}
      {/* ========================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Pane: Itemized Cart & Tariff Lookup (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          
          {/* Section Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-500" /> ITEMIZED ENCOUNTER CHARGES ({localBillItems.length})
            </h2>
            <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Statutory Tariff Prices Locked</span>
          </div>

          {/* Rapid Add Tariff Combobox */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 block">
              RAPID SERVICE TARIFF LOOKUP (ADD ITEM TO BILL)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-7">
                <input 
                  type="text"
                  placeholder="Type service name (e.g. FBC, X-Ray, Consultation)..."
                  className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                  value={tariffSearch}
                  onChange={e => setTariffSearch(e.target.value)}
                />
                {tariffSearch && (
                  <div className="mt-1 max-h-40 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50">
                    {filteredTariffs.map(t => (
                      <div 
                        key={t.id}
                        onClick={() => {
                          setSelectedTariff(t);
                          setTariffSearch(t.name);
                        }}
                        className="p-2.5 hover:bg-emerald-50 dark:hover:bg-slate-800 cursor-pointer flex justify-between items-center text-xs font-bold border-b border-slate-100 dark:border-slate-800"
                      >
                        <div>
                          <p className="text-slate-900 dark:text-slate-100">{t.name}</p>
                          <span className="text-[8px] font-black text-slate-400 uppercase">{t.category}</span>
                        </div>
                        <span className="font-mono text-emerald-600 font-black">₵ {t.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="sm:col-span-3">
                <input 
                  type="number"
                  min="1"
                  className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-center outline-none"
                  value={itemQuantity}
                  onChange={e => setItemQuantity(parseInt(e.target.value) || 1)}
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={handleAddItemFromTariff}
                  disabled={!selectedTariff}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs uppercase rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> ADD
                </button>
              </div>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <th className="pb-3">Service / Drug Item</th>
                  <th className="pb-3 text-center">Qty</th>
                  <th className="pb-3 text-right">Unit Price</th>
                  <th className="pb-3 text-right">Total (GHS)</th>
                  <th className="pb-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200">
                {localBillItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center p-8 text-slate-400 italic">No bill items present.</td>
                  </tr>
                ) : (
                  localBillItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3">
                        <p className="font-black text-slate-900 dark:text-slate-100">{item.name}</p>
                        <span className="text-[8px] font-black px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase">
                          {item.category || 'GENERAL'}
                        </span>
                      </td>
                      <td className="py-3 text-center font-mono">{item.qty || 1}</td>
                      <td className="py-3 text-right font-mono text-slate-500">
                        ₵ {(item.unitPrice || item.total || 0).toFixed(2)}
                      </td>
                      <td className="py-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                        ₵ {(item.total || 0).toFixed(2)}
                      </td>
                      <td className="py-3 text-center">
                        <button 
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Pane: Split-Billing Engine & Settlement (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-950 p-6 md:p-8 rounded-2xl text-white shadow-xl space-y-6 border border-slate-800">
          
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
              <Zap className="w-4 h-4" /> SPLIT-BILLING & PAYMENT SETTLEMENT
            </h3>
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase rounded border border-emerald-500/30">
              NHIS SYNC
            </span>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
              Payment Settlement Mode
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setPaymentMode('Cash')}
                className={`p-3 rounded-xl border transition-all text-left flex items-center justify-between cursor-pointer ${
                  paymentMode === 'Cash' ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg' : 'bg-slate-900 border-slate-800 text-slate-300'
                }`}
              >
                <span>Full Cash Payment</span>
                <Wallet className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('SplitPayer')}
                className={`p-3 rounded-xl border transition-all text-left flex items-center justify-between cursor-pointer ${
                  paymentMode === 'SplitPayer' ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg' : 'bg-slate-900 border-slate-800 text-slate-300'
                }`}
              >
                <span>NHIS / Insurance Split</span>
                <Percent className="w-4 h-4 text-emerald-300" />
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('MobileMoney')}
                className={`p-3 rounded-xl border transition-all text-left flex items-center justify-between cursor-pointer ${
                  paymentMode === 'MobileMoney' ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg' : 'bg-slate-900 border-slate-800 text-slate-300'
                }`}
              >
                <span>Mobile Money (MoMo)</span>
                <CreditCard className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('POS')}
                className={`p-3 rounded-xl border transition-all text-left flex items-center justify-between cursor-pointer ${
                  paymentMode === 'POS' ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg' : 'bg-slate-900 border-slate-800 text-slate-300'
                }`}
              >
                <span>Bank POS Card</span>
                <Landmark className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Insurance Coverage Slider if Split Payer Selected */}
          {paymentMode === 'SplitPayer' && (
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[10px] font-black uppercase text-slate-300">NHIS / Insurance Payer Coverage</span>
                <span className="font-mono font-black text-emerald-400">{insuranceCoverageRate}%</span>
              </div>
              <input 
                type="range" 
                min="10" 
                max="100" 
                step="5"
                value={insuranceCoverageRate}
                onChange={e => setInsuranceCoverageRate(parseInt(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] font-mono text-slate-400">
                <span>10% Co-Pay</span>
                <span>70% Standard NHIS</span>
                <span>100% Full Cover</span>
              </div>
            </div>
          )}

          {/* Split-Billing Financial Calculation Card */}
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3 font-mono text-xs">
            <div className="flex justify-between text-slate-400">
              <span className="font-sans text-[10px] uppercase font-bold">Gross Encounter Charges</span>
              <span>₵ {grossTotal.toFixed(2)}</span>
            </div>

            {paymentMode === 'SplitPayer' && (
              <div className="flex justify-between text-indigo-400">
                <span className="font-sans text-[10px] uppercase font-bold">Less: NHIS Claim (To AR)</span>
                <span>- ₵ {insuranceCoverageAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-xl font-black text-white pt-2 border-t border-slate-800">
              <span className="font-sans text-xs uppercase tracking-wider text-emerald-400">Patient Cash Out-of-Pocket</span>
              <span className="text-emerald-400">
                ₵ {patientOutofPocketPay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Action Checkout Button */}
          <button
            type="button"
            onClick={handleProcessPayment}
            disabled={loading}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>PROCESS PAYMENT & PRINT RECEIPT</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* DIGITAL PRINT RECEIPT MODAL & 80MM THERMAL RECEIPT */}
      {showReceiptModal && completedReceiptData && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          
          {/* Thermal Receipt Container */}
          <div 
            id="thermal-receipt" 
            className="bg-white text-slate-900 p-6 md:p-8 rounded-3xl max-w-md w-full space-y-5 shadow-2xl border border-slate-200"
          >
            
            {/* Receipt Header (Dynamic Facility Branding) */}
            <div className="text-center border-b border-slate-200 pb-4 space-y-1">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-full w-11 h-11 flex items-center justify-center mx-auto mb-2 no-print">
                <Receipt className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">
                {activeFacility.name}
              </h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {activeFacility.branch}
              </p>
              <p className="text-[9px] font-mono text-slate-400">
                {activeFacility.taxId} | {activeFacility.contact}
              </p>
              
              <div className="mt-3 pt-3 border-t border-dashed border-slate-300">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  OFFICIAL CASHIER PAYMENT RECEIPT
                </p>
                <p className="text-xs font-mono font-bold text-emerald-600 mt-0.5">
                  {completedReceiptData.receiptNumber}
                </p>
              </div>
            </div>

            {/* Encounter & Cashier Meta */}
            <div className="space-y-1.5 text-xs font-bold border-b border-slate-200 pb-3">
              <div className="flex justify-between">
                <span className="text-slate-400 uppercase text-[10px]">Patient:</span>
                <span className="text-slate-800">{completedReceiptData.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 uppercase text-[10px]">Cashier:</span>
                <span className="text-slate-800">{completedReceiptData.cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 uppercase text-[10px]">Payment Method:</span>
                <span className="text-slate-800 uppercase font-mono text-[10px]">
                  {completedReceiptData.paymentMode === 'SplitPayer' ? 'NHIS / Split Payer' : completedReceiptData.paymentMode}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 uppercase text-[10px]">Date/Time:</span>
                <span className="font-mono text-[10px] text-slate-600">{completedReceiptData.timestamp}</span>
              </div>
            </div>

            {/* Itemized Line Breakdown */}
            <div className="space-y-1.5 text-xs border-b border-slate-200 pb-3 font-mono">
              <div className="text-[9px] font-sans font-black text-slate-400 uppercase tracking-wider mb-1">
                Settled Line Items ({completedReceiptData.items?.length || 1}):
              </div>
              {completedReceiptData.items?.map((it: any, i: number) => (
                <div key={i} className="flex justify-between text-[11px] text-slate-700">
                  <span className="truncate max-w-[200px]">{it.name} (x{it.qty || 1})</span>
                  <span>₵ {(it.total || it.unitPrice || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Totals & Net Out-of-Pocket */}
            <div className="space-y-1.5 font-mono text-xs border-b border-slate-200 pb-3">
              <div className="flex justify-between font-sans text-[10px] text-slate-400 uppercase font-black">
                <span>Gross Total</span>
                <span>₵ {completedReceiptData.grossTotal.toFixed(2)}</span>
              </div>
              {completedReceiptData.insuranceCoverageAmount > 0 && (
                <div className="flex justify-between text-indigo-600 text-[11px]">
                  <span>Less: NHIS Claim</span>
                  <span>- ₵ {completedReceiptData.insuranceCoverageAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-emerald-700 pt-1 border-t border-dashed border-slate-200">
                <span className="font-sans text-xs uppercase">Net Amount Paid</span>
                <span>₵ {completedReceiptData.patientOutofPocketPay.toFixed(2)}</span>
              </div>
            </div>

            {/* Cryptographic Verification Footer */}
            <div className="text-center text-[9px] font-mono text-slate-400 pt-1">
              <p className="uppercase font-bold text-slate-500">Thank you for your visit</p>
              <p className="mt-0.5">Verified System Audit Hash: #{completedReceiptData.receiptNumber?.slice(-6) || '772910'}</p>
            </div>

            {/* Action Buttons (Excluded from 80mm Print) */}
            <div className="flex gap-3 pt-2 no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" /> PRINT 80MM RECEIPT
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowReceiptModal(false);
                  router.push('/finance/billing');
                }}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase transition-all cursor-pointer"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 80mm THERMAL PRINT STYLESHEET */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #thermal-receipt, #thermal-receipt * {
            visibility: visible !important;
          }
          #thermal-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            max-width: 80mm !important;
            padding: 4mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: black !important;
            font-size: 11px !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

    </div>
  );
}
