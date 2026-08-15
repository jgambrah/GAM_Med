'use client';

import React, { useState, useMemo } from 'react';
import { Search, ShieldCheck, Check, Sparkles } from 'lucide-react';

export interface Icd10Node {
  code: string;
  description: string;
  category: string;
}

const ICD10_DICTIONARY: Icd10Node[] = [
  { code: 'B50.9', description: 'Plasmodium falciparum malaria, unspecified', category: 'Infectious' },
  { code: 'B54', description: 'Unspecified malaria', category: 'Infectious' },
  { code: 'R51.9', description: 'Headache, unspecified', category: 'Symptoms' },
  { code: 'I10', description: 'Essential (primary) hypertension', category: 'Cardiovascular' },
  { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications', category: 'Endocrine' },
  { code: 'J06.9', description: 'Acute upper respiratory infection, unspecified', category: 'Respiratory' },
  { code: 'A09', description: 'Infectious gastroenteritis and colitis, unspecified (Cholera/Diarrhea)', category: 'Infectious' },
  { code: 'N39.0', description: 'Urinary tract infection, site not specified', category: 'Urology' },
  { code: 'K29.7', description: 'Gastritis, unspecified', category: 'Gastrointestinal' },
  { code: 'O80', description: 'Single spontaneous delivery (ANC/Maternity)', category: 'Obstetrics' },
  { code: 'J45.909', description: 'Unspecified asthma, uncomplicated', category: 'Respiratory' },
  { code: 'M54.5', description: 'Low back pain, unspecified', category: 'Musculoskeletal' },
  { code: 'L03.90', description: 'Cellulitis, unspecified', category: 'Dermatology' },
  { code: 'H10.9', description: 'Unspecified conjunctivitis', category: 'Ophthalmology' },
];

interface SmartIcd10SearchProps {
  value: string;
  onSelectCode: (node: Icd10Node) => void;
}

export default function SmartIcd10Search({ value, onSelectCode }: SmartIcd10SearchProps) {
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);

  const filteredNodes = useMemo(() => {
    if (!searchTerm.trim()) return ICD10_DICTIONARY.slice(0, 6);
    const q = searchTerm.toLowerCase().trim();
    return ICD10_DICTIONARY.filter(
      item => item.code.toLowerCase().includes(q) || item.description.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
    );
  }, [searchTerm]);

  const handleSelect = (node: Icd10Node) => {
    setSearchTerm(`${node.code} - ${node.description}`);
    onSelectCode(node);
    setIsOpen(false);
  };

  return (
    <div className="relative space-y-1">
      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
        <label className="flex items-center gap-1.5">
          <span>Primary ICD-10 Diagnosis *</span>
          <span className="text-emerald-500 font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            <ShieldCheck size={12} /> NHIS Billing Compliant
          </span>
        </label>
      </div>

      <div className="relative">
        <input
          type="text"
          placeholder="Type diagnosis (e.g. Malaria, B50.9, Hypertension)..."
          value={searchTerm}
          onChange={e => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full p-3 pl-10 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold outline-none text-slate-900 dark:text-slate-100"
        />
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
      </div>

      {/* Typeahead Dropdown */}
      {isOpen && (
        <div className="absolute z-30 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-h-60 overflow-y-auto p-2 space-y-1 animate-in fade-in duration-150">
          <div className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <span>Select Billing-Compliant ICD-10 Code</span>
            <span className="text-emerald-400 flex items-center gap-1"><Sparkles size={10} /> Auto-Mapped</span>
          </div>

          {filteredNodes.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400 font-medium">
              No matching ICD-10 diagnosis found. Type custom description.
            </div>
          ) : (
            filteredNodes.map((node) => (
              <div
                key={node.code}
                onClick={() => handleSelect(node)}
                className="p-2.5 rounded-xl hover:bg-emerald-500/10 dark:hover:bg-slate-800 cursor-pointer transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded font-mono text-[10px] font-black">
                      {node.code}
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-400 transition-colors">
                      {node.description}
                    </span>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 block">
                    Category: {node.category}
                  </span>
                </div>
                <Check size={14} className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
