'use client';

import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, Search, Building2, Lock, Tag, 
  Layers, BadgePercent, CheckCircle2, ChevronRight,
  Info, Stethoscope, Beaker, Camera, BedDouble
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { Input } from '@/components/ui/input';

// Accepted Payer Networks
const PAYER_NETWORKS = [
  { id: 'PAY-001', name: 'National Health Insurance (NHIS / NHIA)', type: 'PUBLIC', status: 'ACTIVE', copay: '0% GOG Standard', description: 'GOG standard primary & secondary care tariff schedule.' },
  { id: 'PAY-002', name: 'Nationwide Medical Insurance', type: 'CORPORATE HMO', status: 'ACTIVE', copay: '10% Tier-1 Co-Pay', description: 'Pre-authorization required for procedures > GHS 1,500.' },
  { id: 'PAY-003', name: 'Acacia Health Insurance', type: 'CORPORATE HMO', status: 'ACTIVE', copay: '0% Direct Settlement', description: 'Full coverage for registered corporate employees.' },
  { id: 'PAY-004', name: 'Glico Healthcare', type: 'CORPORATE HMO', status: 'ACTIVE', copay: '15% Specialized Drug Co-Pay', description: 'Direct billing with biometric verification.' },
  { id: 'PAY-005', name: 'Metropolitan Health Ghana', type: 'CORPORATE HMO', status: 'ACTIVE', copay: '0% Direct Settlement', description: 'Standard corporate private medical scheme.' },
  { id: 'PAY-006', name: 'Private Out-of-Pocket (Cash / MoMo / POS)', type: 'SELF-PAY', status: 'ACTIVE', copay: '100% Cash / Mobile Money', description: 'Immediate point-of-sale receipt issuance.' },
];

// Standard Hospital Service Tariffs
const DEFAULT_TARIFFS = [
  { id: 'TRF-101', service: 'General Outpatient (OPD) Consultation', category: 'OPD', department: 'Consultation', cashPrice: 120.00, nhisPrice: 45.00, hmoPrice: 110.00 },
  { id: 'TRF-102', service: 'Specialist Physician / Surgeon Consultation', category: 'OPD', department: 'Consultation', cashPrice: 250.00, nhisPrice: 85.00, hmoPrice: 230.00 },
  { id: 'TRF-103', service: 'Chest X-Ray (PA & Lateral Views)', category: 'RADIOLOGY', department: 'Imaging', cashPrice: 150.00, nhisPrice: 75.00, hmoPrice: 140.00 },
  { id: 'TRF-104', service: 'Abdominal & Pelvic Ultrasound Scan', category: 'RADIOLOGY', department: 'Imaging', cashPrice: 200.00, nhisPrice: 95.00, hmoPrice: 185.00 },
  { id: 'TRF-105', service: 'Full Blood Count (FBC + Diff + Platelets)', category: 'LABORATORY', department: 'Laboratory', cashPrice: 85.00, nhisPrice: 35.00, hmoPrice: 80.00 },
  { id: 'TRF-106', service: 'Kidney Function Test (BUE & Creatinine + eGFR)', category: 'LABORATORY', department: 'Laboratory', cashPrice: 130.00, nhisPrice: 55.00, hmoPrice: 120.00 },
  { id: 'TRF-107', service: 'Liver Function Test (LFT Panel)', category: 'LABORATORY', department: 'Laboratory', cashPrice: 140.00, nhisPrice: 60.00, hmoPrice: 130.00 },
  { id: 'TRF-108', service: 'Standard General Ward Bed (Per Day)', category: 'INPATIENT', department: 'Nursing Wards', cashPrice: 180.00, nhisPrice: 60.00, hmoPrice: 165.00 },
  { id: 'TRF-109', service: 'Executive Private Suite Bed (Per Day)', category: 'INPATIENT', department: 'Nursing Wards', cashPrice: 650.00, nhisPrice: 60.00, hmoPrice: 500.00 },
  { id: 'TRF-110', service: 'Minor Theater Procedure Fee (Suturing / Excision)', category: 'THEATER', department: 'Surgical', cashPrice: 350.00, nhisPrice: 120.00, hmoPrice: 320.00 },
];

export default function ReadOnlyPayerRegistryPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const [activeTab, setActiveTab] = useState<'PAYERS' | 'TARIFFS'>('PAYERS');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const filteredPayers = useMemo(() => {
    return PAYER_NETWORKS.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const filteredTariffs = useMemo(() => {
    return DEFAULT_TARIFFS.filter(t => {
      const matchesCategory = selectedCategory === 'ALL' || t.category === selectedCategory;
      const matchesSearch = 
        !searchTerm ||
        t.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.id.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchTerm]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      
      {/* 1. GAM MED READ-ONLY COMMAND BANNER */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> READ-ONLY CASHIER REFERENCE
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Separation of Duties (SoD) Enforced
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3 italic">
              <BadgePercent className="w-7 h-7 text-amber-400" />
              Tariffs & Accepted Payer Registry
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-wider">
              Authorized Hospital Pricing, Insurance Coverage Matrix & Co-Payment Rates
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl text-right min-w-[150px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Active Networks</span>
              <span className="text-2xl font-mono font-black text-amber-400">{PAYER_NETWORKS.length} Schemes</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. TAB CONTROLS & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('PAYERS')}
            className={`px-4 py-2 rounded-lg uppercase tracking-wider transition cursor-pointer text-xs ${
              activeTab === 'PAYERS'
                ? 'bg-amber-600 text-white font-black shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            ACCEPTED PAYERS ({PAYER_NETWORKS.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('TARIFFS')}
            className={`px-4 py-2 rounded-lg uppercase tracking-wider transition cursor-pointer text-xs ${
              activeTab === 'TARIFFS'
                ? 'bg-amber-600 text-white font-black shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            SERVICE TARIFFS ({DEFAULT_TARIFFS.length})
          </button>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={activeTab === 'PAYERS' ? "Search insurance schemes..." : "Search service, lab test, X-ray..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Category Filter for Tariffs */}
      {activeTab === 'TARIFFS' && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono">
          {['ALL', 'OPD', 'LABORATORY', 'RADIOLOGY', 'INPATIENT', 'THEATER'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg border text-[11px] font-bold uppercase transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-800 text-amber-400 border-amber-500/50'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* 3. IMMUTABLE READ-ONLY GRIDS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        
        {/* ACCEPTED PAYERS GRID */}
        {activeTab === 'PAYERS' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="py-4 pl-6">Insurance Network / Provider</th>
                  <th className="py-4 px-4">Scheme Classification</th>
                  <th className="py-4 px-4">Patient Co-Pay Rule</th>
                  <th className="py-4 pr-6 text-right">Coverage Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPayers.map((payer) => (
                  <tr key={payer.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-4 pl-6">
                      <span className="font-bold text-white block text-sm">{payer.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{payer.description}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-mono font-bold text-[10px] uppercase border border-slate-700">
                        {payer.type}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-amber-400">
                      {payer.copay}
                    </td>
                    <td className="py-4 pr-6 text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {payer.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* SERVICE TARIFFS GRID */}
        {activeTab === 'TARIFFS' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="py-4 pl-6">Service / Clinical Procedure</th>
                  <th className="py-4 px-4">Department</th>
                  <th className="py-4 px-4 text-right">Cash / Private Price</th>
                  <th className="py-4 px-4 text-right">Corporate HMO Price</th>
                  <th className="py-4 pr-6 text-right">NHIS Tariff Base</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredTariffs.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-4 pl-6">
                      <span className="font-bold text-white block text-sm">{t.service}</span>
                      <span className="text-[10px] text-slate-500 font-mono">Ref ID: {t.id}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] uppercase border border-slate-700">
                        {t.category}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-black text-sm text-emerald-400">
                      GHS {t.cashPrice.toFixed(2)}
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-bold text-slate-300">
                      GHS {t.hmoPrice.toFixed(2)}
                    </td>
                    <td className="py-4 pr-6 text-right font-mono font-bold text-slate-400">
                      GHS {t.nhisPrice.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
}
