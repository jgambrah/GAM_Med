'use client';

import React, { useState } from 'react';
import { ShieldAlert, X, AlertTriangle, KeyRound } from 'lucide-react';

interface AdjustmentSecurityModalProps {
  drug: {
    id: string;
    name: string;
    batchNo?: string;
    batchNumber?: string;
    stockLevel: number;
    quantity?: number;
    price?: number;
    unitPrice?: number;
  } | null;
  onClose: () => void;
  onSubmit: (payload: {
    drugId: string;
    newQuantity: number;
    reasonCode: string;
    notes: string;
    supervisorPin: string;
  }) => void;
}

export default function AdjustmentSecurityModal({ drug, onClose, onSubmit }: AdjustmentSecurityModalProps) {
  const [pin, setPin] = useState('');
  const [reasonCode, setReasonCode] = useState('');
  const [adjustmentQty, setAdjustmentQty] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  if (!drug) return null;

  const currentStock = drug.stockLevel ?? drug.quantity ?? 0;
  const displayBatch = drug.batchNo || drug.batchNumber || 'N/A';

  const handleAuthorize = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Basic validation
    if (!reasonCode) return setError('You must select a mandatory reason code.');
    if (!adjustmentQty || isNaN(Number(adjustmentQty)) || Number(adjustmentQty) < 0) {
      return setError('Enter a valid non-negative adjustment quantity.');
    }
    if (notes.trim().length < 5) return setError('Audit Notes are mandatory (minimum 5 characters).');
    if (pin.length < 4) return setError('Enter a valid 4-digit Supervisor PIN.');

    // Execute submission
    onSubmit({
      drugId: drug.id,
      newQuantity: Number(adjustmentQty),
      reasonCode,
      notes,
      supervisorPin: pin,
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 dark:border-slate-800">
        
        {/* HEADER: Security Warning */}
        <div className="bg-red-50 dark:bg-red-950/50 px-6 py-4 border-b border-red-100 dark:border-red-900 flex items-center justify-between">
          <div className="flex items-center space-x-3 text-red-700 dark:text-red-400">
            <ShieldAlert size={24} />
            <h2 className="font-bold text-lg">Restricted Action</h2>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-red-400 hover:text-red-700 dark:hover:text-red-300 transition rounded-lg p-1"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleAuthorize} className="p-6 space-y-5">
          
          {/* DRUG CONTEXT */}
          <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <p className="text-[10px] text-gray-500 dark:text-slate-400 uppercase font-black tracking-wider mb-1">Target Item</p>
            <p className="font-bold text-gray-900 dark:text-slate-100 uppercase">{drug.name} • {displayBatch}</p>
            <p className="text-sm text-gray-600 dark:text-slate-400">Current Stock: <span className="font-bold text-emerald-600 dark:text-emerald-400">{currentStock} Units</span></p>
          </div>

          {/* ACTION DETAILS */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 uppercase">New Quantity *</label>
              <input 
                type="number" 
                min="0"
                value={adjustmentQty}
                onChange={(e) => setAdjustmentQty(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-950 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm font-mono font-bold dark:text-white"
                placeholder={`e.g., ${currentStock}`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 uppercase">Reason Code *</label>
              <select 
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-950 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-xs font-bold dark:text-white"
              >
                <option value="" disabled>Select...</option>
                <option value="SPILLAGE">Spillage / Damaged</option>
                <option value="EXPIRED">Expired Stock</option>
                <option value="COUNT_DISCREPANCY">Physical Count Discrepancy</option>
                <option value="RECALL">Manufacturer Recall</option>
              </select>
            </div>
          </div>

          {/* MANDATORY NOTES */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 uppercase">Audit Notes *</label>
            <textarea 
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-950 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-xs dark:text-white"
              placeholder="Explain the reason for this manual adjustment..."
              rows={2}
            />
          </div>

          {/* AUTHORIZATION PIN */}
          <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
            <label className="block text-xs font-bold text-gray-900 dark:text-slate-200 mb-1 flex items-center space-x-2 uppercase">
              <AlertTriangle size={16} className="text-amber-500"/>
              <span>Supervisor PIN Required (Default: 1234)</span>
            </label>
            <input 
              type="password" 
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full px-3 py-3 border-2 border-gray-300 dark:border-slate-700 dark:bg-slate-950 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-center tracking-[1em] text-lg font-bold dark:text-white font-mono"
              placeholder="••••"
            />
          </div>

          {error && <p className="text-red-600 dark:text-red-400 text-xs font-bold text-center">{error}</p>}

          <button 
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl shadow-md transition text-xs uppercase tracking-wider"
          >
            AUTHORIZE & ADJUST STOCK
          </button>
        </form>
      </div>
    </div>
  );
}
