'use client';
import { Pill, CheckCircle2 } from 'lucide-react';

interface MedicationRowProps {
  index: number;
  item: {
    name: string;
    strength?: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    instructions?: string;
    qty?: number;
    quantity?: number;
  };
}

export function MedicationRow({ index, item }: MedicationRowProps) {
  return (
    <div className="p-3 flex items-center justify-between text-xs gap-3 hover:bg-muted/60 transition-all">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary font-black text-[10px] flex items-center justify-center shrink-0">
          {index + 1}
        </span>
        <div className="min-w-0">
          <p className="font-extrabold uppercase text-card-foreground truncate flex items-center gap-1.5">
            <Pill size={12} className="text-primary shrink-0" /> {item.name} {item.strength ? `(${item.strength})` : ''}
          </p>
          {(item.dosage || item.frequency || item.instructions) && (
            <p className="text-[10px] text-muted-foreground font-mono truncate">
              {item.dosage || '1 tab'} • {item.frequency || 'daily'} • {item.instructions || 'take after meal'}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="text-[10px] font-mono text-muted-foreground font-semibold">
          Qty: {item.qty || item.quantity || 1}
        </span>
        <span className="text-[8px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded uppercase border border-emerald-200">
          In Stock
        </span>
      </div>
    </div>
  );
}
