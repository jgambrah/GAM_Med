'use client';
import { useState, useEffect, useRef } from 'react';
import { Search, Package, Check, ChevronDown } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku: string;
  purchasePrice: number;
  unit: string;
  stockOnHand?: number;
  quantityInStock?: number;
  quantity?: number;
  currentStock?: number;
}

export default function ProductSearchDropdown({ 
  catalog, 
  onSelect 
}: { 
  catalog: Product[], 
  onSelect: (p: Product) => void 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredProducts = catalog.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-3 bg-slate-50 border-2 border-slate-100 rounded-xl cursor-pointer hover:border-blue-500 transition-all"
      >
        <div className="flex items-center gap-3 w-full">
          <Search size={16} className="text-slate-400" />
          <input 
            placeholder="Search Catalog (Name or SKU)..."
            className="bg-transparent outline-none text-black font-bold text-sm w-full"
            value={searchTerm}
            onChange={(e) => {
                setSearchTerm(e.target.value);
                if (!isOpen) setIsOpen(true);
            }}
          />
        </div>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute w-full mt-2 bg-white border-2 border-slate-100 rounded-2xl shadow-2xl z-50 max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2">
          {filteredProducts.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-xs font-bold uppercase italic">No matching product found</div>
          ) : (
            filteredProducts.map(p => {
              const soh = p.stockOnHand ?? p.quantityInStock ?? p.quantity ?? p.currentStock ?? 100;
              const isOutOfStock = soh === 0;
              const isLowStock = soh > 0 && soh <= 15;

              return (
                <div 
                  key={p.id}
                  onClick={() => {
                    onSelect(p);
                    setSearchTerm('');
                    setIsOpen(false);
                  }}
                  className="p-4 hover:bg-blue-50 cursor-pointer border-b last:border-0 flex justify-between items-center group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Package size={16} />
                    </div>
                    <div>
                      <p className="font-black text-black uppercase text-[11px] leading-tight">{p.name}</p>
                      <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">{p.sku}</p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    {/* Stock on Hand (SOH) Indicator */}
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase">SOH:</span>
                      <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full border ${
                        isOutOfStock
                          ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                          : isLowStock
                          ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
                      }`}>
                        {soh} {p.unit || 'units'}
                      </span>
                    </div>
                    <p className="text-[10px] font-black text-black uppercase">₵ {(p.purchasePrice || 0).toFixed(2)}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase">per {p.unit || 'unit'}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
