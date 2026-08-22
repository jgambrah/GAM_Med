'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, AlertCircle, Calendar, 
  ArrowUpRight, Filter, Receipt, Search, Loader2, ShieldAlert,
  Landmark, Clock, AlertTriangle, CheckCircle2, Building2, ShieldCheck, 
  ChevronRight, Download, Send, DollarSign, FileText, Check, X, Mail,
  Printer, Sparkles, UserCheck, Stethoscope, Ban, Eye, ArrowRight,
  Split, Scale, HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export interface PayerAgingRow {
  payerId: string;
  payerName: string;
  contactEmail: string;
  contactPhone: string;
  current: number; // 0-30 days
  days30: number; // 31-60 days
  days60: number; // 61-90 days
  days90Plus: number; // 90+ days
  creditLimit: number;
}

export interface PatientClaimItem {
  id: string;
  claimRef: string;
  patientName: string;
  memberNumber: string;
  encounterDate: string;
  department: string;
  grossAmount: number;
  copayDeducted: number;
  netPayable: number;
  agingBucket: '0-30 Days' | '31-60 Days' | '61-90 Days' | '90+ Days';
  status: 'PENDING_PAYER_REMITTANCE' | 'RECONCILED' | 'DISPUTED';
}

export default function ARAgingReport() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Modals state
  const [selectedPayerForReconcile, setSelectedPayerForReconcile] = useState<PayerAgingRow | null>(null);
  const [selectedPayerForStatement, setSelectedPayerForStatement] = useState<PayerAgingRow | null>(null);
  const [selectedClaimForSettlement, setSelectedClaimForSettlement] = useState<PatientClaimItem | null>(null);
  
  // Remittance Settlement Slip State
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [amountDisallowed, setAmountDisallowed] = useState<number>(0);
  const [destinationBank, setDestinationBank] = useState('1001 - GCB Operations Account');
  const [disallowanceReason, setDisallowanceReason] = useState('Non-covered formulary drug item');
  const [isSettling, setIsSettling] = useState(false);

  const [isSendingStatement, setIsSendingStatement] = useState(false);
  const [dunningLevel, setDunningLevel] = useState<'Standard Reminder' | 'Urgent Overdue Notice' | 'Final Demand'>('Standard Reminder');
  const [reconciliationFilter, setReconciliationFilter] = useState<'ALL' | 'CRITICAL' | 'PENDING'>('ALL');

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role || 'ACCOUNTANT';
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN', 'FINANCE_CONTROLLER'].includes(userRole);

  // Firestore Receivables Query
  const receivablesQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/receivables`),
      where("status", "==", "UNPAID")
    );
  }, [firestore, hospitalId]);
  const { data: rawReceivables, isLoading: areReceivablesLoading } = useCollection(receivablesQuery);

  // Institutional Aging Matrix Data
  const mockArData: PayerAgingRow[] = useMemo(() => [
    { 
      payerId: 'PAY-NHIS', 
      payerName: 'National Health Insurance Authority (NHIA)', 
      contactEmail: 'provider.claims@nhia.gov.gh',
      contactPhone: '+233 302 233 788',
      current: 45000.00, 
      days30: 85000.00, 
      days60: 120000.00, 
      days90Plus: 35000.00,
      creditLimit: 500000.00
    },
    { 
      payerId: 'PAY-GLICO', 
      payerName: 'GLICO Healthcare Ltd', 
      contactEmail: 'claims.provider@glicohealthcare.com',
      contactPhone: '+233 302 246 142',
      current: 15000.00, 
      days30: 5000.00, 
      days60: 0.00, 
      days90Plus: 1200.00,
      creditLimit: 50000.00
    },
    { 
      payerId: 'PAY-ACACIA', 
      payerName: 'Acacia Health Insurance Ltd', 
      contactEmail: 'finance.settlements@acacia.com.gh',
      contactPhone: '+233 302 770 098',
      current: 22000.00, 
      days30: 0.00, 
      days60: 0.00, 
      days90Plus: 0.00,
      creditLimit: 60000.00
    },
    { 
      payerId: 'PAY-KNUST', 
      payerName: 'KNUST Staff Medical Scheme', 
      contactEmail: 'medicalscheme@knust.edu.gh',
      contactPhone: '+233 322 060 021',
      current: 8500.00, 
      days30: 4200.00, 
      days60: 1500.00, 
      days90Plus: 800.00,
      creditLimit: 30000.00
    },
    { 
      payerId: 'PAY-APEX', 
      payerName: 'Apex Health Mutual Scheme', 
      contactEmail: 'provider.relations@apexhealth.com.gh',
      contactPhone: '+233 302 910 445',
      current: 12400.00, 
      days30: 3100.00, 
      days60: 0.00, 
      days90Plus: 8500.00,
      creditLimit: 35000.00
    }
  ], []);

  // Compute Grouped Payer Aging Rows
  const arData: PayerAgingRow[] = useMemo(() => {
    if (!rawReceivables || rawReceivables.length === 0) return mockArData;

    const map = new Map<string, PayerAgingRow>();
    const now = new Date('2026-08-14');

    rawReceivables.forEach((r: any) => {
      const pName = r.payerName || 'NHIA National Scheme';
      const pId = r.payerId || `PAY-${pName.replace(/\s+/g, '-').toUpperCase()}`;

      if (!map.has(pId)) {
        map.set(pId, { 
          payerId: pId, 
          payerName: pName, 
          contactEmail: r.contactEmail || 'billing@payer.com.gh',
          contactPhone: r.contactPhone || '+233 302 000 000',
          current: 0, 
          days30: 0, 
          days60: 0, 
          days90Plus: 0,
          creditLimit: Number(r.creditLimit || 100000)
        });
      }

      const row = map.get(pId)!;
      let createdDate = now;
      if (r.createdAt && typeof r.createdAt.toDate === 'function') {
        createdDate = r.createdAt.toDate();
      } else if (r.createdAt) {
        createdDate = new Date(r.createdAt);
      }

      const diffTime = Math.abs(now.getTime() - createdDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const amt = Number(r.amount || 0);

      if (diffDays <= 30) row.current += amt;
      else if (diffDays <= 60) row.days30 += amt;
      else if (diffDays <= 90) row.days60 += amt;
      else row.days90Plus += amt;
    });

    return Array.from(map.values());
  }, [rawReceivables, mockArData]);

  const filteredArData = useMemo(() => {
    if (!searchQuery.trim()) return arData;
    const q = searchQuery.toLowerCase();
    return arData.filter(r => r.payerName.toLowerCase().includes(q) || r.payerId.toLowerCase().includes(q));
  }, [arData, searchQuery]);

  // Header Totals & Risk Metrics
  const totals = useMemo(() => {
    return arData.reduce((acc, row) => {
      const rowSum = row.current + row.days30 + row.days60 + row.days90Plus;
      return {
        current: acc.current + row.current,
        days30: acc.days30 + row.days30,
        days60: acc.days60 + row.days60,
        days90Plus: acc.days90Plus + row.days90Plus,
        total: acc.total + rowSum
      };
    }, { current: 0, days30: 0, days60: 0, days90Plus: 0, total: 0 });
  }, [arData]);

  // Simulated Individual Claims for Sub-Ledger Reconciliation
  const [claimsState, setClaimsState] = useState<Record<string, PatientClaimItem[]>>({
    'PAY-NHIS': [
      { id: 'CLM-01', claimRef: 'NHIA/MMH/2026/0942', patientName: 'Kwame Mensah', memberNumber: 'NHIS-84920194', encounterDate: '2026-08-04', department: 'Emergency & Triage', grossAmount: 1850.00, copayDeducted: 0, netPayable: 1850.00, agingBucket: '0-30 Days', status: 'PENDING_PAYER_REMITTANCE' },
      { id: 'CLM-02', claimRef: 'NHIA/MMH/2026/0881', patientName: 'Abena Osei', memberNumber: 'NHIS-19402941', encounterDate: '2026-07-18', department: 'Maternity Ward', grossAmount: 4200.00, copayDeducted: 0, netPayable: 4200.00, agingBucket: '31-60 Days', status: 'PENDING_PAYER_REMITTANCE' },
      { id: 'CLM-03', claimRef: 'NHIA/MMH/2026/0712', patientName: 'Kofi Boateng', memberNumber: 'NHIS-77491023', encounterDate: '2026-06-11', department: 'Main Surgical Theater', grossAmount: 14500.00, copayDeducted: 0, netPayable: 14500.00, agingBucket: '61-90 Days', status: 'PENDING_PAYER_REMITTANCE' },
      { id: 'CLM-04', claimRef: 'NHIA/MMH/2026/0540', patientName: 'Grace Ansah', memberNumber: 'NHIS-33019482', encounterDate: '2026-04-29', department: 'Renal Dialysis Unit', grossAmount: 8500.00, copayDeducted: 0, netPayable: 8500.00, agingBucket: '90+ Days', status: 'PENDING_PAYER_REMITTANCE' }
    ],
    'PAY-GLICO': [
      { id: 'CLM-11', claimRef: 'GLI/MMH/2026/0411', patientName: 'Ebenezer Quaye', memberNumber: 'GLI-POL-9921', encounterDate: '2026-08-08', department: 'Specialist Outpatient (OPD)', grossAmount: 2400.00, copayDeducted: 200.00, netPayable: 2200.00, agingBucket: '0-30 Days', status: 'PENDING_PAYER_REMITTANCE' },
      { id: 'CLM-12', claimRef: 'GLI/MMH/2026/0398', patientName: 'Sandra Darko', memberNumber: 'GLI-POL-4410', encounterDate: '2026-07-22', department: 'Radiology / CT Scan', grossAmount: 3000.00, copayDeducted: 0, netPayable: 3000.00, agingBucket: '31-60 Days', status: 'PENDING_PAYER_REMITTANCE' },
      { id: 'CLM-13', claimRef: 'GLI/MMH/2026/0122', patientName: 'Josephine Agyei', memberNumber: 'GLI-POL-1082', encounterDate: '2026-04-10', department: 'ICU High Dependency', grossAmount: 1200.00, copayDeducted: 0, netPayable: 1200.00, agingBucket: '90+ Days', status: 'DISPUTED' }
    ],
    'PAY-KNUST': [
      { id: 'CLM-KN-01', claimRef: 'PAY-KNUST/2026/001', patientName: 'Prof. Kwabena Asante', memberNumber: 'KNUST-MED-0921', encounterDate: '2026-08-05', department: 'Executive VIP Ward', grossAmount: 8500.00, copayDeducted: 0, netPayable: 8500.00, agingBucket: '0-30 Days', status: 'PENDING_PAYER_REMITTANCE' },
      { id: 'CLM-KN-02', claimRef: 'PAY-KNUST/2026/002', patientName: 'Evelyn Addo', memberNumber: 'KNUST-MED-4481', encounterDate: '2026-07-14', department: 'Pharmacy & Infusion', grossAmount: 4200.00, copayDeducted: 0, netPayable: 4200.00, agingBucket: '31-60 Days', status: 'PENDING_PAYER_REMITTANCE' }
    ],
    'PAY-APEX': [
      { id: 'CLM-21', claimRef: 'APX/MMH/2026/0091', patientName: 'Dr. Michael Taylor', memberNumber: 'APX-MUT-8842', encounterDate: '2026-08-01', department: 'Executive Health Check', grossAmount: 3500.00, copayDeducted: 350.00, netPayable: 3150.00, agingBucket: '0-30 Days', status: 'PENDING_PAYER_REMITTANCE' },
      { id: 'CLM-22', claimRef: 'APX/MMH/2026/0014', patientName: 'Esther Bruce', memberNumber: 'APX-MUT-3310', encounterDate: '2026-03-14', department: 'Orthopedic Surgery', grossAmount: 8500.00, copayDeducted: 0, netPayable: 8500.00, agingBucket: '90+ Days', status: 'PENDING_PAYER_REMITTANCE' }
    ]
  });

  // Individual Claims list for selected payer
  const activeClaims = useMemo(() => {
    if (!selectedPayerForReconcile) return [];
    const base = claimsState[selectedPayerForReconcile.payerId] || [
      { id: 'CLM-GEN-1', claimRef: `${selectedPayerForReconcile.payerId}/2026/001`, patientName: 'General Patient Batch', memberNumber: 'MEM-9901', encounterDate: '2026-08-02', department: 'General Clinical', grossAmount: selectedPayerForReconcile.current, copayDeducted: 0, netPayable: selectedPayerForReconcile.current, agingBucket: '0-30 Days' as const, status: 'PENDING_PAYER_REMITTANCE' as const }
    ];

    if (reconciliationFilter === 'CRITICAL') return base.filter(c => c.agingBucket === '90+ Days');
    if (reconciliationFilter === 'PENDING') return base.filter(c => c.status === 'PENDING_PAYER_REMITTANCE');
    return base;
  }, [selectedPayerForReconcile, claimsState, reconciliationFilter]);

  // Open Remittance Slip Modal for a specific claim
  const handleOpenSettlementModal = (claim: PatientClaimItem) => {
    setSelectedClaimForSettlement(claim);
    setAmountReceived(claim.netPayable);
    setAmountDisallowed(0);
    setDestinationBank('1001 - GCB Operations Account');
    setDisallowanceReason('Non-covered formulary drug item');
  };

  // Handle Dynamic Remittance Calculation
  const handleAmountReceivedChange = (val: number) => {
    setAmountReceived(val);
    if (selectedClaimForSettlement) {
      const diff = Math.max(0, selectedClaimForSettlement.netPayable - val);
      setAmountDisallowed(diff);
    }
  };

  // Execute Multi-Leg Remittance Journal Entry
  const handleExecuteRemittanceJV = async () => {
    if (!selectedClaimForSettlement || !selectedPayerForReconcile) return;
    setIsSettling(true);

    try {
      await new Promise(res => setTimeout(res, 900));

      const totalClaim = selectedClaimForSettlement.netPayable;
      const recAmt = Number(amountReceived || 0);
      const disAmt = Number(amountDisallowed || 0);

      // Verify Zero-Variance Math
      if (Math.abs((recAmt + disAmt) - totalClaim) > 0.05) {
        toast({
          variant: "destructive",
          title: "Math Variance Error",
          description: `Total of Received (₵${recAmt}) + Disallowed (₵${disAmt}) must equal Claim Balance (₵${totalClaim}).`
        });
        setIsSettling(false);
        return;
      }

      // Update in-memory claim status to RECONCILED
      const payerKey = selectedPayerForReconcile.payerId;
      setClaimsState(prev => ({
        ...prev,
        [payerKey]: (prev[payerKey] || []).map(c => 
          c.id === selectedClaimForSettlement.id 
            ? { ...c, status: 'RECONCILED' as const } 
            : c
        )
      }));

      toast({
        title: "Multi-Leg Remittance JV Posted",
        description: `Posted GHS ${recAmt.toFixed(2)} to ${destinationBank.split(' - ')[0]} and GHS ${disAmt.toFixed(2)} to Disallowed Claims (GL 5205). Claim ${selectedClaimForSettlement.claimRef} cleared.`
      });

      setSelectedClaimForSettlement(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Settlement Failed", description: e.message });
    } finally {
      setIsSettling(false);
    }
  };

  // Handle Automated Statement Send
  const handleSendStatement = async () => {
    if (!selectedPayerForStatement) return;
    setIsSendingStatement(true);

    try {
      await new Promise(res => setTimeout(res, 1200));

      const totalAmt = selectedPayerForStatement.current + selectedPayerForStatement.days30 + selectedPayerForStatement.days60 + selectedPayerForStatement.days90Plus;

      toast({
        title: "Statement of Account Dispatched",
        description: `${dunningLevel} with Consolidated SOA (₵ ${totalAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}) emailed to ${selectedPayerForStatement.contactEmail}.`
      });

      setSelectedPayerForStatement(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Dispatch Failed", description: e.message });
    } finally {
      setIsSendingStatement(false);
    }
  };

  // Export CSV
  const handleExportMasterReport = () => {
    setIsExporting(true);
    try {
      const headers = ['Payer ID', 'Payer Profile Name', 'Contact Email', 'Current (0-30)', '31-60 Days', '61-90 Days', '90+ Days', 'Total Balance (GHS)', 'Critical Debt Ratio (%)'];
      const rows = arData.map(r => {
        const total = r.current + r.days30 + r.days60 + r.days90Plus;
        const critRatio = total > 0 ? ((r.days90Plus / total) * 100).toFixed(1) : '0.0';
        return [
          `"${r.payerId}"`,
          `"${r.payerName}"`,
          `"${r.contactEmail}"`,
          r.current.toFixed(2),
          r.days30.toFixed(2),
          r.days60.toFixed(2),
          r.days90Plus.toFixed(2),
          total.toFixed(2),
          `${critRatio}%`
        ];
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Institutional_AR_Aging_Matrix_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({ title: "Master Report Exported", description: "Consolidated institutional AR matrix downloaded as CSV." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Export Failed", description: e.message });
    } finally {
      setIsExporting(false);
    }
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
          <p className="text-slate-500 text-sm mt-2">You are not authorized to view the Institutional Receivables Ledger.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-6 bg-slate-900 text-white rounded-xl">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-100 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* ========================================== */}
      {/* 1. SIGNATURE DARK HERO COMMAND BANNER      */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <Receipt className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                INSTITUTIONAL AR & CLAIMS AGING MATRIX
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              REVENUE CYCLE MONITORING, IMPAIRMENT PROVISIONING, AND AUTOMATED STATEMENT OF ACCOUNT DISPATCH.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 self-start xl:self-auto">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-white text-xs">
              {userInitials}
            </div>
            <div>
              <div className="text-[11px] font-bold text-white tracking-wide uppercase">{userName}</div>
              <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">TREASURY & REVENUE CYCLE</div>
            </div>
          </div>
        </div>

        {/* Top KPI Telemetry: Textbook Aging Buckets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 relative z-10 font-mono">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Receivables</span>
            <div className="text-2xl font-black text-white">
              ₵ {totals.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] font-bold text-emerald-400 mt-1 block">5 Active Corporate Payers</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Current (0-30 Days)</span>
            <div className="text-2xl font-black text-emerald-400">
              ₵ {totals.current.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] font-bold text-slate-400 mt-1 block">Standard Credit Period</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">31-60 Days</span>
            <div className="text-2xl font-black text-sky-400">
              ₵ {totals.days30.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] font-bold text-slate-400 mt-1 block">Reminder Notice Queue</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">61-90 Days</span>
            <div className="text-2xl font-black text-amber-400">
              ₵ {totals.days60.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] font-bold text-amber-400 mt-1 block">Urgent Follow-Up Zone</span>
          </div>

          <div className="bg-slate-900 border border-rose-500/30 p-4 rounded-xl flex flex-col justify-between ring-1 ring-rose-500/20 shadow-lg">
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 block mb-1">Critical Debt (&gt;90 Days)</span>
            <div className="text-2xl font-black text-rose-400 animate-pulse">
              ₵ {totals.days90Plus.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] font-bold text-rose-400 mt-1 block">Impairment Risk Zone</span>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. ACTION BAR & MASTER REPORT EXPORT       */}
      {/* ========================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-emerald-500" />
          <div>
            <h2 className="text-sm font-black uppercase text-slate-900 dark:text-slate-100">
              Institutional Debt Matrix by Payer Profile
            </h2>
            <p className="text-xs text-slate-500 font-medium">Click [RECONCILE] to inspect underlying patient claims or [SEND STATEMENT] to dispatch dunning notices.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search payer profile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          <button
            type="button"
            onClick={handleExportMasterReport}
            disabled={isExporting}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow cursor-pointer flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>EXPORT MATRIX CSV</span>
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. AGING MATRIX TABLE & GRAND TOTALS       */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {areReceivablesLoading ? (
          <div className="p-16 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500 mb-2" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Calculating AR aging schedule...</span>
          </div>
        ) : filteredArData.length === 0 ? (
          <div className="p-16 text-center text-slate-400 italic">
            No institutional receivables found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900 text-white uppercase text-[9px] tracking-widest">
                <tr>
                  <th className="p-4">Payer Profile</th>
                  <th className="p-4 text-right">Current (0-30)</th>
                  <th className="p-4 text-right">31-60 Days</th>
                  <th className="p-4 text-right">61-90 Days</th>
                  <th className="p-4 text-right text-rose-400">90+ Days (Critical)</th>
                  <th className="p-4 text-right bg-slate-800">Total Outstanding</th>
                  <th className="p-4 text-center">Impairment Risk</th>
                  <th className="p-4 text-center">Collection Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
                {filteredArData.map(row => {
                  const rowTotal = row.current + row.days30 + row.days60 + row.days90Plus;
                  const criticalRatio = rowTotal > 0 ? (row.days90Plus / rowTotal) * 100 : 0;
                  const isHighRisk = criticalRatio >= 25.0;

                  return (
                    <tr key={row.payerId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group">
                      <td className="p-4">
                        <p className="font-black text-slate-900 dark:text-slate-100 uppercase">{row.payerName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                            {row.payerId}
                          </span>
                          <span className="text-[10px] text-slate-400">• {row.contactEmail}</span>
                        </div>
                      </td>

                      <td className="p-4 text-right font-mono text-slate-700 dark:text-slate-300">
                        {row.current > 0 ? `₵ ${row.current.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                      </td>

                      <td className="p-4 text-right font-mono text-slate-700 dark:text-slate-300">
                        {row.days30 > 0 ? `₵ ${row.days30.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                      </td>

                      <td className="p-4 text-right font-mono text-amber-600 font-black">
                        {row.days60 > 0 ? `₵ ${row.days60.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                      </td>

                      <td className="p-4 text-right font-mono text-rose-600 dark:text-rose-400 font-black bg-rose-50/50 dark:bg-rose-950/30">
                        {row.days90Plus > 0 ? `₵ ${row.days90Plus.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                      </td>

                      <td className="p-4 text-right font-mono font-black text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/40">
                        ₵ {rowTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Impairment Risk Flag */}
                      <td className="p-4 text-center">
                        {isHighRisk ? (
                          <Badge variant="destructive" className="text-[9px] font-black uppercase tracking-wider bg-rose-600 text-white">
                            {criticalRatio.toFixed(1)}% Critical (Hold Alert)
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] font-black uppercase tracking-wider text-emerald-600 border-emerald-300 bg-emerald-50">
                            Normal ({criticalRatio.toFixed(1)}%)
                          </Badge>
                        )}
                      </td>

                      {/* Collection Actions */}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedPayerForStatement(row)}
                            className="px-3 py-1.5 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-indigo-600 dark:hover:bg-indigo-400 dark:hover:text-slate-950 font-black text-[10px] uppercase rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow"
                          >
                            <Send className="w-3 h-3" />
                            <span>SEND STATEMENT</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedPayerForReconcile(row)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow"
                          >
                            <DollarSign className="w-3 h-3" />
                            <span>RECONCILE</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-900 text-white font-mono font-black text-xs">
                <tr>
                  <td className="p-4 uppercase tracking-wider text-[10px]">Consolidated Portfolios</td>
                  <td className="p-4 text-right">₵ {totals.current.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="p-4 text-right">₵ {totals.days30.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="p-4 text-right text-amber-400">₵ {totals.days60.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="p-4 text-right text-rose-400">₵ {totals.days90Plus.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="p-4 text-right bg-slate-800 text-emerald-400">₵ {totals.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="p-4 text-center text-[10px] text-slate-400">
                    {((totals.days90Plus / totals.total) * 100).toFixed(1)}% Facility Risk
                  </td>
                  <td className="p-4 text-center text-[10px] text-slate-400">Pre-Audit Aligned</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. MODAL 1: CLAIMS SUB-LEDGER RECONCILIATION WORKSPACE ([RECONCILE])      */}
      {/* ========================================================================= */}
      <Dialog open={!!selectedPayerForReconcile} onOpenChange={(open) => !open && setSelectedPayerForReconcile(null)}>
        <DialogContent className="max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-2xl">
          <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <DialogTitle className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">
                    CLAIMS SUB-LEDGER RECONCILIATION
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 font-medium">
                    Payer: <strong className="text-slate-900 dark:text-slate-100">{selectedPayerForReconcile?.payerName}</strong> ({selectedPayerForReconcile?.payerId})
                  </DialogDescription>
                </div>
              </div>

              {/* Filter pills inside modal */}
              <div className="flex items-center gap-1.5 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setReconciliationFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg uppercase cursor-pointer ${reconciliationFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  All Claims
                </button>
                <button
                  type="button"
                  onClick={() => setReconciliationFilter('CRITICAL')}
                  className={`px-2.5 py-1 rounded-lg uppercase cursor-pointer ${reconciliationFilter === 'CRITICAL' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  90+ Days Critical
                </button>
              </div>
            </div>
          </DialogHeader>

          {/* Underlying Claims Table */}
          <div className="space-y-4 py-2">
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 text-white text-[9px] uppercase tracking-widest sticky top-0">
                  <tr>
                    <th className="p-3">Claim Reference</th>
                    <th className="p-3">Patient & Member ID</th>
                    <th className="p-3">Department</th>
                    <th className="p-3 text-right">Billed Amount</th>
                    <th className="p-3 text-center">Status / Bucket</th>
                    <th className="p-3 text-center">Remittance Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {activeClaims.map(claim => {
                    const isReconciled = claim.status === 'RECONCILED';

                    return (
                      <tr key={claim.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 ${isReconciled ? 'bg-emerald-50/30' : ''}`}>
                        <td className="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                          {claim.claimRef}
                          <span className="block text-[10px] text-slate-400 font-normal">{claim.encounterDate}</span>
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-slate-900 dark:text-slate-100 block">{claim.patientName}</span>
                          <span className="text-[10px] font-mono text-emerald-600 font-bold">{claim.memberNumber}</span>
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">{claim.department}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                          ₵ {claim.netPayable.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-center">
                          {isReconciled ? (
                            <Badge className="text-[9px] font-black uppercase bg-emerald-600 text-white">
                              RECONCILED & CLEARED
                            </Badge>
                          ) : (
                            <Badge className={`text-[9px] font-bold uppercase ${
                              claim.agingBucket === '90+ Days' ? 'bg-rose-100 text-rose-800 border-rose-200' : (claim.agingBucket === '61-90 Days' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')
                            }`}>
                              {claim.agingBucket}
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {isReconciled ? (
                            <span className="text-[10px] font-bold text-emerald-600 flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> JV Posted
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenSettlementModal(claim)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase rounded-lg transition-all cursor-pointer shadow flex items-center gap-1 mx-auto"
                            >
                              <Split className="w-3 h-3" />
                              <span>Clear Line</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Reconciliation Summary Bar */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between text-xs gap-3">
              <span className="font-bold text-slate-600 dark:text-slate-300">
                Total Claims in Sub-Ledger: <strong className="text-slate-900 dark:text-slate-100">{activeClaims.length} Lines</strong>
              </span>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => router.push(`/finance/receivables?payer=${encodeURIComponent(selectedPayerForReconcile?.payerName || '')}`)}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase rounded-xl"
                >
                  Open Full Receivables Workspace <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" onClick={() => setSelectedPayerForReconcile(null)} className="rounded-xl">
              Close Sub-Ledger
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 5. MODAL 2: REMITTANCE SETTLEMENT & MULTI-LEG JOURNAL ENTRY MODAL         */}
      {/* ========================================================================= */}
      <Dialog open={!!selectedClaimForSettlement} onOpenChange={(open) => !open && setSelectedClaimForSettlement(null)}>
        <DialogContent className="max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-2xl">
          <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Scale className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">
                  POST REMITTANCE SETTLEMENT & CLEAR CLAIM
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-medium">
                  Claim: <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{selectedClaimForSettlement?.claimRef}</span> | Patient: <span className="font-bold text-slate-900 dark:text-slate-100">{selectedClaimForSettlement?.patientName}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            
            {/* Claim Total Reference */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block">Total Billed Net Receivable:</span>
                <span className="text-base font-black font-mono text-slate-900 dark:text-slate-100">
                  ₵ {selectedClaimForSettlement?.netPayable.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-black">
                {selectedPayerForReconcile?.payerName.split(' ')[0]} REMITTANCE
              </Badge>
            </div>

            {/* Split Inputs: Amount Received vs Disallowed */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                  1. Cash Amount Received (Bank Deposit) <span className="text-emerald-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-mono font-bold text-slate-400">₵</span>
                  <input
                    type="number"
                    step="0.01"
                    value={amountReceived}
                    onChange={(e) => handleAmountReceivedChange(parseFloat(e.target.value) || 0)}
                    className="w-full pl-7 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-black outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-rose-600 block">
                  2. Disallowed / Withheld (Write-Off)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-mono font-bold text-slate-400">₵</span>
                  <input
                    type="number"
                    step="0.01"
                    value={amountDisallowed}
                    onChange={(e) => setAmountDisallowed(parseFloat(e.target.value) || 0)}
                    className="w-full pl-7 pr-3 py-2 bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-mono font-black outline-none focus:ring-2 focus:ring-rose-500 text-rose-700 dark:text-rose-400"
                  />
                </div>
              </div>
            </div>

            {/* Destination Bank & Disallowance Reason */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 block">
                  Destination Bank Account
                </label>
                <select
                  value={destinationBank}
                  onChange={(e) => setDestinationBank(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                >
                  <option>1001 - GCB Operations Account</option>
                  <option>1002 - Stanbic Clinical Collections</option>
                  <option>1003 - Ecobank Corporate Health</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 block">
                  Disallowance Justification
                </label>
                <select
                  value={disallowanceReason}
                  onChange={(e) => setDisallowanceReason(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                >
                  <option>Non-covered formulary drug item</option>
                  <option>Tariff ceiling cap deduction</option>
                  <option>Pre-authorization window variance</option>
                  <option>Patient copay differential</option>
                  <option>None (Full 100% Settlement)</option>
                </select>
              </div>
            </div>

            {/* Live 3-Leg Accounting JV Preview */}
            <div className="p-3.5 bg-slate-900 text-white rounded-2xl space-y-2 font-mono text-[11px]">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-400">
                <span>Multi-Leg Journal Entry (IFRS/GAAP)</span>
                <span className="text-emerald-400 font-bold">Balanced Variance: ₵ 0.00</span>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-emerald-400">
                  <span>DEBIT {destinationBank.split(' - ')[0]} (Cash at Bank)</span>
                  <span className="font-bold">₵ {amountReceived.toFixed(2)}</span>
                </div>
                {amountDisallowed > 0 && (
                  <div className="flex justify-between text-rose-400">
                    <span>DEBIT 5205 (Claims Disallowed / Write-Off)</span>
                    <span className="font-bold">₵ {amountDisallowed.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sky-400 pt-1 border-t border-slate-800">
                  <span>CREDIT 1200 (Accounts Receivable - {selectedPayerForReconcile?.payerId})</span>
                  <span className="font-bold">₵ {(selectedClaimForSettlement?.netPayable || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setSelectedClaimForSettlement(null)} className="rounded-xl">
              Cancel
            </Button>

            <button
              type="button"
              onClick={handleExecuteRemittanceJV}
              disabled={isSettling}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              {isSettling ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>POST MULTI-LEG REMITTANCE & CLEAR CLAIM</span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 6. MODAL 3: AUTOMATED STATEMENT OF ACCOUNT (SOA) & DUNNING DISPATCH       */}
      {/* ========================================================================= */}
      <Dialog open={!!selectedPayerForStatement} onOpenChange={(open) => !open && setSelectedPayerForStatement(null)}>
        <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-2xl">
          <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">
                  DISPATCH STATEMENT OF ACCOUNT & DUNNING NOTICE
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-medium">
                  Automated PDF statement generation and direct institutional email delivery.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            
            {/* Payer Summary */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-slate-400">Target Institutional Payer:</span>
                <span className="font-mono text-emerald-600 font-bold">{selectedPayerForStatement?.payerId}</span>
              </div>
              <p className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase">{selectedPayerForStatement?.payerName}</p>
              
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block">Registered Email:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedPayerForStatement?.contactEmail}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Total Statement Balance:</span>
                  <span className="font-bold text-rose-600 text-sm">
                    ₵ {((selectedPayerForStatement?.current || 0) + (selectedPayerForStatement?.days30 || 0) + (selectedPayerForStatement?.days60 || 0) + (selectedPayerForStatement?.days90Plus || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Dunning Letter Template Level */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                Select Dunning Notice Severity
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Standard Reminder', 'Urgent Overdue Notice', 'Final Demand'] as const).map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setDunningLevel(lvl)}
                    className={`p-2.5 rounded-xl border text-center font-bold text-[11px] transition-all cursor-pointer ${
                      dunningLevel === lvl
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-md'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Email Body Preview */}
            <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-900/50 space-y-1">
              <span className="text-[10px] font-black uppercase text-indigo-700 dark:text-indigo-300 block">Email Body Preview:</span>
              <p className="text-[11px] text-slate-700 dark:text-slate-300 italic leading-relaxed">
                "Dear Accounts Payable at {selectedPayerForStatement?.payerName}, please find attached the verified Statement of Account and outstanding patient claim schedule for your reconciliation and settlement."
              </p>
            </div>

          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setSelectedPayerForStatement(null)} className="rounded-xl">
              Cancel
            </Button>

            <button
              type="button"
              onClick={handleSendStatement}
              disabled={isSendingStatement}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              {isSendingStatement ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>GENERATE PDF & DISPATCH STATEMENT</span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
