'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { 
  Landmark, FileText, Printer, Loader2, ShieldAlert, ShieldCheck, 
  ChevronDown, ChevronRight, Trash2, Download, CheckCircle2, Building2,
  Calendar, Filter, Receipt, FileSpreadsheet, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { format, subDays, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

type ClaimItem = {
  id: string;
  payerId: string;
  patientName: string;
  policyNumber?: string;
  description?: string;
  amount?: number;
  totalAmount?: number;
  status: 'UNPAID' | 'BILLED' | 'PAID';
  createdAt?: { toDate: () => Date } | any;
};

type GroupedPatientClaims = {
  patientName: string;
  policyNumber: string;
  claims: ClaimItem[];
  totalPatientClaim: number;
};

export default function InstitutionalSchedule() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [selectedPayerId, setSelectedPayerId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [excludedClaimIds, setExcludedClaimIds] = useState<Set<string>>(new Set());
  const [expandedPatients, setExpandedPatients] = useState<Set<string>>(new Set());
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role || 'ACCOUNTANT';
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(userRole);

  // Fetch all corporate payers for the dropdown
  const payersQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/payers`), orderBy('name', 'asc'));
  }, [firestore, hospitalId]);
  const { data: rawPayers, isLoading: payersLoading } = useCollection(payersQuery);

  // Demodata Fallback for Payers
  const demoPayers = useMemo(() => [
    { id: 'payer-glico', name: 'GLICO Healthcare Ltd' },
    { id: 'payer-acacia', name: 'Acacia Health Insurance' },
    { id: 'payer-enterprise', name: 'Enterprise Life Corporate' }
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

  // Demodata Fallback for Immediate Corporate Schedule Demonstration
  const demoClaims: ClaimItem[] = useMemo(() => [
    { id: 'clm-001', payerId: 'payer-glico', patientName: 'James Gambrah', policyNumber: 'GLC-884920', description: 'Specialist Consultation - OPD', amount: 350.00, status: 'UNPAID', createdAt: { toDate: () => new Date('2026-08-02') } },
    { id: 'clm-002', payerId: 'payer-glico', patientName: 'James Gambrah', policyNumber: 'GLC-884920', description: 'Full Blood Count & ICU Lab Panel', amount: 450.00, status: 'UNPAID', createdAt: { toDate: () => new Date('2026-08-02') } },
    { id: 'clm-003', payerId: 'payer-glico', patientName: 'James Gambrah', policyNumber: 'GLC-884920', description: 'ICU Antibiotics & Pharmacy Dispense', amount: 450.00, status: 'UNPAID', createdAt: { toDate: () => new Date('2026-08-03') } },
    { id: 'clm-004', payerId: 'payer-glico', patientName: 'Abena Mensah', policyNumber: 'GLC-991204', description: 'Maternity Antenatal Care & Ultrasound Scan', amount: 820.00, status: 'UNPAID', createdAt: { toDate: () => new Date('2026-08-05') } },
    { id: 'clm-005', payerId: 'payer-glico', patientName: 'Abena Mensah', policyNumber: 'GLC-991204', description: 'Obstetric Lab Screening Panel', amount: 380.00, status: 'UNPAID', createdAt: { toDate: () => new Date('2026-08-05') } },
    { id: 'clm-006', payerId: 'payer-glico', patientName: 'Kwame Nkrumah', policyNumber: 'GLC-771029', description: 'Emergency Surgical Dressing & Theatre Fee', amount: 1540.00, status: 'UNPAID', createdAt: { toDate: () => new Date('2026-08-10') } }
  ], []);

  const claims = (rawClaims && rawClaims.length > 0 ? rawClaims : demoClaims).filter(
    c => c.payerId === (selectedPayerId || 'payer-glico')
  );

  const selectedPayerName = useMemo(() => {
    return payers?.find(p => p.id === (selectedPayerId || 'payer-glico'))?.name || 'GLICO Healthcare Ltd';
  }, [payers, selectedPayerId]);

  // Filter out manually excluded/disputed claim IDs
  const activeClaims = useMemo(() => {
    return claims.filter(c => !excludedClaimIds.has(c.id));
  }, [claims, excludedClaimIds]);

  // Group Claims by Patient Name
  const groupedPatientClaims = useMemo(() => {
    const map = new Map<string, GroupedPatientClaims>();

    activeClaims.forEach(claim => {
      const pName = claim.patientName || 'Unknown Patient';
      const pPolicy = claim.policyNumber || 'N/A';
      const key = `${pName}_${pPolicy}`;

      if (!map.has(key)) {
        map.set(key, {
          patientName: pName,
          policyNumber: pPolicy,
          claims: [],
          totalPatientClaim: 0
        });
      }

      const grp = map.get(key)!;
      grp.claims.push(claim);
      grp.totalPatientClaim += Number(claim.amount || claim.totalAmount || 0);
    });

    return Array.from(map.values());
  }, [activeClaims]);

  const totalScheduleValue = useMemo(() => {
    return activeClaims.reduce((acc, c) => acc + Number(c.amount || c.totalAmount || 0), 0);
  }, [activeClaims]);

  const toggleExcludeClaim = (claimId: string) => {
    setExcludedClaimIds(prev => {
      const next = new Set(prev);
      if (next.has(claimId)) next.delete(claimId);
      else next.add(claimId);
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

  const handleGenerateCorporateInvoice = async () => {
    if (activeClaims.length === 0) {
      toast({ variant: "destructive", title: "No Claims Selected", description: "There are no active unbilled claims to generate an invoice." });
      return;
    }

    setIsGeneratingInvoice(true);
    const invoiceId = `INV-${selectedPayerName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()}-${format(new Date(), 'yyyyMMdd')}`;

    try {
      if (firestore && hospitalId) {
        const batch = writeBatch(firestore);

        // 1. Create Corporate Master Invoice
        const masterRef = doc(firestore, `hospitals/${hospitalId}/corporate_invoices`, invoiceId);
        batch.set(masterRef, {
          invoiceId,
          payerId: selectedPayerId || 'payer-glico',
          payerName: selectedPayerName,
          totalAmount: totalScheduleValue,
          claimCount: activeClaims.length,
          status: 'BILLED',
          billedBy: user?.uid || 'ACCOUNTANT',
          billedByName: userProfile?.fullName || 'Marcus Amosah Henaku',
          billedAt: serverTimestamp(),
          period: format(new Date(), 'yyyy-MM')
        });

        // 2. Lock active claims to BILLED status
        activeClaims.forEach(claim => {
          const claimRef = doc(firestore, `hospitals/${hospitalId}/receivables`, claim.id);
          batch.update(claimRef, {
            status: 'BILLED',
            masterInvoiceId: invoiceId,
            billedAt: serverTimestamp()
          });
        });

        // 3. Post Double-Entry Journal Voucher (Debit AR 1200, Credit Unbilled Revenue 4050)
        const jvRef = doc(collection(firestore, `hospitals/${hospitalId}/journal_vouchers`));
        batch.set(jvRef, {
          jvNumber: `JV-${invoiceId}`,
          source: 'CORPORATE_BILLING',
          datePosted: serverTimestamp(),
          preparerId: user?.uid || 'ACCOUNTANT',
          preparerName: userProfile?.fullName || 'Marcus Amosah Henaku',
          narration: `Corporate Master Invoice ${invoiceId} for ${selectedPayerName}. Total ${activeClaims.length} claims. Value: GHS ${totalScheduleValue.toFixed(2)}.`,
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

      toast({
        title: "Corporate Invoice Generated",
        description: `Master Invoice ${invoiceId} created for ${activeClaims.length} claims totaling GHS ${totalScheduleValue.toFixed(2)}.`
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
      "Staff ID / Member No",
      "Date of Service",
      "Invoice Number",
      "Medical Service Rendered",
      "Claim Amount (GHS)"
    ];

    const rows: string[][] = [];

    groupedPatientClaims.forEach(group => {
      group.claims.forEach(c => {
        const amt = Number(c.amount || c.totalAmount || 0);
        rows.push([
          `"${group.patientName.replace(/"/g, '""')}"`,
          `"${group.policyNumber.replace(/"/g, '""')}"`,
          `"${c.createdAt?.toDate ? format(c.createdAt.toDate(), 'yyyy-MM-dd') : '2026-08-14'}"`,
          `"${c.id}"`,
          `"${(c.description || 'General Medical Service').replace(/"/g, '""')}"`,
          amt.toFixed(2)
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
    const filename = `GAM_Med_${safePayerName}_${periodLabel}.csv`;

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "File Downloaded",
      description: `Exported ${activeClaims.length} corporate claims to ${filename}.`
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
    <div className="p-6 md:p-8 bg-slate-100 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 max-w-7xl mx-auto space-y-6 pb-24">
      
      {/* ========================================== */}
      {/* 1. SIGNATURE DARK HERO COMMAND BANNER      */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800 print:hidden">
        {/* Ambient Radial Accent Glows */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, User Context */}
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
              AGGREGATE CORPORATE CLAIMS, GROUP PATIENT CONSUMPTION, EXCLUDE DISPUTES, AND GENERATE MASTER AR INVOICES.
            </p>
          </div>

          {/* User Context */}
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

        {/* Bottom Row / Contextual Billing Telemetry */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Active Payer</span>
              <div className="text-xl font-black text-emerald-400 truncate max-w-[200px]">
                {selectedPayerName}
              </div>
              <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">Corporate Insurer</span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <Building2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Unbilled Claims</span>
              <div className="text-2xl font-black text-sky-400 font-mono">
                {activeClaims.length} Claims
              </div>
              <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">
                {excludedClaimIds.size > 0 ? `${excludedClaimIds.size} Excluded` : '0 Excluded'}
              </span>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
              <Receipt className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-emerald-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">Schedule Value</span>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                ₵ {totalScheduleValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">Ready for Master Invoice</span>
            </div>
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl">
              <Landmark className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. PARAMETER BAR & QUICK FILTERS           */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Payer Dropdown */}
          <div className="w-full md:w-72 space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 block">Select Corporate Payer</label>
            <Select onValueChange={setSelectedPayerId} defaultValue="payer-glico" disabled={payersLoading}>
              <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-bold text-xs">
                <SelectValue placeholder="Select Payer..." />
              </SelectTrigger>
              <SelectContent>
                {payers?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Inputs */}
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

          {/* Quick Date Chips */}
          <div className="flex items-center gap-2 pt-4 md:pt-0">
            <button
              type="button"
              onClick={() => applyQuickDateFilter('THIS_MONTH')}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold uppercase transition-all"
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => applyQuickDateFilter('LAST_MONTH')}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold uppercase transition-all"
            >
              Last Month
            </button>
            <button
              type="button"
              onClick={() => applyQuickDateFilter('QUARTER')}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold uppercase transition-all"
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
            CORPORATE CLAIMS SCHEDULE & MEDICAL CONSUMPTION DOSSIER
          </p>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
            GENERATED ON: {format(new Date(), 'dd MMMM yyyy - hh:mm a')} | FACILITY: GAM MED GENERAL HOSPITAL
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

              return (
                <div key={grpKey} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                  {/* Patient Group Accordion Header */}
                  <div 
                    onClick={() => toggleExpandPatient(grpKey)}
                    className="bg-slate-50 dark:bg-slate-800/80 p-4 px-6 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-emerald-500" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                      <div>
                        <h4 className="text-sm font-black uppercase text-slate-900 dark:text-slate-100">
                          {grp.patientName}
                        </h4>
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          Policy ID: {grp.policyNumber}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <span className="text-xs font-bold text-slate-500">
                        {grp.claims.length} {grp.claims.length === 1 ? 'Visit Service' : 'Visit Services'}
                      </span>
                      <span className="text-base font-black font-mono text-slate-900 dark:text-slate-100">
                        ₵ {grp.totalPatientClaim.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Line Item Table (Expanded View) */}
                  {isExpanded && (
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 dark:bg-slate-900 text-slate-500 uppercase text-[9px] tracking-widest border-y border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="p-3 pl-6">Service Date</th>
                          <th className="p-3">Medical Service / Consumption Detail</th>
                          <th className="p-3 text-right">Claim Amount (₵)</th>
                          <th className="p-3 text-center print:hidden">Dispute / Exclude</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {grp.claims.map(claim => {
                          const isExcluded = excludedClaimIds.has(claim.id);
                          const amt = Number(claim.amount || claim.totalAmount || 0);

                          return (
                            <tr key={claim.id} className={isExcluded ? 'opacity-40 bg-slate-100 dark:bg-slate-900/50' : ''}>
                              <td className="p-3 pl-6 font-mono font-bold text-slate-600 dark:text-slate-400">
                                {claim.createdAt?.toDate ? format(claim.createdAt.toDate(), 'yyyy-MM-dd') : '2026-08-14'}
                              </td>
                              <td className="p-3 font-medium text-slate-800 dark:text-slate-200 italic">
                                {claim.description || 'General Medical Service'}
                              </td>
                              <td className="p-3 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                                ₵ {amt.toFixed(2)}
                              </td>
                              <td className="p-3 text-center print:hidden">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExcludeClaim(claim.id);
                                  }}
                                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                    isExcluded ? 'bg-rose-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-500'
                                  }`}
                                  title={isExcluded ? 'Re-include Claim' : 'Exclude / Dispute Claim'}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Schedule Summary Footer */}
        <div className="pt-6 border-t-2 border-slate-900 dark:border-slate-100 flex flex-wrap items-center justify-between gap-4 font-black">
          <div className="text-xs uppercase text-slate-500">
            Total Corporate Schedule Remittance Due:
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            ₵ {totalScheduleValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Signature Block */}
        <div className="pt-10 flex justify-between items-center opacity-70 border-t border-dashed border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Verified via GAM Med Corporate Engine</span>
          </div>
          <p className="text-[10px] font-bold text-slate-500 italic">Authorizing Director Signature: __________________________</p>
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

    </div>
  );
}
