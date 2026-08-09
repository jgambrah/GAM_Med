'use client';
import { useState, useMemo } from 'react';
import { DollarSign, BookOpen, CheckCircle2, ShieldCheck, ArrowRight, RefreshCw, FileSpreadsheet } from 'lucide-react';
import {
  postPharmacyDispensingJournalEntry,
  getFinancialReconciliationSummary,
  PharmacyJournalEntry,
  FinancialReconciliationSummary
} from '@/ai/flows/ai-pharmacy-financial-reconciliation-engine';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface PharmacyFinancialReconciliationCardProps {
  defaultExpanded?: boolean;
}

export function PharmacyFinancialReconciliationCard({
  defaultExpanded = false
}: PharmacyFinancialReconciliationCardProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Financial Summary State
  const summary = useMemo(() => getFinancialReconciliationSummary(), []);

  // Postings log
  const [recentJournals, setRecentJournals] = useState<PharmacyJournalEntry[]>(() => {
    return postPharmacyDispensingJournalEntry();
  });

  const handlePostSampleJournal = () => {
    const newJournals = postPharmacyDispensingJournalEntry(
      'HOSP-CURRENT',
      `ENC-${Math.floor(1000 + Math.random() * 9000)}`,
      'Daniel Anim',
      180.0,
      45.0,
      'Acacia Health Insurance'
    );

    setRecentJournals((prev) => [...newJournals, ...prev]);

    toast({
      title: '📊 Double-Entry Financial Journal Posted to Ledger',
      description: `Posted ${newJournals.length} automated journal entries (COGS asset deduction & Copay/Claims receivable) to central ledger.`
    });
  };

  return (
    <div className="bg-slate-900 text-white rounded-[28px] border border-slate-800 shadow-xl overflow-hidden my-4">
      {/* HEADER BAR */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-800/60 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-black">
            <BookOpen size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm uppercase tracking-wider text-white">Financial Ledger Auto-Sync</h3>
              <span className="text-[9px] font-black bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full uppercase">
                🟢 Ledger Connected
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
              Automated Double-Entry Postings & Inventory Asset Reconciliation
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-slate-400 hover:text-white font-bold text-xs uppercase"
        >
          {isExpanded ? 'Collapse ▲' : 'View Ledger Telemetry ▼'}
        </Button>
      </div>

      {/* EXPANDED CONTENT */}
      {isExpanded && (
        <div className="p-5 pt-0 space-y-4 border-t border-slate-800/80">
          {/* LEDGER TOTALS SUMMARY GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
            <div className="p-2.5 bg-slate-950/90 rounded-xl border border-slate-800">
              <p className="text-[9px] text-slate-400 uppercase font-black">Total Dispensed Revenue</p>
              <p className="text-xs font-mono font-black text-emerald-400">GHS {summary.totalDispensedRevenueGhc.toLocaleString()}</p>
            </div>

            <div className="p-2.5 bg-slate-950/90 rounded-xl border border-slate-800">
              <p className="text-[9px] text-slate-400 uppercase font-black">NHIS Claims Receivable</p>
              <p className="text-xs font-mono font-black text-cyan-400">GHS {summary.totalNhisClaimsPendingGhc.toLocaleString()}</p>
            </div>

            <div className="p-2.5 bg-slate-950/90 rounded-xl border border-slate-800">
              <p className="text-[9px] text-slate-400 uppercase font-black">Copays Collected</p>
              <p className="text-xs font-mono font-black text-amber-400">GHS {summary.totalCopayCollectedGhc.toLocaleString()}</p>
            </div>

            <div className="p-2.5 bg-slate-950/90 rounded-xl border border-slate-800">
              <p className="text-[9px] text-slate-400 uppercase font-black">Inventory COGS Deducted</p>
              <p className="text-xs font-mono font-black text-purple-400">GHS {summary.totalInventoryAssetDeductionGhc.toLocaleString()}</p>
            </div>
          </div>

          {/* RECENT AUTOMATED JOURNAL POSTINGS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                Real-Time Double-Entry Postings ({recentJournals.length} Transactions)
              </p>

              <Button
                type="button"
                onClick={handlePostSampleJournal}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[9px] uppercase rounded-xl h-7 px-3 flex items-center gap-1"
              >
                <FileSpreadsheet size={12} /> Post Month-End Sync
              </Button>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {recentJournals.map((jnl) => (
                <div 
                  key={jnl.journalId}
                  className="p-3 bg-slate-950/90 rounded-2xl border border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-cyan-300 text-[10px]">{jnl.journalId}</span>
                      <span className="text-[8px] font-black bg-slate-900 text-slate-300 px-2 py-0.5 rounded border border-slate-800 uppercase">
                        {jnl.transactionType}
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-400 font-bold">
                      Debit: <span className="text-white font-mono">{jnl.debitAccount}</span> ➔ Credit: <span className="text-white font-mono">{jnl.creditAccount}</span>
                    </p>
                    <p className="text-[9px] text-slate-500 font-medium">Patient: {jnl.patientName} • {jnl.timestamp}</p>
                  </div>

                  <span className="font-mono font-black text-emerald-400 text-xs shrink-0">
                    GHS {jnl.amountGhc.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
