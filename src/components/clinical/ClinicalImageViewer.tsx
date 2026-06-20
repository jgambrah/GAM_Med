'use client';
import { useState } from 'react';
import { Maximize2, ZoomIn, Download, Info, X } from 'lucide-react';

export function ClinicalImageViewer({ url }: { url: string | null | undefined }) {
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const cycleZoom = () => {
    setZoom((prev) => {
      if (prev === 1) return 1.5;
      if (prev === 1.5) return 2;
      if (prev === 2) return 2.5;
      return 1;
    });
  };

  return (
    <div className="bg-[#0f172a] rounded-[40px] overflow-hidden border-4 border-slate-800 shadow-2xl relative group">
       <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button 
            type="button" 
            onClick={cycleZoom}
            className="p-2 bg-black/50 text-white rounded-lg backdrop-blur-md hover:bg-black/80 flex items-center gap-1 text-[10px] font-black"
            title="Zoom Image"
          >
             <ZoomIn size={16}/> {zoom}x
          </button>
          <button 
            type="button" 
            onClick={() => setIsFullscreen(true)}
            className="p-2 bg-black/50 text-white rounded-lg backdrop-blur-md hover:bg-black/80"
            title="Fullscreen PACS Viewer"
          >
             <Maximize2 size={16}/>
          </button>
       </div>
       
       <div className="p-4 bg-slate-900/50 flex justify-between items-center">
          <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Digital Radiography System</span>
          <div className="flex gap-2">
             <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
             <span className="text-[8px] text-white font-bold">HD SOURCE</span>
          </div>
       </div>

       {/* THE IMAGE */}
       <div className="p-8 flex items-center justify-center bg-black min-h-[400px] overflow-auto">
          {url ? (
            <img 
              src={url} 
              alt="Clinical Scan" 
              className="max-w-full rounded-lg shadow-2xl border border-white/10 transition-transform duration-200" 
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
            />
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

       {/* FULLSCREEN OVERLAY MODAL */}
       {isFullscreen && url && (
         <div className="fixed inset-0 bg-black/95 z-50 flex flex-col select-none animate-in fade-in duration-200">
           {/* Top controls bar */}
           <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-white">
             <div className="flex items-center gap-3">
               <span className="text-xs font-black text-blue-400 uppercase tracking-widest">Diagnostic PACS Viewer</span>
               <span className="text-[10px] bg-slate-800 px-3 py-1 rounded-full text-slate-300 font-bold">{zoom}x Zoom</span>
             </div>
             <div className="flex items-center gap-3">
               <button
                 type="button"
                 onClick={cycleZoom}
                 className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center gap-1.5 text-xs font-bold uppercase transition-all"
               >
                 <ZoomIn size={14} /> Zoom ({zoom}x)
               </button>
               <button
                 type="button"
                 onClick={() => {
                   setZoom(1);
                   setIsFullscreen(false);
                 }}
                 className="p-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-xl transition-all"
                 title="Close Viewer"
               >
                 <X size={18} />
               </button>
             </div>
           </div>

           {/* The Image Center */}
           <div className="flex-1 flex items-center justify-center p-8 overflow-auto bg-black">
             <img
               src={url}
               alt="Clinical Scan (Fullscreen)"
               className="max-h-[85vh] object-contain rounded-lg border border-white/10 shadow-2xl transition-transform duration-200"
               style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
             />
           </div>

           {/* Footer info bar */}
           <div className="p-4 bg-slate-900 border-t border-slate-800 text-center text-slate-500 text-[10px] font-medium italic">
             GamMed High-Resolution Diagnostic Image. Close to return.
           </div>
         </div>
       )}
    </div>
  );
}
