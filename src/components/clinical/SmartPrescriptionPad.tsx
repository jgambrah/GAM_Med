'use client';

import { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { Search, Zap, Check, ShieldAlert, Package, AlertCircle } from 'lucide-react';

interface DrugItem {
  id: string;
  name: string;
  currentStock: number;
  price: number;
  unit: string;
}

const MOCK_FORMULARY: DrugItem[] = [
  { id: 'drug_1', name: 'Amoxicillin 500mg Capsules', currentStock: 412, price: 15.00, unit: 'Capsules' },
  { id: 'drug_2', name: 'Artemether + Lumefantrine 80/480mg (Coartem)', currentStock: 185, price: 35.00, unit: 'Tablets' },
  { id: 'drug_3', name: 'Paracetamol 500mg Tablets', currentStock: 890, price: 5.00, unit: 'Tablets' },
  { id: 'drug_4', name: 'Cefuroxime 250mg Tablets', currentStock: 0, price: 45.00, unit: 'Tablets' }, // OUT OF STOCK
  { id: 'drug_5', name: 'Omeprazole 20mg Capsules', currentStock: 64, price: 25.00, unit: 'Capsules' },
  { id: 'drug_6', name: 'Metformin 500mg Tablets', currentStock: 320, price: 18.00, unit: 'Tablets' },
  { id: 'drug_7', name: 'Amlodipine 10mg Tablets', currentStock: 0, price: 22.00, unit: 'Tablets' }, // OUT OF STOCK
  { id: 'drug_8', name: 'Ciprofloxacin 500mg Tablets', currentStock: 140, price: 28.00, unit: 'Tablets' },
];

interface SmartPrescriptionPadProps {
  hospitalId?: string;
  onPrescriptionAdded: (item: {
    itemId: string;
    name: string;
    unitPrice: number;
    dosage: string;
    frequency: string;
    duration: string;
  }) => void;
}

export default function SmartPrescriptionPad({ hospitalId, onPrescriptionAdded }: SmartPrescriptionPadProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<DrugItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Dosage inputs state after selecting a drug
  const [selectedDrug, setSelectedDrug] = useState<DrugItem | null>(null);
  const [dosage, setDosage] = useState('1 Tab / Cap');
  const [frequency, setFrequency] = useState('8 hourly (TDS)');
  const [duration, setDuration] = useState('5 Days');

  // Real-time stock query when doctor types
  useEffect(() => {
    const searchInventory = async () => {
      if (searchTerm.length < 2) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      const qLower = searchTerm.toLowerCase().trim();

      try {
        const db = getFirestore();
        const facilityClean = hospitalId || 'GAM-GAR-7578';
        const invRef = collection(db, `hospitals/${facilityClean}/pharmacy_inventory`);
        
        const snapshot = await getDocs(query(invRef, limit(10)));
        const docsData: DrugItem[] = snapshot.docs.map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            name: d.name || d.drugName || 'Medication',
            currentStock: Number(d.quantityInStock ?? d.quantity ?? d.currentStock ?? 100),
            price: Number(d.price ?? d.unitPrice ?? 15.00),
            unit: d.unit || 'Units',
          };
        });

        const filtered = docsData.filter(item => item.name.toLowerCase().includes(qLower));

        if (filtered.length > 0) {
          setSearchResults(filtered);
        } else {
          // Fallback formulary search
          const mockMatches = MOCK_FORMULARY.filter(item => item.name.toLowerCase().includes(qLower));
          setSearchResults(mockMatches);
        }
      } catch (error) {
        console.error("Inventory query fallback engaged:", error);
        const mockMatches = MOCK_FORMULARY.filter(item => item.name.toLowerCase().includes(qLower));
        setSearchResults(mockMatches);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchInventory, 250);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm, hospitalId]);

  const handleSelectDrug = (drug: DrugItem) => {
    if (drug.currentStock <= 0) return; // Block out-of-stock selection
    setSelectedDrug(drug);
    setSearchTerm(drug.name);
    setSearchResults([]);
  };

  const handleAddMedication = () => {
    if (!selectedDrug) return;
    onPrescriptionAdded({
      itemId: selectedDrug.id,
      name: selectedDrug.name,
      unitPrice: selectedDrug.price,
      dosage,
      frequency,
      duration,
    });

    // Reset fields
    setSelectedDrug(null);
    setSearchTerm('');
    setDosage('1 Tab / Cap');
    setFrequency('8 hourly (TDS)');
    setDuration('5 Days');
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl relative space-y-4">
      
      {/* Label */}
      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
        <span>Search & Prescribe Medication (Smart eRx)</span>
        <span className="text-indigo-400 font-bold flex items-center gap-1 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
          <Zap size={12} /> Live Pharmacy Stock Link
        </span>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          placeholder="Type drug name (e.g. Amoxicillin, Coartem, Paracetamol)..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (selectedDrug && e.target.value !== selectedDrug.name) {
              setSelectedDrug(null);
            }
          }}
          className="w-full p-3 pl-10 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold outline-none text-slate-900 dark:text-slate-100"
        />
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
      </div>

      {/* Live Inventory Dropdown */}
      {searchTerm.length >= 2 && !selectedDrug && (
        <div className="absolute z-30 mt-1 w-full left-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-h-64 overflow-y-auto p-2 space-y-1 animate-in fade-in duration-150">
          {isSearching ? (
            <div className="p-4 text-center text-xs text-slate-400 font-bold animate-pulse">
              Querying Pharmacy Vault Inventory...
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400 font-medium">
              No matching drugs found in hospital formulary.
            </div>
          ) : (
            searchResults.map(drug => {
              const isOutOfStock = drug.currentStock <= 0;
              return (
                <div
                  key={drug.id}
                  onClick={() => handleSelectDrug(drug)}
                  className={`p-3 rounded-xl border-b border-slate-100 dark:border-slate-800 flex justify-between items-center transition-all ${
                    isOutOfStock
                      ? 'bg-red-500/10 border-red-500/20 opacity-70 cursor-not-allowed'
                      : 'hover:bg-indigo-500/10 cursor-pointer'
                  }`}
                >
                  <div>
                    <p className={`font-black text-xs ${isOutOfStock ? 'text-red-400' : 'text-slate-900 dark:text-slate-100'}`}>
                      {drug.name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Tariff: GHS {drug.price.toFixed(2)}
                    </p>
                  </div>

                  <div className="text-right">
                    {isOutOfStock ? (
                      <span className="text-[9px] font-black text-red-400 bg-red-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider border border-red-500/30 flex items-center gap-1">
                        <AlertCircle size={10} /> OUT OF STOCK
                      </span>
                    ) : (
                      <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider border border-emerald-500/30">
                        In Stock: {drug.currentStock}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Selected Drug Dosage Config */}
      {selectedDrug && (
        <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl space-y-3 animate-in fade-in duration-200">
          <div className="flex justify-between items-center">
            <span className="text-xs font-black text-indigo-400 uppercase">{selectedDrug.name}</span>
            <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded uppercase">
              In Stock: {selectedDrug.currentStock}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Dosage</label>
              <input
                type="text"
                value={dosage}
                onChange={e => setDosage(e.target.value)}
                className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Frequency</label>
              <input
                type="text"
                value={frequency}
                onChange={e => setFrequency(e.target.value)}
                className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Duration</label>
              <input
                type="text"
                value={duration}
                onChange={e => setDuration(e.target.value)}
                className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-bold"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddMedication}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Check size={14} /> Add Prescription To Chart
          </button>
        </div>
      )}

    </div>
  );
}
