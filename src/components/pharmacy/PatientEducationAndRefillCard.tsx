'use client';
import { useState, useMemo } from 'react';
import { Languages, Printer, MessageSquare, Send, CheckCircle2, ChevronDown, ChevronUp, QrCode, Sun, Moon, Utensils, Smartphone, Globe, Sparkles } from 'lucide-react';
import {
  generatePrescriptionLabel,
  generateRefillSmsText,
  PrescriptionLabel,
  RefillSmsNotification
} from '@/ai/flows/ai-patient-dispensing-education-engine';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface PatientEducationAndRefillCardProps {
  patientName?: string;
  patientPhone?: string;
  drugName?: string;
  rxNumber?: string;
  hospitalName?: string;
  defaultExpanded?: boolean;
}

export function PatientEducationAndRefillCard({
  patientName = 'Benjamin Hedidor',
  patientPhone = '+233 24 123 4567',
  drugName = 'Amoxicillin 500mg',
  rxNumber = 'RX-9921',
  hospitalName = 'GAM Medical Center',
  defaultExpanded = true
}: PatientEducationAndRefillCardProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Language State
  const [selectedLanguage, setSelectedLanguage] = useState<'ENGLISH' | 'ASANTE_TWI' | 'GA' | 'EWE'>('ENGLISH');

  const labelData = useMemo(() => {
    return generatePrescriptionLabel(rxNumber, patientName, drugName, '500mg', 'BID', selectedLanguage);
  }, [rxNumber, patientName, drugName, selectedLanguage]);

  // SMS Refill State
  const [smsData, setSmsData] = useState<RefillSmsNotification>(() => 
    generateRefillSmsText(patientName, drugName, hospitalName)
  );

  const handlePrintLabel = () => {
    toast({
      title: '🖨️ Prescription Label Sent to Thermal Printer',
      description: `Printed label in ${selectedLanguage} with dosage icons & QR code.`
    });
    window.print();
  };

  const handleSendSms = () => {
    setSmsData(prev => ({ ...prev, status: 'SENT', sentAt: new Date().toLocaleTimeString() }));
    toast({
      title: '📱 Refill Notification Dispatched',
      description: `SMS & WhatsApp alert sent to ${patientPhone} for ${patientName}.`
    });
  };

  return (
    <div className="bg-slate-950 text-white rounded-[32px] border-4 border-emerald-600 shadow-2xl overflow-hidden transition-all mb-6">
      {/* COLLAPSIBLE HEADER BAR */}
      <div 
        onClick={() => setIsExpanded(prev => !prev)}
        className="p-5 bg-emerald-950/40 hover:bg-emerald-900/40 flex flex-col md:flex-row justify-between items-start md:items-center cursor-pointer transition-all border-b border-emerald-900 gap-3 select-none"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-900/80 rounded-2xl border border-emerald-700 text-emerald-300">
            <Languages className="animate-pulse" size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-emerald-300">Patient Education & Outpatient Fulfillment</h3>
              <span className="text-[9px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full uppercase">
                4 LANGUAGES SUPPORTED
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
              Multilingual Labels (English / Twi / Ga / Ewe) • Visual Dosage Icons • Refill SMS & WhatsApp Pickup Alerts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button size="sm" variant="ghost" className="text-emerald-400 font-black text-xs uppercase rounded-xl">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {isExpanded ? 'Collapse' : 'Expand Labels'}
          </Button>
        </div>
      </div>

      {/* EXPANDABLE WORKSPACE */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* SECTION 1: MULTILINGUAL LABEL GENERATOR & PREVIEW */}
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800/80 pb-2">
              <h4 className="text-xs font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                <Globe size={16} /> Select Prescription Label Language:
              </h4>

              {/* LANGUAGE SELECTOR TABS */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'ENGLISH', label: '🇬🇧 English' },
                  { id: 'ASANTE_TWI', label: '🇬🇭 Asante Twi' },
                  { id: 'GA', label: '🇬🇭 Ga' },
                  { id: 'EWE', label: '🇬🇭 Ewe' }
                ].map((lang) => (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => setSelectedLanguage(lang.id as any)}
                    className={`text-[10px] font-black uppercase px-3 py-1 rounded-xl transition-all ${
                      selectedLanguage === lang.id
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            {/* PRINTABLE LABEL PREVIEW CANVAS */}
            <div className="p-5 bg-white text-slate-900 rounded-2xl border-4 border-slate-300 shadow-xl space-y-3 font-sans">
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-2">
                <div>
                  <h5 className="text-sm font-black uppercase tracking-wider text-emerald-950">{hospitalName} Pharmacy</h5>
                  <p className="text-[10px] font-bold text-slate-600">Rx #: {labelData.rxNumber} • Patient: {labelData.patientName}</p>
                </div>
                <div className="p-1.5 bg-slate-100 rounded-lg border border-slate-300 flex items-center gap-1">
                  <QrCode size={24} className="text-slate-800" />
                </div>
              </div>

              <div>
                <h6 className="text-base font-black text-slate-900 uppercase">{labelData.drugName} ({labelData.dosage})</h6>
                <p className="text-xs font-black text-emerald-800 mt-1 leading-relaxed bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                  {labelData.instructionText}
                </p>
              </div>

              {/* VISUAL DOSAGE ICONS */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-200">
                <span className="text-[9px] font-black uppercase text-slate-500">Dosage Schedule:</span>
                {labelData.dosageIcons.map((icon, idx) => (
                  <span key={idx} className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md border border-amber-300">
                    {icon}
                  </span>
                ))}
              </div>

              <p className="text-[9px] font-bold text-slate-500 italic">{labelData.storageInstructions}</p>
            </div>

            {/* PRINT BUTTON */}
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handlePrintLabel}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase rounded-xl h-10 px-5 flex items-center gap-2 shadow-lg"
              >
                <Printer size={16} /> 🖨️ Print Multilingual Drug Label ({selectedLanguage})
              </Button>
            </div>
          </div>

          {/* SECTION 2: REFILL NOTIFICATIONS & SMS / WHATSAPP SYNC */}
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
              <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                <Smartphone size={16} /> Automated Refill Notifications & SMS/WhatsApp Sync:
              </h4>

              <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                smsData.status === 'SENT' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
              }`}>
                {smsData.status === 'SENT' ? `SENT AT ${smsData.sentAt}` : 'READY TO DISPATCH'}
              </span>
            </div>

            {/* SMS PREVIEW & DISPATCHER */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-start gap-3">
                <MessageSquare size={20} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs font-black text-white">Pickup SMS to {patientPhone}</h5>
                  <p className="text-[11px] font-medium text-slate-300 mt-0.5 bg-slate-900 p-2.5 rounded-xl border border-slate-800 font-mono">
                    "{smsData.smsText}"
                  </p>
                </div>
              </div>

              <Button
                type="button"
                size="sm"
                disabled={smsData.status === 'SENT'}
                onClick={handleSendSms}
                className="bg-amber-600 hover:bg-amber-500 text-white font-black text-xs uppercase rounded-xl h-9 px-4 shrink-0 shadow-lg flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send size={14} /> {smsData.status === 'SENT' ? '✅ SMS Sent' : '📱 Send Pickup SMS / WhatsApp'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
