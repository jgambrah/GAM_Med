'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc, writeBatch, serverTimestamp, setDoc } from 'firebase/firestore';
import { 
  Landmark, FileText, Printer, Loader2, ShieldAlert, ShieldCheck, 
  ChevronDown, ChevronRight, Trash2, Download, CheckCircle2, Building2,
  Calendar, Filter, Receipt, FileSpreadsheet, Lock, Mail, ExternalLink,
  Sparkles, Check, X, Ban, ArrowRight, Eye, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, subDays, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export interface ClaimItem {
  id: string;
  payerId: string;
  patientName: string;
  policyNumber?: string;
  department?: string;
  serviceCode?: string;
  description?: string;
  grossAmount?: number;
  copayAmount?: number;
  amount?: number;
  totalAmount?: number;
  status: 'UNPAID' | 'BILLED' | 'PAID' | 'EXCLUDED';
  createdAt?: { toDate: () => Date } | any;
}

export interface GroupedPatientClaims {
  patientName: string;
  policyNumber: string;
  claims: ClaimItem[];
  totalPatientClaim: number;
  isEntirelyExcluded: boolean;
}

export default function InstitutionalSchedule() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [selectedPayerId, setSelectedPayerId] = useState<string>('payer-glico');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [excludedClaimIds, setExcludedClaimIds] = useState<Set<string>>(new Set());
  const [expandedPatients, setExpandedPatients] = useState<Set<string>>(new Set(['James Gambrah_GLC-884920']));
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  
  // Invoice Generated Modal
  const [generatedInvoiceModal, setGeneratedInvoiceModal] = useState<{
    invoiceId: string;
    payerName: string;
    totalAmount: number;
    claimCount: number;
    excludedCount: number;
    excludedAmount: number;
  } | null>(null);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role || 'ACCOUNTANT';
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN', 'FINANCE_CONTROLLER'].includes(userRole);

  // Fetch all corporate payers for dropdown
  const payersQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/payers`), orderBy('name', 'asc'));
  }, [firestore, hospitalId]);
  const { data: rawPayers, isLoading: payersLoading } = useCollection(payersQuery);

  const demoPayers = useMemo(() => [
    { id: 'payer-glico', name: 'GLICO Healthcare Ltd', email: 'claims@glicohealthcare.com' },
    { id: 'payer-acacia', name: 'Acacia Health Insurance', email: 'finance@acacia.com.gh' },
    { id: 'payer-enterprise', name: 'Enterprise Life Corporate', email: 'corporate.claims@enterprisegroup.com.gh' }
  ], []);

  const payers = rawPayers && rawPayers.length > 0 ? rawPayers : demoPayers;

  // Fetch unpaid claims for the selected corporate payer
  const claimsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !selectedPayerId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/receivables`), 
      where("payerId", "==", selectedPayerId),
      where("status", "==", "UNPAID"),
      orderBy("createdAt", "asc")
    );
  }, [firestore, hospitalId, selectedPayerId]);
  const { data: rawClaims, isLoading: claimsLoading } = useCollection<ClaimItem>(claimsQuery);

  // Demodata with enriched clinical line-items & itemization
  const [localClaims, setLocalClaims] = useState<ClaimItem[]>([
    { id: 'clm-001', payerId: 'payer-glico', patientName: 'James Gambrah', policyNumber: 'GLC-884920', department: 'Specialist OPD', serviceCode: 'MED-CNS-01', description: 'Internal Medicine Specialist Consultation', grossAmount: 350.00, copayAmount: 0.00, amount: 350.00, status: 'UNPAID', createdAt: { toDate: () => new Date('2026-08-02') } },
    { id: 'clm-002', payerId: 'payer-glico', patientName: 'James Gambrah', policyNumber: 'GLC-884920', department: 'Laboratory & Diagnostics', serviceCode: 'LAB-FBC-09', description: 'Full Blood Count (FBC) & ICU Comprehensive Metabolic Panel', grossAmount: 450.00, copayAmount: 0.00, amount: 450.00, status: 'UNPAID', createdAt: { toDate: () => new Date('2026-08-02') } },
    { id: 'clm-003', payerId: 'payer-glico', patientName: 'James Gambrah', policyNumber: 'GLC-884920', department: 'Central Pharmacy', serviceCode: 'PHM-IV-22', description: 'Ceftriaxone 1g IV Infusion & ICU Antibiotics Course', grossAmount: 450.00, copayAmount: 0.00, amount: 450.00, status: 'UNPAID', createdAt: { toDate: () => new Date('2026-08-03') } },
    { id: 'clm-004', payerId: 'payer-glico', patientName: 'Abena Mensah', policyNumber: 'GLC-991204', department: 'Obstetrics & Gynaecology', serviceCode: 'OBS-ANC-04', description: 'Antenatal Ultrasound Doppler & Obstetric Consultation', grossAmount: 820.00, copayAmount: 0.00, amount: 820.00, status: 'UNPAID', createdAt: { toDate: () => new Date('2026-08-05') } },
    { id: 'clm-005', payerId: 'payer-glico', patientName: 'Abena Mensah', policyNumber: 'GLC-991204', department: 'Laboratory & Diagnostics', serviceCode: 'LAB-OBS-12', description: 'Maternal Torch & Blood Group Screening Panel', grossAmount: 380.00, copayAmount: 0.00, amount: 380.00, status: 'UNPAID', createdAt: { toDate: () => new Date('2026-08-05') } },
    { id: 'clm-006', payerId: 'payer-glico', patientName: 'Kwame Nkrumah', policyNumber: 'GLC-771029', department: 'Main Surgical Theater', serviceCode: 'SUR-TH-01', description: 'Emergency Surgical Debridement & Sterile Dressing Pack', grossAmount: 1540.00, copayAmount: 0.00, amount: 1540.00, status: 'UNPAID', createdAt: { toDate: () => new Date('2026-08-10') } }
  ]);

  const claims = useMemo(() => {
    const pool = rawClaims && rawClaims.length > 0 ? rawClaims : localClaims;
    return pool.filter(c => c.payerId === selectedPayerId);
  }, [rawClaims, localClaims, selectedPayerId]);

  const selectedPayerName = useMemo(() => {
    return payers?.find(p => p.id === selectedPayerId)?.name || 'GLICO Healthcare Ltd';
  }, [payers, selectedPayerId]);

  // Active (included) claims
  const activeClaims = useMemo(() => {
    return claims.filter(c => !excludedClaimIds.has(c.id));
  }, [claims, excludedClaimIds]);

  // Excluded claims
  const excludedClaims = useMemo(() => {
    return claims.filter(c => excludedClaimIds.has(c.id));
  }, [claims, excludedClaimIds]);

  const totalScheduleValue = useMemo(() => {
    return activeClaims.reduce((acc, c) => acc + Number(c.amount || c.totalAmount || 0), 0);
  }, [activeClaims]);

  const totalExcludedValue = useMemo(() => {
    return excludedClaims.reduce((acc, c) => acc + Number(c.amount || c.totalAmount || 0), 0);
  }, [excludedClaims]);

  // Group Claims by Patient & Policy
  const groupedPatientClaims = useMemo(() => {
    const map = new Map<string, GroupedPatientClaims>();

    claims.forEach(claim => {
      const pName = claim.patientName || 'Unknown Patient';
      const pPolicy = claim.policyNumber || 'N/A';
      const key = `${pName}_${pPolicy}`;

      if (!map.has(key)) {
        map.set(key, {
          patientName: pName,
          policyNumber: pPolicy,
          claims: [],
          totalPatientClaim: 0,
          isEntirelyExcluded: true
        });
      }

      const grp = map.get(key)!;
      grp.claims.push(claim);
      if (!excludedClaimIds.has(claim.id)) {
        grp.totalPatientClaim += Number(claim.amount || claim.totalAmount || 0);
        grp.isEntirelyExcluded = false;
      }
    });

    return Array.from(map.values());
  }, [claims, excludedClaimIds]);

  // Toggle single claim exclusion
  const toggleExcludeClaim = (claimId: string) => {
    setExcludedClaimIds(prev => {
      const next = new Set(prev);
      if (next.has(claimId)) next.delete(claimId);
      else next.add(claimId);
      return next;
    });
  };

  // Toggle entire patient group exclusion (e.g. Abena Mensah)
  const toggleExcludePatientGroup = (grp: GroupedPatientClaims) => {
    const allGroupClaimIds = grp.claims.map(c => c.id);
    const areAllCurrentlyExcluded = allGroupClaimIds.every(id => excludedClaimIds.has(id));

    setExcludedClaimIds(prev => {
      const next = new Set(prev);
      if (areAllCurrentlyExcluded) {
        // Re-include all
        allGroupClaimIds.forEach(id => next.delete(id));
      } else {
        // Exclude all
        allGroupClaimIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const toggleExpandPatient = (key: string) => {
    setExpandedPatients(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const applyQuickDateFilter = (type: 'THIS_MONTH' | 'LAST_MONTH' | 'QUARTER') => {
    const now = new Date();
    if (type === 'THIS_MONTH') {
      setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
    } else if (type === 'LAST_MONTH') {
      const lastM = subDays(startOfMonth(now), 1);
      setStartDate(format(startOfMonth(lastM), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(lastM), 'yyyy-MM-dd'));
    } else if (type === 'QUARTER') {
      setStartDate(format(startOfQuarter(now), 'yyyy-MM-dd'));
      setEndDate(format(endOfQuarter(now), 'yyyy-MM-dd'));
    }
  };

  // Execute Rigorous State Machine & Generate Master Invoice
  const handleGenerateCorporateInvoice = async () => {
    if (activeClaims.length === 0) {
      toast({ variant: "destructive", title: "No Claims Selected", description: "All claims are currently excluded. Include at least 1 claim to generate an invoice." });
      return;
    }

    setIsGeneratingInvoice(true);
    const invoiceId = `INV-${selectedPayerName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase()}-${format(new Date(), 'yyyy-MM')}`;

    try {
      if (firestore && hospitalId) {
        const batch = writeBatch(firestore);

        // 1. Create Corporate Master Invoice
        const masterRef = doc(firestore, `hospitals/${hospitalId}/corporate_invoices`, invoiceId);
        batch.set(masterRef, {
          invoiceId,
          payerId: selectedPayerId,
          payerName: selectedPayerName,
          totalAmount: totalScheduleValue,
          claimCount: activeClaims.length,
          excludedCount: excludedClaimIds.size,
          excludedAmount: totalExcludedValue,
          status: 'BILLED',
          billedBy: user?.uid || 'ACCOUNTANT',
          billedByName: userProfile?.fullName || 'Marcus Amosah Henaku',
          billedAt: serverTimestamp(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 Days Net Terms
          period: format(new Date(), 'yyyy-MM')
        });

        // 2. Lock active claims to BILLED status
        activeClaims.forEach(claim => {
          const claimRef = doc(firestore, `hospitals/${hospitalId}/receivables`, claim.id);
          batch.set(claimRef, {
            status: 'BILLED',
            masterInvoiceId: invoiceId,
            billedAt: serverTimestamp()
          }, { merge: true });
        });

        // 3. Push to AR Aging Matrix (Current 0-30 Days Bucket)
        const arRef = doc(firestore, `hospitals/${hospitalId}/receivables`, invoiceId);
        batch.set(arRef, {
          id: invoiceId,
          payerId: selectedPayerId,
          payerName: selectedPayerName,
          invoiceNumber: invoiceId,
          amount: totalScheduleValue,
          netAmount: totalScheduleValue,
          agingBucket: '0-30 Days',
          status: 'UNPAID',
          createdAt: serverTimestamp(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }, { merge: true });

        // 4. Post Double-Entry Journal Voucher (Debit AR 1200, Credit Unbilled Revenue 4050)
        const jvRef = doc(collection(firestore, `hospitals/${hospitalId}/journal_vouchers`));
        batch.set(jvRef, {
          jvNumber: `JV-${invoiceId}`,
          source: 'CORPORATE_BILLING',
          datePosted: serverTimestamp(),
          preparerId: user?.uid || 'ACCOUNTANT',
          preparerName: userProfile?.fullName || 'Marcus Amosah Henaku',
          narration: `Corporate Master Invoice ${invoiceId} for ${selectedPayerName}. Total ${activeClaims.length} patient claims locked. Value: GHS ${totalScheduleValue.toFixed(2)}.`,
          status: 'POSTED',
          hospitalId,
          period: format(new Date(), 'yyyy-MM'),
          entries: [
            { accountCode: '1200', accountName: `Accounts Receivable - ${selectedPayerName}`, debit: totalScheduleValue, credit: 0 },
            { accountCode: '4050', accountName: 'Unbilled Corporate Revenue Clearing', debit: 0, credit: totalScheduleValue }
          ]
        });

        await batch.commit();
      }

      // Update in-memory state so billed claims lock
      setLocalClaims(prev => prev.map(c => 
        !excludedClaimIds.has(c.id) ? { ...c, status: 'BILLED' as const } : c
      ));

      // Trigger Confirmation Modal
      setGeneratedInvoiceModal({
        invoiceId,
        payerName: selectedPayerName,
        totalAmount: totalScheduleValue,
        claimCount: activeClaims.length,
        excludedCount: excludedClaimIds.size,
        excludedAmount: totalExcludedValue
      });

      toast({
        title: "Master Invoice Generated & Locked",
        description: `Created ${invoiceId} for GHS ${totalScheduleValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}. Pushed to AR Aging Matrix.`
      });

    } catch (e: any) {
      toast({ variant: "destructive", title: "Invoice Generation Failed", description: e.message });
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const handleExportCSV = () => {
    if (!groupedPatientClaims || groupedPatientClaims.length === 0) {
      toast({ variant: "destructive", title: "No Data", description: "No corporate claims available to export." });
      return;
    }

    const headers = [
      "Patient Name",
      "Policy ID / Member No",
      "Service Date",
      "Department",
      "Service Code",
      "Medical Service Description",
      "Billed Amount (GHS)",
      "Exclusion Status"
    ];

    const rows: string[][] = [];

    groupedPatientClaims.forEach(group => {
      group.claims.forEach(c => {
        const isExcl = excludedClaimIds.has(c.id);
        const amt = Number(c.amount || c.totalAmount || 0);
        rows.push([
          `"${group.patientName.replace(/"/g, '""')}"`,
          `"${group.policyNumber.replace(/"/g, '""')}"`,
          `"${c.createdAt?.toDate ? format(c.createdAt.toDate(), 'yyyy-MM-dd') : '2026-08-14'}"`,
          `"${c.department || 'Clinical OPD'}"`,
          `"${c.serviceCode || 'MED-01'}"`,
          `"${(c.description || 'General Medical Service').replace(/"/g, '""')}"`,
          amt.toFixed(2),
          isExcl ? 'EXCLUDED' : 'INCLUDED'
        ]);
      });
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const safePayerName = selectedPayerName.replace(/\s+/g, '_').toUpperCase();
    const periodLabel = format(new Date(), 'yyyy-MM');
    const filename = `Corporate_Claims_Schedule_${safePayerName}_${periodLabel}.csv`;

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Excel (CSV) Export Complete",
      description: `Downloaded schedule for ${activeClaims.length} active claims to ${filename}.`
    });
  };

  const pageIsLoading = isUserLoading || isProfileLoading;
  const userName = user?.displayName || userProfile?.name || 'MARCUS AMOSAH HENAKU';
  const userInitials = userName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'MH';

  if (pageIsLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-16 w-16 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-8 min-h-screen">
        <div className="text-center bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md">
          <ShieldAlert className="h-16 w-16 text-rose-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">Access Denied</h1>
          <p className="text-slate-500 text-sm mt-2">You are not authorized for Institutional Claims Billing.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-6 bg-slate-900 text-white rounded-xl">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-100 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 max-w-7xl mx-auto space-y-6 pb-28">
      
      {/* ========================================== */}
      {/* 1. SIGNATURE DARK HERO COMMAND BANNER      */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800 print:hidden">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <Building2 className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                INSTITUTIONAL CLAIMS SCHEDULE & CORPORATE BILLING ENGINE
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              AGGREGATE CORPORATE CLAIMS, ITEMIZE CLINICAL SERVICES, EXCLUDE DISPUTES, AND LOCK INVOICES INTO ACCOUNTS RECEIVABLE.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 self-start xl:self-auto">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-white text-xs">
              {userInitials}
            </div>
            <div>
              <div className="text-[11px] font-bold text-white tracking-wide uppercase">{userName}</div>
              <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">CHIEF ACCOUNTANT</div>
            </div>
          </div>
        </div>

        {/* Dynamic Telemetry Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative z-10 font-mono">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Target Payer</span>
            <div className="text-lg font-black text-emerald-400 truncate">
              {selectedPayerName.split(' ')[0]}
            </div>
            <span className="text-[10px] font-bold text-slate-400 mt-1 block truncate">{selectedPayerName}</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Active Batch Claims</span>
            <div className="text-2xl font-black text-sky-400">
              {activeClaims.length} Claims
            </div>
            <span className="text-[10px] font-bold text-emerald-400 mt-1 block">Ready for Corporate Billing</span>
          </div>

          <div className="bg-slate-900 border border-rose-500/30 p-4 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 block mb-1">Excluded / Held Back</span>
            <div className="text-2xl font-black text-rose-400">
              {excludedClaimIds.size} Excluded
            </div>
            <span className="text-[10px] font-bold text-rose-400 mt-1 block">
              ₵ {totalExcludedValue.toLocaleString('en-US', { minimumFractionDigits: 2 })} Held in Dispute
            </span>
          </div>

          <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-xl flex flex-col justify-between ring-1 ring-emerald-500/20 shadow-lg">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">Net Schedule Value</span>
            <div className="text-2xl font-black text-emerald-400">
              ₵ {totalScheduleValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] font-bold text-emerald-400 mt-1 block">Lockable Master Invoice Amount</span>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. PARAMETER BAR & QUICK FILTERS           */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="w-full md:w-72 space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 block">Select Corporate Insurer</label>
            <Select onValueChange={setSelectedPayerId} defaultValue="payer-glico" disabled={payersLoading}>
              <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-bold text-xs">
                <SelectValue placeholder="Select Payer..." />
              </SelectTrigger>
              <SelectContent>
                {payers?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 block">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 block">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-4 md:pt-0">
            <button
              type="button"
              onClick={() => applyQuickDateFilter('THIS_MONTH')}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer"
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => applyQuickDateFilter('LAST_MONTH')}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer"
            >
              Last Month
            </button>
            <button
              type="button"
              onClick={() => applyQuickDateFilter('QUARTER')}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer"
            >
              Current Quarter
            </button>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. PATIENT-CENTRIC GROUPED DATA GRID       */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 print:p-0 print:border-0 print:shadow-none">
        
        {/* Printable Letterhead Header */}
        <div className="text-center border-b-2 border-slate-900 dark:border-slate-100 pb-4">
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">
            {selectedPayerName}
          </h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
            CORPORATE CLAIMS SCHEDULE & ITEMIZED CLINICAL SERVICES DOSSIER
          </p>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
            GENERATED ON: {format(new Date(), 'dd MMMM yyyy - hh:mm a')} | FACILITY: GAM MED GENERAL HOSPITAL (ACC-092)
          </p>
        </div>

        {claimsLoading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500 mb-2" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading corporate claims...</span>
          </div>
        ) : groupedPatientClaims.length === 0 ? (
          <div className="p-16 text-center text-slate-400 italic">
            No unbilled corporate claims found for {selectedPayerName}.
          </div>
        ) : (
          <div className="space-y-4">
            {groupedPatientClaims.map(grp => {
              const grpKey = `${grp.patientName}_${grp.policyNumber}`;
              const isExpanded = expandedPatients.has(grpKey);
              const isEntireGroupExcluded = grp.claims.every(c => excludedClaimIds.has(c.id));

              return (
                <div 
                  key={grpKey} 
                  className={`border rounded-2xl overflow-hidden shadow-sm transition-all ${
                    isEntireGroupExcluded 
                      ? 'border-rose-200 bg-rose-50/20 opacity-60' 
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                  }`}
                >
                  {/* Patient Group Header Strip with Accordion & Direct Exclusion Toggle */}
                  <div className="bg-slate-50 dark:bg-slate-800/80 p-4 px-6 flex flex-wrap items-center justify-between gap-4">
                    
                    {/* Left: Patient Name, Policy, Expand Button */}
                    <div 
                      onClick={() => toggleExpandPatient(grpKey)}
                      className="flex items-center gap-3 cursor-pointer select-none"
                    >
                      {isExpanded ? <ChevronDown className="w-5 h-5 text-emerald-600" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black uppercase text-slate-900 dark:text-slate-100">
                            {grp.patientName}
                          </h4>
                          {isEntireGroupExcluded && (
                            <Badge variant="destructive" className="text-[9px] font-black uppercase bg-rose-600 text-white">
                              HELD BACK (DISPUTED)
                            </Badge>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold block">
                          Policy ID: {grp.policyNumber}
                        </span>
                      </div>
                    </div>

                    {/* Right: Claims count, Amount, and Direct Exclusion Switch */}
                    <div className="flex items-center gap-6">
                      <span className="text-xs font-bold text-slate-500">
                        {grp.claims.length} {grp.claims.length === 1 ? 'Clinical Service' : 'Clinical Services'}
                      </span>
                      
                      <span className="text-base font-black font-mono text-slate-900 dark:text-slate-100">
                        ₵ {grp.totalPatientClaim.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>

                      {/* Upgrade 1: Direct Inclusion / Exclusion Toggle on Row */}
                      <div className="flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-700 print:hidden">
                        <label className="text-[10px] font-black uppercase text-slate-400 cursor-pointer">
                          {isEntireGroupExcluded ? 'Excluded' : 'Include'}
                        </label>
                        <input
                          type="checkbox"
                          checked={!isEntireGroupExcluded}
                          onChange={() => toggleExcludePatientGroup(grp)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                          title="Toggle to include or exclude entire patient batch from invoice"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Upgrade 2: Itemized Clinical Services Drill-Down (Expanded View) */}
                  {isExpanded && (
                    <div className="border-t border-slate-200 dark:border-slate-800">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 dark:bg-slate-950 text-slate-500 uppercase text-[9px] tracking-widest border-b border-slate-200 dark:border-slate-800">
                          <tr>
                            <th className="p-3 pl-6">Service Date</th>
                            <th className="p-3">Department</th>
                            <th className="p-3">Service Code</th>
                            <th className="p-3">Clinical Procedure / Item Description</th>
                            <th className="p-3 text-right">Claim Amount (₵)</th>
                            <th className="p-3 text-center print:hidden">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {grp.claims.map(claim => {
                            const isExcluded = excludedClaimIds.has(claim.id);
                            const amt = Number(claim.amount || claim.totalAmount || 0);

                            return (
                              <tr key={claim.id} className={isExcluded ? 'opacity-40 bg-rose-50/30 dark:bg-rose-950/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}>
                                <td className="p-3 pl-6 font-mono font-bold text-slate-600 dark:text-slate-400">
                                  {claim.createdAt?.toDate ? format(claim.createdAt.toDate(), 'yyyy-MM-dd') : '2026-08-14'}
                                </td>
                                <td className="p-3 font-bold text-slate-700 dark:text-slate-300">
                                  {claim.department || 'Clinical OPD'}
                                </td>
                                <td className="p-3 font-mono text-emerald-600 font-bold">
                                  {claim.serviceCode || 'MED-01'}
                                </td>
                                <td className="p-3 font-medium text-slate-800 dark:text-slate-200 italic">
                                  {claim.description || 'General Clinical Service'}
                                </td>
                                <td className="p-3 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                                  ₵ {amt.toFixed(2)}
                                </td>
                                <td className="p-3 text-center print:hidden">
                                  <button
                                    type="button"
                                    onClick={() => toggleExcludeClaim(claim.id)}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                                      isExcluded 
                                        ? 'bg-rose-600 text-white shadow' 
                                        : 'bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500'
                                    }`}
                                  >
                                    {isExcluded ? 'Hold-Back Active' : 'Hold / Exclude'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Schedule Summary Footer */}
        <div className="pt-6 border-t-2 border-slate-900 dark:border-slate-100 flex flex-wrap items-center justify-between gap-4 font-black">
          <div>
            <div className="text-xs uppercase text-slate-500">
              Net Corporate Invoice Value (Excluded Claims Subtracted):
            </div>
            {excludedClaimIds.size > 0 && (
              <span className="text-[11px] font-bold text-rose-500">
                Notice: {excludedClaimIds.size} claims totaling ₵ {totalExcludedValue.toFixed(2)} held back from this batch.
              </span>
            )}
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            ₵ {totalScheduleValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Signature Block */}
        <div className="pt-10 flex justify-between items-center opacity-70 border-t border-dashed border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Verified via GAM Med Corporate Billing Engine</span>
          </div>
          <p className="text-[10px] font-bold text-slate-500 italic">Chief Accountant Authorization: __________________________</p>
        </div>
      </div>

      {/* ========================================== */}
      {/* 4. FLOATING STICKY ACTION BAR              */}
      {/* ========================================== */}
      <div className="fixed bottom-6 right-6 left-6 md:left-auto md:w-auto z-40 bg-slate-950/90 backdrop-blur-md text-white p-4 rounded-2xl border border-slate-800 shadow-2xl flex flex-wrap items-center justify-end gap-3 print:hidden">
        <button
          type="button"
          onClick={handleExportCSV}
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>Export to Excel (CSV)</span>
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer"
        >
          <Printer className="w-4 h-4 text-sky-400" />
          <span>Print Schedule (A4)</span>
        </button>

        <button
          type="button"
          onClick={handleGenerateCorporateInvoice}
          disabled={isGeneratingInvoice || activeClaims.length === 0}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg"
        >
          {isGeneratingInvoice ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
          <span>GENERATE CORPORATE INVOICE</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 5. INVOICE GENERATED CONFIRMATION & AR DISPATCH MODAL                      */}
      {/* ========================================================================= */}
      <Dialog open={!!generatedInvoiceModal} onOpenChange={(open) => !open && setGeneratedInvoiceModal(null)}>
        <DialogContent className="max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-2xl">
          <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 text-emerald-600">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">
                  CORPORATE MASTER INVOICE GENERATED & LOCKED
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-medium">
                  Ref: <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{generatedInvoiceModal?.invoiceId}</span> | Insurer: <span className="font-bold text-slate-900 dark:text-slate-100">{generatedInvoiceModal?.payerName}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            
            {/* Invoice Summary Box */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Master Invoice Number:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{generatedInvoiceModal?.invoiceId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Locked Patient Claims:</span>
                <span className="font-bold text-emerald-600">{generatedInvoiceModal?.claimCount} Claims Billed</span>
              </div>
              {Number(generatedInvoiceModal?.excludedCount || 0) > 0 && (
                <div className="flex justify-between text-rose-500">
                  <span>Excluded Disputed Claims:</span>
                  <span className="font-bold">{generatedInvoiceModal?.excludedCount} Held Back (₵ {generatedInvoiceModal?.excludedAmount.toFixed(2)})</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-sm font-black">
                <span className="text-slate-900 dark:text-slate-100">Total Invoiced Amount:</span>
                <span className="text-emerald-600">₵ {generatedInvoiceModal?.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Accounting & AR Roll-Up Notice */}
            <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/50 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300 text-[11px]">
                <ShieldCheck className="w-4 h-4" />
                <span>Automated AR Matrix & General Ledger Update:</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                • ₵ {generatedInvoiceModal?.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} pushed into the <strong>Current (0-30 Days)</strong> bucket in the <Link href="/finance/receivables/ledger" className="text-emerald-600 underline font-bold">AR Aging Matrix</Link>.<br />
                • Journal Voucher posted: <strong>DR 1200 (Accounts Receivable) / CR 4050 (Unbilled Corporate Revenue)</strong>.
              </p>
            </div>

          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setGeneratedInvoiceModal(null)} className="rounded-xl">
              Close
            </Button>

            <Button 
              onClick={() => router.push('/finance/receivables/ledger')} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase rounded-xl flex items-center gap-1.5"
            >
              <span>View in AR Aging Ledger</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
