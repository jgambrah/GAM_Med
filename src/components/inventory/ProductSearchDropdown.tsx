'use client';
import { useState, useEffect } from 'react';
import { Search, Package, Check, ChevronDown } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku: string;
  basePrice: number;
  unit: string;
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

  const filteredProducts = catalog.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative w-full">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-3 bg-slate-50 border-2 border-slate-100 rounded-xl cursor-pointer hover:border-blue-500 transition-all"
      >
        <div className="flex items-center gap-3">
          <Search size={16} className="text-slate-400" />
          <input 
            placeholder="Search Catalog (Name or SKU)..."
            className="bg-transparent outline-none text-black font-bold text-sm w-full"
            value={searchTerm}
            onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsOpen(true);
            }}
          />
        </div>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && searchTerm && (
        <div className="absolute w-full mt-2 bg-white border-2 border-slate-100 rounded-2xl shadow-2xl z-50 max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2">
          {filteredProducts.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-xs font-bold uppercase italic">No matching product found</div>
          ) : (
            filteredProducts.map(p => (
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
                <div className="text-right">
                   <p className="text-[10px] font-black text-black uppercase">₵ {p.basePrice.toFixed(2)}</p>
                   <p className="text-[8px] font-bold text-slate-400 uppercase">per {p.unit}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
