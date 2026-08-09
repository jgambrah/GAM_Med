'use client';
import { useState, useMemo } from 'react';
import { Inbox, CheckCircle2, AlertTriangle, Sparkles, FileText, ShieldCheck, Zap, ChevronDown, ChevronUp, Copy, Check, Edit3, Send } from 'lucide-react';
import {
  getSystemSmartPhrases,
  expandSmartPhrase,
  getSampleInboxItems,
  InboxItem,
  SmartPhrase
} from '@/ai/flows/ai-doctor-productivity-engine';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface DoctorProductivityInboxCardProps {
  patientName?: string;
  defaultExpanded?: boolean;
}

export function DoctorProductivityInboxCard({
  patientName = 'Patient',
  defaultExpanded = true
}: DoctorProductivityInboxCardProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Inbox State
  const [inboxItems, setInboxItems] = useState<InboxItem[]>(() => getSampleInboxItems(patientName));

  // SmartPhrases Charting Canvas State
  const [chartingText, setChartingText] = useState('');
  const [copiedText, setCopiedText] = useState(false);

  const smartPhrases = useMemo(() => getSystemSmartPhrases(), []);

  // Sign & Approve Inbox Item
  const handleSignItem = (itemId: string) => {
    setInboxItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, status: 'SIGNED' } : item
    ));

    toast({
      title: '✍️ Order Signed & Approved',
      description: `Signed off item for ${patientName}.`
    });
  };

  // Insert SmartPhrase Shortcut
  const handleInsertSmartPhrase = (phrase: SmartPhrase) => {
    setChartingText(prev => (prev ? `${prev}\n\n${phrase.expandedText}` : phrase.expandedText));

    toast({
      title: `⚡ Inserted SmartPhrase: ${phrase.trigger}`,
      description: `Expanded ${phrase.title} into clinical note.`
    });
  };

  // Live typing text expansion
  const handleTextChange = (text: string) => {
    const expanded = expandSmartPhrase(text);
    setChartingText(expanded);
  };

  const handleCopyNote = () => {
    if (!chartingText.trim()) return;
    navigator.clipboard.writeText(chartingText);
    setCopiedText(true);
    toast({
      title: '📋 Clinical Note Copied to Clipboard',
      description: 'Ready to paste into patient encounter record.'
    });
    setTimeout(() => setCopiedText(false), 2000);
  };

  const pendingCount = inboxItems.filter(i => i.status === 'PENDING').length;
  const criticalItem = inboxItems.find(i => i.priority === 'CRITICAL' && i.status === 'PENDING');

  return (
    <div className="bg-slate-950 text-white rounded-[32px] border-4 border-amber-500 shadow-2xl overflow-hidden transition-all mb-6">
      {/* COLLAPSIBLE HEADER BAR */}
      <div 
        onClick={() => setIsExpanded(prev => !prev)}
        className="p-5 bg-amber-950/40 hover:bg-amber-900/40 flex flex-col md:flex-row justify-between items-start md:items-center cursor-pointer transition-all border-b border-amber-900 gap-3 select-none"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-900/80 rounded-2xl border border-amber-700 text-amber-300">
            <Inbox className="animate-pulse" size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-amber-300">Unified Clinical Inbox & Command Center</h3>
              <span className="text-[9px] font-black bg-amber-600 text-white px-2 py-0.5 rounded-full uppercase">
                {pendingCount} PENDING ITEMS TO SIGN
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
              Aggregated PACS/Lab Review • Unsigned Rx Refills • Critical Value Alerts • SmartPhrases (.phrase)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button size="sm" variant="ghost" className="text-amber-400 font-black text-xs uppercase rounded-xl">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {isExpanded ? 'Collapse' : 'Expand Inbox'}
          </Button>
        </div>
      </div>

      {/* EXPANDABLE COMMAND CENTER WORKSPACE */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* CRITICAL VALUE POP-UP BANNER */}
          {criticalItem && (
            <div className="p-4 bg-red-950/90 border-2 border-red-600 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-pulse shadow-2xl">
              <div className="flex items-center gap-3">
                <AlertTriangle size={24} className="text-red-400 shrink-0" />
                <div>
                  <h4 className="text-xs font-black uppercase text-white">{criticalItem.title}</h4>
                  <p className="text-[11px] font-bold text-red-200">{criticalItem.details}</p>
                </div>
              </div>

              <Button
                type="button"
                size="sm"
                onClick={() => handleSignItem(criticalItem.id)}
                className="bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase rounded-xl h-9 px-4 shrink-0 shadow-lg"
              >
                ✍️ Acknowledge & Sign STAT
              </Button>
            </div>
          )}

          {/* SECTION 1: UNIFIED CLINICAL INBOX DECK */}
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
              <Inbox size={14} /> Pending Results & Refills Requiring Sign-off:
            </h4>

            <div className="space-y-2.5">
              {inboxItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all ${
                    item.status === 'SIGNED' 
                      ? 'bg-slate-950/50 border-slate-800/60 opacity-60' 
                      : 'bg-slate-950 border-slate-800 hover:border-amber-500/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md shrink-0 ${
                      item.type === 'CRITICAL_ALERT' ? 'bg-red-950 text-red-300 border border-red-800' :
                      item.type === 'LAB_RESULT' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                      item.type === 'PACS_IMAGE' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                      'bg-cyan-950 text-cyan-300 border border-cyan-800'
                    }`}>
                      {item.type.replace(/_/g, ' ')}
                    </span>

                    <div>
                      <h5 className="text-xs font-bold text-white flex items-center gap-2">
                        {item.title}
                        {item.status === 'SIGNED' && <span className="bg-emerald-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-sm">SIGNED OFF</span>}
                      </h5>
                      <p className="text-[11px] text-slate-300 font-medium mt-0.5">{item.details}</p>
                    </div>
                  </div>

                  {item.status === 'PENDING' && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleSignItem(item.id)}
                      className="bg-amber-600 hover:bg-amber-500 text-white font-black text-[10px] uppercase rounded-xl h-7 px-3 shrink-0 shadow-md"
                    >
                      ✍️ Sign & Approve
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 2: SMARTPHRASES & MACRO TEXT EXPANSION CANVAS */}
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
              <h4 className="text-xs font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} /> SmartPhrases & Dot-Macro Charting Canvas:
              </h4>

              <Button
                type="button"
                size="sm"
                onClick={handleCopyNote}
                disabled={!chartingText.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase rounded-xl h-7 px-3 flex items-center gap-1 shadow-md disabled:opacity-50"
              >
                {copiedText ? <Check size={12} /> : <Copy size={12} />}
                {copiedText ? 'Copied' : 'Copy Note'}
              </Button>
            </div>

            {/* SMARTPHRASE SHORTCUT BUTTONS */}
            <div className="space-y-1.5">
              <span className="text-[9px] font-black uppercase text-slate-400 block">Click to Insert Macro Shortcut or Type Dot-Code:</span>
              <div className="flex flex-wrap gap-2">
                {smartPhrases.map((phrase) => (
                  <button
                    key={phrase.id}
                    type="button"
                    onClick={() => handleInsertSmartPhrase(phrase)}
                    className="bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500 text-emerald-300 text-[10px] font-mono font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <Zap size={10} className="text-yellow-400" />
                    {phrase.trigger} ({phrase.title})
                  </button>
                ))}
              </div>
            </div>

            {/* CHARTING TEXTAREA */}
            <textarea
              value={chartingText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Type clinical notes here... (Tip: Type '.normalanc' or '.normalphys' to expand full normative exam notes automatically)"
              className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500 font-medium h-40 leading-relaxed"
            />
          </div>
        </div>
      )}
    </div>
  );
}
