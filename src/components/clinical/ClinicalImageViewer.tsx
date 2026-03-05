'use client';
import { Maximize2, ZoomIn, Download, Info } from 'lucide-react';

export function ClinicalImageViewer({ url }: { url: string | null | undefined }) {
  return (
    <div className="bg-[#0f172a] rounded-[40px] overflow-hidden border-4 border-slate-800 shadow-2xl relative group">
       <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button className="p-2 bg-black/50 text-white rounded-lg backdrop-blur-md"><ZoomIn size={16}/></button>
          <button className="p-2 bg-black/50 text-white rounded-lg backdrop-blur-md"><Maximize2 size={16}/></button>
       </div>
       
       <div className="p-4 bg-slate-900/50 flex justify-between items-center">
          <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Digital Radiography System</span>
          <div className="flex gap-2">
             <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
             <span className="text-[8px] text-white font-bold">HD SOURCE</span>
          </div>
       </div>

       {/* THE IMAGE */}
       <div className="p-8 flex items-center justify-center bg-black min-h-[400px]">
          {url ? (
            <img src={url} alt="Clinical Scan" className="max-w-full rounded-lg shadow-2xl border border-white/10" />
          ) : (
            <p className="text-slate-600 italic text-xs uppercase">Awaiting Image Transmission...</p>
          )}
       </div>

       <div className="p-6 bg-slate-900 border-t border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2">
             <Info size={14} className="text-slate-400" />
             <p className="text-[10px] text-slate-400 font-medium italic">High-resolution diagnostic image. Protected by GamMed Security.</p>
          </div>
          <a href={url || ''} download className="text-blue-400 hover:text-white transition-colors">
             <Download size={18} />
          </a>
       </div>
    </div>
  );
}
