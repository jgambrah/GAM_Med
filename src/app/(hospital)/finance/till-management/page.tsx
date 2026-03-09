'use client';
import { Landmark, ArrowUpRight, Lock, CheckCircle2 } from 'lucide-react';

export default function TillManagement() {
  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto text-black font-bold">
      <h1 className="text-3xl font-black uppercase italic">Till <span className="text-blue-600">Closure</span></h1>
      
      <div className="bg-white p-10 rounded-[50px] border-4 border-slate-900 shadow-2xl space-y-8">
        <div className="grid grid-cols-2 gap-8 border-b pb-8">
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase">Physical Cash in Hand</p>
              <p className="text-4xl font-black italic">₵ 850.00</p>
           </div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase">Electronic MoMo Total</p>
              <p className="text-4xl font-black italic text-blue-600">₵ 390.50</p>
           </div>
        </div>

        <div className="space-y-4">
           <h3 className="text-xs font-black uppercase text-slate-400">Submission Pathway</h3>
           <div className="p-6 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex justify-between items-center">
              <span className="text-sm uppercase">Forward to Bank Deposit Queue?</span>
              <input type="checkbox" className="w-6 h-6 rounded accent-blue-600" />
           </div>
        </div>

        <button className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3">
           <Lock size={20} /> Close Till & Submit to Accountant
        </button>
      </div>
    </div>
  );
}
